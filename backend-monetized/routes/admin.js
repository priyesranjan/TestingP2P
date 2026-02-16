import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';
import { authenticateAdmin } from '../middleware.js';

const router = express.Router();

// Get all users with wallet info
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    // Get users from custom users table
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*');

    if (usersError) {
      return res.status(500).json({ error: 'Failed to fetch users', details: usersError.message });
    }

    // Get wallets
    const { data: wallets, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('*');

    if (walletError) {
      return res.status(500).json({ error: 'Failed to fetch wallets' });
    }

    // Create wallet map
    const walletMap = {};
    wallets.forEach(w => {
      walletMap[w.user_id] = w;
    });

    // Combine data
    const usersWithWallets = users.map(u => ({
      id: u.id,
      phone: u.phone,
      name: u.name,
      role: u.role,
      is_listener: u.is_listener,
      created_at: u.created_at,
      wallet: walletMap[u.id] || {
        coins: 0,
        audio_minutes: 0,
        video_minutes: 0,
        cash_balance: 0
      }
    }));

    res.json({ users: usersWithWallets, count: usersWithWallets.length });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// Add coins to user
router.post('/add-coins', authenticateAdmin, async (req, res) => {
  const { user_id, amount, admin_email } = req.body;

  if (!user_id || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid user_id and amount required' });
  }

  try {
    // Check if wallet exists
    const { data: wallet, error: fetchError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Failed to fetch wallet' });
    }

    if (!wallet) {
      // Create wallet if doesn't exist
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from('wallets')
        .insert({
          user_id,
          coins: amount,
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
        message: 'Wallet created and coins added',
        new_balance: amount
      });
    }

    // Update existing wallet
    const newBalance = (wallet.coins || 0) + amount;
    const { error: updateError } = await supabaseAdmin
      .from('wallets')
      .update({ 
        coins: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update wallet' });
    }

    res.json({
      message: 'Coins added successfully',
      previous_balance: wallet.coins || 0,
      amount_added: amount,
      new_balance: newBalance
    });
  } catch (error) {
    console.error('Add coins error:', error);
    res.status(500).json({ error: 'Failed to add coins', details: error.message });
  }
});

// Add audio/video minutes
router.post('/add-minutes', authenticateAdmin, async (req, res) => {
  const { user_id, audio_minutes, video_minutes, admin_email } = req.body;

  if (!user_id || (!audio_minutes && !video_minutes)) {
    return res.status(400).json({ error: 'user_id and minutes required' });
  }

  try {
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const updates = {
      updated_at: new Date().toISOString()
    };

    if (audio_minutes) {
      updates.audio_minutes = (wallet.audio_minutes || 0) + audio_minutes;
    }
    if (video_minutes) {
      updates.video_minutes = (wallet.video_minutes || 0) + video_minutes;
    }

    const { error } = await supabaseAdmin
      .from('wallets')
      .update(updates)
      .eq('user_id', user_id);

    if (error) {
      return res.status(500).json({ error: 'Failed to add minutes' });
    }

    res.json({
      message: 'Minutes added successfully',
      audio_minutes: updates.audio_minutes,
      video_minutes: updates.video_minutes
    });
  } catch (error) {
    console.error('Add minutes error:', error);
    res.status(500).json({ error: 'Failed to add minutes' });
  }
});

// Get platform stats
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('*');
    
    const totalUsers = users?.length || 0;

    const { data: calls } = await supabaseAdmin
      .from('calls')
      .select('*');

    const totalCalls = calls?.length || 0;

    const { data: wallets } = await supabaseAdmin
      .from('wallets')
      .select('*');

    let totalCoins = 0;
    let totalAudioMinutes = 0;
    let totalVideoMinutes = 0;
    let totalCashBalance = 0;

    wallets?.forEach(w => {
      totalCoins += w.coins || 0;
      totalAudioMinutes += w.audio_minutes || 0;
      totalVideoMinutes += w.video_minutes || 0;
      totalCashBalance += w.cash_balance || 0;
    });

    res.json({
      total_users: totalUsers,
      total_calls: totalCalls,
      total_coins: totalCoins,
      total_audio_minutes: totalAudioMinutes,
      total_video_minutes: totalVideoMinutes,
      total_cash_balance: totalCashBalance
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

// Get recent calls
router.get('/recent-calls', authenticateAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('calls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch calls' });
    }

    res.json({ calls: data || [] });
  } catch (error) {
    console.error('Calls fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

export default router;