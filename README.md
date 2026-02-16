# Ghost Protocol - Anonymous Real-Time Chat

[![Made with Emergent](https://img.shields.io/badge/Made%20with-Emergent-black)](https://emergent.sh)

A production-ready, fully self-hosted anonymous real-time chat application with WebRTC voice calling support.

## Features

- **Anonymous**: No registration, email, or authentication required
- **Ephemeral**: Temporary UUID-based sessions that exist only in memory
- **Real-time**: WebSocket-based instant messaging
- **Voice Calling**: WebRTC peer-to-peer audio support
- **Random Matching**: FIFO queue-based partner matching
- **Direct Connect**: Connect to specific users by UUID
- **Self-Hosted**: No third-party dependencies (Firebase, Pusher, etc.)
- **Scalable**: Redis-backed queue system ready for horizontal scaling
- **Secure**: Rate limiting, message throttling, and XSS protection

## Tech Stack

### Backend
- Node.js (LTS)
- Express
- Native WebSocket (ws library)
- Redis (for queue & scaling)
- UUID v4
- Rate limiting

### Frontend
- React 19
- Tailwind CSS
- WebRTC API
- WebSocket API
- Lucide Icons
- Sonner (Toast notifications)

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  React + WebSocket + WebRTC                     │
└──────────────────┬──────────────────────────────┘
                   │
                   │ WebSocket
                   │
┌──────────────────▼──────────────────────────────┐
│              Node.js Backend                     │
│  Express + WebSocket Server                     │
└──────────────────┬──────────────────────────────┘
                   │
                   │
         ┌─────────┴──────────┐
         │                    │
    ┌────▼────┐         ┌─────▼─────┐
    │ Memory  │         │   Redis   │
    │  Store  │         │   Queue   │
    └─────────┘         └───────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+ (LTS)
- Redis 6+
- Yarn or npm

### Installation

1. **Clone and navigate to backend**
```bash
cd backend-node
yarn install
```

2. **Install Redis** (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

For other OS:
- **macOS**: `brew install redis && brew services start redis`
- **Windows**: Use WSL2 or download from [redis.io](https://redis.io/download)

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env if needed (defaults work for local development)
```

4. **Install frontend dependencies**
```bash
cd ../frontend
yarn install
```

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend-node
yarn start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
yarn start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Production Deployment

### Option 1: PM2 (Recommended)

1. **Install PM2**
```bash
npm install -g pm2
```

2. **Start backend with PM2**
```bash
cd backend-node
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

3. **Build frontend**
```bash
cd frontend
yarn build
```

4. **Serve with Nginx** (see nginx.conf.example)

### Option 2: Docker

**Backend Dockerfile** (`backend-node/Dockerfile`):
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN yarn install --production
COPY . .
EXPOSE 8001
CMD ["node", "server.js"]
```

**Docker Compose** (`docker-compose.yml`):
```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  backend:
    build: ./backend-node
    ports:
      - "8001:8001"
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - NODE_ENV=production
    depends_on:
      - redis

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  redis-data:
```

### Nginx Configuration

See `nginx.conf.example` for complete configuration.

Key points:
- Proxy `/ws` to WebSocket server
- Proxy `/api` to Node.js backend
- Serve React static files
- WebSocket upgrade headers

## Horizontal Scaling

The app is designed to scale horizontally:

1. **Redis** acts as a shared queue across multiple backend instances
2. **Stateless backend** - all session data in memory or Redis
3. **PM2 cluster mode** - multiple Node.js processes
4. **Load balancer** - Nginx with upstream servers

**Example PM2 cluster:**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'ghost-protocol',
    script: './server.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster'
  }]
};
```

## API Documentation

### HTTP Endpoints

- `GET /api/health` - Health check
- `GET /api/online` - List online users
- `GET /api` - API info

### WebSocket Events

**Client → Server:**
```javascript
{ type: 'find_random' }                    // Find random partner
{ type: 'connect_user', targetUserId }     // Connect to specific user
{ type: 'chat_message', text }             // Send message
{ type: 'webrtc_signal', signal }          // WebRTC signaling
{ type: 'disconnect_chat' }                // End current chat
{ type: 'cancel_search' }                  // Cancel search
```

**Server → Client:**
```javascript
{ type: 'connected', userId }              // Connection established
{ type: 'online_users', users, count }     // Online users list
{ type: 'searching', message }             // Searching for partner
{ type: 'match_found', roomId, partnerId } // Match found
{ type: 'chat_message', senderId, text }   // Received message
{ type: 'webrtc_signal', senderId, signal }// WebRTC signal
{ type: 'partner_disconnected' }           // Partner left
{ type: 'error', message }                 // Error occurred
```

## Security Features

- **Rate Limiting**: IP-based request throttling
- **Message Throttling**: Prevents spam (500ms default)
- **XSS Protection**: Message sanitization
- **Max Message Length**: 1000 characters
- **No Data Persistence**: All data ephemeral
- **CORS**: Configurable origins

## Configuration

### Environment Variables

```env
PORT=8001                          # Backend port
REDIS_HOST=localhost               # Redis host
REDIS_PORT=6379                    # Redis port
REDIS_PASSWORD=                    # Redis password (optional)
NODE_ENV=production                # Environment
MAX_MESSAGE_LENGTH=1000            # Max characters per message
RATE_LIMIT_WINDOW_MS=60000         # Rate limit window (1 min)
RATE_LIMIT_MAX_REQUESTS=100        # Max requests per window
MESSAGE_THROTTLE_MS=500            # Message throttle delay
```

## Testing

**Backend:**
```bash
cd backend-node

# Test WebSocket connection
wscat -c ws://localhost:8001/ws

# Test HTTP endpoints
curl http://localhost:8001/api/health
curl http://localhost:8001/api/online
```

**Frontend:**
```bash
cd frontend
yarn test
```

## Troubleshooting

### Redis Connection Failed
- Check Redis is running: `redis-cli ping`
- Check Redis port: `netstat -tuln | grep 6379`
- App falls back to in-memory mode if Redis unavailable

### WebSocket Connection Failed
- Check backend is running on correct port
- Verify WebSocket URL in browser console
- Check firewall rules for port 8001

### WebRTC Not Working
- Ensure microphone permissions granted
- Check browser console for errors
- STUN servers may be blocked by firewall
- For production, configure TURN server

### No Online Users Showing
- Open app in multiple browser tabs/windows
- Check browser console for WebSocket errors
- Verify backend is broadcasting user updates

## Performance Tips

1. **Enable Redis** for production (in-memory fallback is single-instance only)
2. **Use PM2 cluster mode** to utilize all CPU cores
3. **Configure Nginx caching** for static assets
4. **Enable gzip compression** in Nginx
5. **Use CDN** for frontend assets
6. **Monitor memory usage** - set `max_memory_restart` in PM2

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Note**: WebRTC requires HTTPS in production (except localhost)

## License

MIT License - See LICENSE file

## Contributing

Pull requests welcome! Please ensure:
- Code follows existing style
- Tests pass
- No new third-party dependencies without discussion

## Roadmap

- [ ] TURN server integration for better WebRTC connectivity
- [ ] End-to-end encryption for messages
- [ ] Video calling support
- [ ] Room-based group chat
- [ ] Typing indicators
- [ ] File sharing (ephemeral)
- [ ] Admin dashboard

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/ghost-protocol/issues)
- Documentation: [Wiki](https://github.com/yourusername/ghost-protocol/wiki)

---

**Built with [Emergent](https://emergent.sh)** - The fastest way to build full-stack apps