const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const { addToQueue, removeFromQueue, getNextMatch } = require('./matching');
const { checkMessageThrottle, cleanupThrottle } = require('./rateLimiter');

const users = new Map();
const rooms = new Map();

const initWebSocket = (server) => {
  const wss = new WebSocketServer({ server, path: '/api/ws' });

  console.log('WebSocket server initialized on /api/ws');

  wss.on('connection', (ws, req) => {
    const userId = uuidv4();
    const ip = req.socket.remoteAddress;
    
    console.log(`New connection: ${userId} from ${ip}`);

    users.set(userId, {
      ws,
      userId,
      status: 'available',
      roomId: null,
      partnerId: null,
      ip
    });

    ws.send(JSON.stringify({
      type: 'connected',
      userId,
      timestamp: Date.now()
    }));

    broadcastOnlineUsers();

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleMessage(userId, message);
      } catch (error) {
        console.error('Message handling error:', error);
        sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      handleDisconnect(userId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${userId}:`, error);
      handleDisconnect(userId);
    });
  });

  return wss;
};

const handleMessage = async (userId, message) => {
  const user = users.get(userId);
  if (!user) return;

  const maxLength = parseInt(process.env.MAX_MESSAGE_LENGTH) || 1000;

  switch (message.type) {
    case 'find_random':
      await handleFindRandom(userId);
      break;

    case 'connect_user':
      await handleConnectUser(userId, message.targetUserId);
      break;

    case 'chat_message':
      if (message.text && message.text.length <= maxLength) {
        if (checkMessageThrottle(userId)) {
          handleChatMessage(userId, message.text);
        } else {
          sendError(user.ws, 'Message sent too quickly. Please slow down.');
        }
      } else {
        sendError(user.ws, `Message too long. Max ${maxLength} characters.`);
      }
      break;

    case 'webrtc_signal':
      handleWebRTCSignal(userId, message.signal);
      break;

    case 'disconnect_chat':
      handleDisconnectChat(userId);
      break;

    case 'cancel_search':
      await removeFromQueue(userId);
      user.status = 'available';
      user.ws.send(JSON.stringify({
        type: 'search_cancelled',
        timestamp: Date.now()
      }));
      broadcastOnlineUsers();
      break;

    default:
      sendError(user.ws, 'Unknown message type');
  }
};

const handleFindRandom = async (userId) => {
  const user = users.get(userId);
  if (!user || user.status !== 'available') return;

  user.status = 'searching';
  broadcastOnlineUsers();

  const partnerId = await getNextMatch(userId);

  if (partnerId) {
    const partner = users.get(partnerId);
    if (partner && partner.status === 'searching') {
      createRoom(userId, partnerId);
    } else {
      await addToQueue(userId);
      user.ws.send(JSON.stringify({
        type: 'searching',
        message: 'Looking for a partner...',
        timestamp: Date.now()
      }));
    }
  } else {
    await addToQueue(userId);
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

  createRoom(userId, targetUserId);
};

const createRoom = (userId1, userId2) => {
  const roomId = uuidv4();
  const user1 = users.get(userId1);
  const user2 = users.get(userId2);

  if (!user1 || !user2) return;

  rooms.set(roomId, {
    roomId,
    users: [userId1, userId2],
    createdAt: Date.now()
  });

  user1.status = 'busy';
  user1.roomId = roomId;
  user1.partnerId = userId2;

  user2.status = 'busy';
  user2.roomId = roomId;
  user2.partnerId = userId1;

  removeFromQueue(userId1);
  removeFromQueue(userId2);

  user1.ws.send(JSON.stringify({
    type: 'match_found',
    roomId,
    partnerId: userId2,
    timestamp: Date.now()
  }));

  user2.ws.send(JSON.stringify({
    type: 'match_found',
    roomId,
    partnerId: userId1,
    timestamp: Date.now()
  }));

  console.log(`Room created: ${roomId} with users ${userId1} and ${userId2}`);
  broadcastOnlineUsers();
};

const handleChatMessage = (userId, text) => {
  const user = users.get(userId);
  if (!user || !user.partnerId) return;

  const partner = users.get(user.partnerId);
  if (!partner) return;

  const messageData = {
    type: 'chat_message',
    senderId: userId,
    text: sanitizeMessage(text),
    timestamp: Date.now()
  };

  partner.ws.send(JSON.stringify(messageData));
};

const handleWebRTCSignal = (userId, signal) => {
  const user = users.get(userId);
  if (!user || !user.partnerId) return;

  const partner = users.get(user.partnerId);
  if (!partner) return;

  partner.ws.send(JSON.stringify({
    type: 'webrtc_signal',
    senderId: userId,
    signal,
    timestamp: Date.now()
  }));
};

const handleDisconnectChat = (userId) => {
  const user = users.get(userId);
  if (!user) return;

  const partnerId = user.partnerId;
  const roomId = user.roomId;

  if (roomId) {
    rooms.delete(roomId);
  }

  if (partnerId) {
    const partner = users.get(partnerId);
    if (partner) {
      partner.status = 'available';
      partner.roomId = null;
      partner.partnerId = null;

      partner.ws.send(JSON.stringify({
        type: 'partner_disconnected',
        message: 'Your partner has disconnected',
        timestamp: Date.now()
      }));
    }
  }

  user.status = 'available';
  user.roomId = null;
  user.partnerId = null;

  user.ws.send(JSON.stringify({
    type: 'disconnected_chat',
    message: 'You have disconnected from the chat',
    timestamp: Date.now()
  }));

  broadcastOnlineUsers();
};

const handleDisconnect = async (userId) => {
  const user = users.get(userId);
  if (!user) return;

  console.log(`User disconnected: ${userId}`);

  if (user.partnerId) {
    handleDisconnectChat(userId);
  }

  await removeFromQueue(userId);
  cleanupThrottle(userId);
  users.delete(userId);

  broadcastOnlineUsers();
};

const broadcastOnlineUsers = () => {
  const onlineUsers = Array.from(users.values()).map(user => ({
    userId: user.userId,
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
      console.error('Error broadcasting to user:', error);
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

const getOnlineUsers = () => {
  return Array.from(users.values()).map(user => ({
    userId: user.userId,
    status: user.status
  }));
};

module.exports = {
  initWebSocket,
  getOnlineUsers
};