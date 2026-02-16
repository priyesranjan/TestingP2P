import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [partnerId, setPartnerId] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const getWebSocketUrl = () => {
    // For Mobile App (Capacitor) or Production
    return 'wss://call.appdost.com/api/ws';

    // Fallback for local dev (Commented out for Production Build)
    // const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // const host = window.location.host;
    // return `${protocol}//${host}/api/ws`;
  };

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = getWebSocketUrl();
      console.log('Connecting to WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setStatus('disconnected');

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`Reconnecting in ${delay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          setError('Connection lost. Please refresh the page.');
        }
      };

      wsRef.current.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection error occurred');
      };
    } catch (err) {
      console.error('Failed to connect:', err);
      setError('Failed to establish connection');
    }
  }, []);

  const handleMessage = (data) => {
    console.log('Received message:', data.type);

    switch (data.type) {
      case 'connected':
        setUserId(data.userId);
        setStatus('available');
        break;

      case 'online_users':
        setOnlineUsers(data.users || []);
        break;

      case 'searching':
        setStatus('searching');
        break;

      case 'search_cancelled':
        setStatus('available');
        break;

      case 'match_found':
        setPartnerId(data.partnerId);
        setRoomId(data.roomId);
        setStatus('connected');
        setMessages([]);
        break;

      case 'chat_message':
        setMessages(prev => [...prev, {
          id: Date.now() + Math.random(),
          senderId: data.senderId,
          text: data.text,
          timestamp: data.timestamp,
          isMine: false
        }]);
        break;

      case 'partner_disconnected':
        setStatus('available');
        setPartnerId(null);
        setRoomId(null);
        setMessages([]);
        break;

      case 'disconnected_chat':
        setStatus('available');
        setPartnerId(null);
        setRoomId(null);
        break;

      case 'error':
        setError(data.message);
        setTimeout(() => setError(null), 5000);
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const findRandom = useCallback(() => {
    if (status === 'available') {
      sendMessage({ type: 'find_random' });
    }
  }, [status, sendMessage]);

  const connectToUser = useCallback((targetUserId) => {
    if (status === 'available') {
      sendMessage({ type: 'connect_user', targetUserId });
    }
  }, [status, sendMessage]);

  const sendChatMessage = useCallback((text) => {
    if (status === 'connected' && text.trim()) {
      const success = sendMessage({ type: 'chat_message', text });
      if (success) {
        setMessages(prev => [...prev, {
          id: Date.now() + Math.random(),
          senderId: userId,
          text,
          timestamp: Date.now(),
          isMine: true
        }]);
      }
    }
  }, [status, userId, sendMessage]);

  const sendWebRTCSignal = useCallback((signal) => {
    if (status === 'connected') {
      sendMessage({ type: 'webrtc_signal', signal });
    }
  }, [status, sendMessage]);

  const disconnectChat = useCallback(() => {
    if (status === 'connected') {
      sendMessage({ type: 'disconnect_chat' });
      setMessages([]);
    }
  }, [status, sendMessage]);

  const cancelSearch = useCallback(() => {
    if (status === 'searching') {
      sendMessage({ type: 'cancel_search' });
    }
  }, [status, sendMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    userId,
    onlineUsers,
    messages,
    partnerId,
    roomId,
    status,
    error,
    findRandom,
    connectToUser,
    sendChatMessage,
    sendWebRTCSignal,
    disconnectChat,
    cancelSearch,
    wsRef
  };
};

export default useWebSocket;