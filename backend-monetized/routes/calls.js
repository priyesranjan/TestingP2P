import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';
import { authenticateUser } from '../middleware.js';

const router = express.Router();

router.get('/history', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('calls')
      .select('*')
      .or(`caller_id.eq.${req.user.id},receiver_id.eq.${req.user.id}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch call history' });
    }

    res.json({ calls: data || [] });
  } catch (error) {
    console.error('Call history error:', error);
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
});

router.post('/start', authenticateUser, async (req, res) => {
  const { receiver_id, call_type } = req.body;

  if (!receiver_id || !call_type) {
    return res.status(400).json({ error: 'receiver_id and call_type required' });
  }

  try {
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('balance')
      .eq('user_id', req.user.id)
      .single();

    const minBalance = parseInt(process.env.MIN_BALANCE_REQUIRED) || 5;

    if (!wallet || wallet.balance < minBalance) {
      return res.status(402).json({ 
        error: 'Insufficient balance',
        required: minBalance,
        current: wallet?.balance || 0
      });
    }

    const { data: call, error } = await supabaseAdmin
      .from('calls')
      .insert({
        caller_id: req.user.id,
        receiver_id,
        call_type,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to start call' });
    }

    res.json({
      message: 'Call started',
      call_id: call.id,
      call
    });
  } catch (error) {
    console.error('Start call error:', error);
    res.status(500).json({ error: 'Failed to start call' });
  }
});

router.post('/end', authenticateUser, async (req, res) => {
  const { call_id } = req.body;

  if (!call_id) {
    return res.status(400).json({ error: 'call_id required' });
  }

  try {
    const { data: call } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('id', call_id)
      .single();

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    if (call.caller_id !== req.user.id && call.receiver_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const endTime = new Date();
    const startTime = new Date(call.start_time);
    const durationSeconds = Math.floor((endTime - startTime) / 1000);
    const durationMinutes = Math.ceil(durationSeconds / 60);
    const costPerMinute = parseInt(process.env.CALL_RATE_PER_MINUTE) || 10;
    const totalCost = durationMinutes * costPerMinute;

    await supabaseAdmin
      .from('calls')
      .update({
        end_time: endTime.toISOString(),
        duration_seconds: durationSeconds,
        cost: totalCost,
        status: 'ended'
      })
      .eq('id', call_id);

    await supabaseAdmin
      .rpc('update_wallet_balance', {
        p_user_id: call.caller_id,
        p_amount: totalCost,
        p_type: 'call_charge',
        p_description: `Call charge: ${durationMinutes} min @ ${costPerMinute} coins/min`,
        p_metadata: { call_id, duration_seconds: durationSeconds }
      });

    res.json({
      message: 'Call ended',
      duration_seconds: durationSeconds,
      duration_minutes: durationMinutes,
      cost: totalCost
    });
  } catch (error) {
    console.error('End call error:', error);
    res.status(500).json({ error: 'Failed to end call' });
  }
});

export default router;