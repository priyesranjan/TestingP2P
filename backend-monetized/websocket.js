import { WebSocketServer } from 'ws';
import { supabaseAdmin } from './supabaseClient.js';
import { checkMessageThrottle, cleanupThrottle } from './rateLimiter.js';

const users = new Map();
const activeCalls = new Map();

export const initWebSocket = (server) => {
  const wss = new WebSocketServer({ server, path: '/api/ws' });

  console.log('WebSocket server initialized on /api/ws');

  wss.on('connection', (ws, req) => {
    let userId = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleMessage(ws, message);
      } catch (error) {
        console.error('Message handling error:', error);
        sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      if (userId) {
        handleDisconnect(userId);
      }
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error:`, error);
      if (userId) {
        handleDisconnect(userId);
      }
    });
  });

  const handleMessage = async (ws, message) => {
    switch (message.type) {
      case 'auth':
        await handleAuth(ws, message);
        break;
      
      case 'find_random':
        await handleFindRandom(message.userId);
        break;
      
      case 'connect_user':
        await handleConnectUser(message.userId, message.targetUserId);
        break;
      
      case 'webrtc_signal':
        handleWebRTCSignal(message.userId, message.partnerId, message.signal);
        break;
      
      case 'start_call':
        await handleStartCall(message.userId, message.partnerId, message.callType);
        break;
      
      case 'end_call':
        await handleEndCall(message.userId, message.callId);
        break;
      
      case 'chat_message':
        handleChatMessage(message.userId, message.text);
        break;
      
      case 'disconnect_chat':
        handleDisconnectChat(message.userId);
        break;
      
      default:
        sendError(ws, 'Unknown message type');
    }
  };

  const handleAuth = async (ws, message) => {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(message.token);

      if (error || !user) {
        sendError(ws, 'Authentication failed');
        ws.close();
        return;
      }

      const userId = user.id;
      users.set(userId, {
        ws,
        userId,
        email: user.email,
        status: 'available',
        partnerId: null
      });

      ws.send(JSON.stringify({
        type: 'authenticated',
        userId,
        email: user.email,
        timestamp: Date.now()
      }));

      broadcastOnlineUsers();
    } catch (error) {
      console.error('Auth error:', error);
      sendError(ws, 'Authentication failed');
      ws.close();
    }
  };

  const handleFindRandom = async (userId) => {
    const user = users.get(userId);
    if (!user || user.status !== 'available') return;

    user.status = 'searching';
    broadcastOnlineUsers();

    const availableUsers = Array.from(users.values()).filter(u => 
      u.userId !== userId && u.status === 'available'
    );

    if (availableUsers.length > 0) {
      const partner = availableUsers[Math.floor(Math.random() * availableUsers.length)];
      createMatch(userId, partner.userId);
    } else {
      user.ws.send(JSON.stringify({
        type: 'searching',
        message: 'Looking for a partner...',
        timestamp: Date.now()
      }));
    }
  };

  const handleConnectUser = async (userId, targetUserId) => {
    const user = users.get(userId);
    const target = users.get(targetUserId);

    if (!user || !target) {
      sendError(user.ws, 'User not found');
      return;
    }

    if (target.status !== 'available') {
      sendError(user.ws, 'User is not available');
      return;
    }

    if (user.status !== 'available') {
      sendError(user.ws, 'You are already in a conversation');
      return;
    }

    createMatch(userId, targetUserId);
  };

  const createMatch = (userId1, userId2) => {
    const user1 = users.get(userId1);
    const user2 = users.get(userId2);

    if (!user1 || !user2) return;

    user1.status = 'matched';
    user1.partnerId = userId2;
    user2.status = 'matched';
    user2.partnerId = userId1;

    user1.ws.send(JSON.stringify({
      type: 'match_found',
      partnerId: userId2,
      partnerEmail: user2.email,
      timestamp: Date.now()
    }));

    user2.ws.send(JSON.stringify({
      type: 'match_found',
      partnerId: userId1,
      partnerEmail: user1.email,
      timestamp: Date.now()
    }));

    broadcastOnlineUsers();
  };

  const handleWebRTCSignal = (userId, partnerId, signal) => {
    const partner = users.get(partnerId);
    if (!partner) return;

    partner.ws.send(JSON.stringify({
      type: 'webrtc_signal',
      senderId: userId,
      signal,
      timestamp: Date.now()
    }));
  };

  const handleStartCall = async (userId, partnerId, callType) => {
    try {
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();

      const minBalance = parseInt(process.env.MIN_BALANCE_REQUIRED) || 5;

      if (!wallet || wallet.balance < minBalance) {
        const user = users.get(userId);
        user.ws.send(JSON.stringify({
          type: 'insufficient_balance',
          required: minBalance,
          current: wallet?.balance || 0,
          timestamp: Date.now()
        }));
        return;
      }

      const { data: call, error } = await supabaseAdmin
        .from('calls')
        .insert({
          caller_id: userId,
          receiver_id: partnerId,
          call_type: callType || 'video',
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        console.error('Start call error:', error);
        return;
      }

      activeCalls.set(call.id, {
        callId: call.id,
        callerId: userId,
        receiverId: partnerId,
        startTime: Date.now()
      });

      const user = users.get(userId);
      const partner = users.get(partnerId);

      if (user) {
        user.ws.send(JSON.stringify({
          type: 'call_started',
          callId: call.id,
          timestamp: Date.now()
        }));
      }

      if (partner) {
        partner.ws.send(JSON.stringify({
          type: 'call_started',
          callId: call.id,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Start call error:', error);
    }
  };

  const handleEndCall = async (userId, callId) => {
    try {
      const callData = activeCalls.get(callId);
      if (!callData) return;

      const { data: call } = await supabaseAdmin
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (!call) return;

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
        .eq('id', callId);

      await supabaseAdmin
        .rpc('update_wallet_balance', {
          p_user_id: call.caller_id,
          p_amount: totalCost,
          p_type: 'call_charge',
          p_description: `Call charge: ${durationMinutes} min @ ${costPerMinute} coins/min`,
          p_metadata: { call_id: callId, duration_seconds: durationSeconds }
        });

      activeCalls.delete(callId);

      const caller = users.get(call.caller_id);
      const receiver = users.get(call.receiver_id);

      if (caller) {
        caller.ws.send(JSON.stringify({
          type: 'call_ended',
          callId,
          duration_seconds: durationSeconds,
          cost: totalCost,
          timestamp: Date.now()
        }));
      }

      if (receiver) {
        receiver.ws.send(JSON.stringify({
          type: 'call_ended',
          callId,
          duration_seconds: durationSeconds,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('End call error:', error);
    }
  };

  const handleChatMessage = (userId, text) => {
    const user = users.get(userId);
    if (!user || !user.partnerId) return;

    if (!checkMessageThrottle(userId)) {
      return;
    }

    const partner = users.get(user.partnerId);
    if (!partner) return;

    const sanitized = sanitizeMessage(text);

    partner.ws.send(JSON.stringify({
      type: 'chat_message',
      senderId: userId,
      text: sanitized,
      timestamp: Date.now()
    }));
  };

  const handleDisconnectChat = (userId) => {
    const user = users.get(userId);
    if (!user) return;

    const partnerId = user.partnerId;

    if (partnerId) {
      const partner = users.get(partnerId);
      if (partner) {
        partner.status = 'available';
        partner.partnerId = null;

        partner.ws.send(JSON.stringify({
          type: 'partner_disconnected',
          message: 'Your partner has disconnected',
          timestamp: Date.now()
        }));
      }
    }

    user.status = 'available';
    user.partnerId = null;

    broadcastOnlineUsers();
  };

  const handleDisconnect = (userId) => {
    const user = users.get(userId);
    if (!user) return;

    console.log(`User disconnected: ${userId}`);

    if (user.partnerId) {
      handleDisconnectChat(userId);
    }

    cleanupThrottle(userId);
    users.delete(userId);

    broadcastOnlineUsers();
  };

  const broadcastOnlineUsers = () => {
    const onlineUsers = Array.from(users.values()).map(user => ({
      userId: user.userId,
      email: user.email,
      status: user.status
    }));

    const message = JSON.stringify({
      type: 'online_users',
      users: onlineUsers,
      count: onlineUsers.length,
      timestamp: Date.now()
    });

    users.forEach(user => {
      try {
        user.ws.send(message);
      } catch (error) {
        console.error('Error broadcasting:', error);
      }
    });
  };

  const sendError = (ws, message) => {
    try {
      ws.send(JSON.stringify({
        type: 'error',
        message,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error sending error message:', error);
    }
  };

  const sanitizeMessage = (text) => {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  };

  return wss;
};
