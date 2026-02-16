import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';
import { authenticateUser } from '../middleware.js';

const router = express.Router();

// Get user's wallet balance
router.get('/balance', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      // Wallet doesn't exist, create it
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from('wallets')
        .insert({
          user_id: req.user.id,
          coins: 0,
          audio_minutes: 0,
          video_minutes: 0,
          promo_minutes: 0,
          cash_balance: 0
        })
        .select()
        .single();

      if (createError) {
        return res.status(500).json({ error: 'Failed to create wallet' });
      }

      return res.json({
        coins: 0,
        audio_minutes: 0,
        video_minutes: 0,
        promo_minutes: 0,
        cash_balance: 0
      });
    }

    res.json({
      coins: data.coins || 0,
      audio_minutes: data.audio_minutes || 0,
      video_minutes: data.video_minutes || 0,
      promo_minutes: data.promo_minutes || 0,
      cash_balance: data.cash_balance || 0
    });
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Deduct minutes for call
router.post('/deduct-minutes', authenticateUser, async (req, res) => {
  const { minutes, call_type } = req.body;

  if (!minutes || !call_type) {
    return res.status(400).json({ error: 'minutes and call_type required' });
  }

  try {
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const field = call_type === 'video' ? 'video_minutes' : 'audio_minutes';
    const currentMinutes = wallet[field] || 0;

    if (currentMinutes < minutes) {
      return res.status(402).json({ 
        error: 'Insufficient minutes',
        required: minutes,
        available: currentMinutes
      });
    }

    const { error } = await supabaseAdmin
      .from('wallets')
      .update({ 
        [field]: currentMinutes - minutes,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to deduct minutes' });
    }

    res.json({
      message: 'Minutes deducted',
      remaining: currentMinutes - minutes
    });
  } catch (error) {
    console.error('Deduct minutes error:', error);
    res.status(500).json({ error: 'Failed to deduct minutes' });
  }
});

export default router;