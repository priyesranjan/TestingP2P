# Ghost Protocol - Deployment Guide

## Quick Start (Development)

### 1. Start Redis
```bash
redis-server --daemonize yes
```

### 2. Start Backend
```bash
cd /app/backend-node
yarn install
yarn start
```
Backend will run on http://localhost:8001

### 3. Start Frontend
```bash
cd /app/frontend
yarn install
yarn start
```
Frontend will run on http://localhost:3000

## Production Deployment (Current Setup)

The app is currently deployed on Emergent platform with:

- **Backend**: Node.js server on port 8001 (managed by supervisor)
- **Frontend**: React app on port 3000 (managed by supervisor)
- **Redis**: Running on localhost:6379
- **WebSocket**: Available at `/api/ws`
- **Public URL**: https://anon-chat-20.preview.emergentagent.com

### Architecture

```
Frontend (React) → Nginx Ingress → Backend (Node.js) ← Redis
     ↓                                    ↓
  WebSocket (/api/ws)              In-Memory Store
```

## Testing

### Backend API
```bash
# Health check
curl https://anon-chat-20.preview.emergentagent.com/api/health

# Online users
curl https://anon-chat-20.preview.emergentagent.com/api/online
```

### WebSocket Connection
Open the app in multiple browser tabs/windows to test:
- Random matching
- Direct user connection
- Real-time messaging
- WebRTC audio calling

## Features Verified

✅ Anonymous sessions with UUID v4  
✅ Real-time WebSocket communication  
✅ Random user matching via Redis queue  
✅ Direct connect to specific users  
✅ Real-time text chat  
✅ WebRTC peer-to-peer audio signaling  
✅ Online users list  
✅ Rate limiting and message throttling  
✅ Disconnect handling  
✅ Beautiful Ghost Protocol UI theme  

## Monitoring

### Check Service Status
```bash
sudo supervisorctl status
```

### View Logs
```bash
# Backend logs
tail -f /var/log/supervisor/backend.out.log

# Frontend logs
tail -f /var/log/supervisor/frontend.out.log
```

### Redis Status
```bash
redis-cli ping
redis-cli info
```

## Scaling for Production

### Horizontal Scaling with PM2

1. Install PM2
```bash
npm install -g pm2
```

2. Start with cluster mode
```bash
cd /app/backend-node
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

This will use all CPU cores for maximum performance.

### Load Balancing

Use the provided `nginx.conf.example` to set up Nginx load balancing across multiple backend instances.

## Security Notes

- Rate limiting: 100 requests/minute per IP
- Message throttling: 500ms between messages
- XSS protection via message sanitization
- Max message length: 1000 characters
- No data persistence (all in-memory)

## Troubleshooting

### WebSocket Not Connecting
- Verify backend is running: `curl http://localhost:8001/api/health`
- Check WebSocket endpoint is accessible at `/api/ws`
- Ensure no firewall blocking WebSocket connections

### Redis Connection Failed
- Check Redis is running: `redis-cli ping`
- App will fall back to in-memory mode if Redis unavailable
- For multi-instance deployment, Redis is required

### WebRTC Audio Not Working
- Grant microphone permissions in browser
- WebRTC requires HTTPS in production (works on localhost without)
- Check browser console for ICE candidate errors
- Consider configuring TURN server for better connectivity

## Environment Variables

Located in `/app/backend-node/.env`:

```env
PORT=8001
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=production
MAX_MESSAGE_LENGTH=1000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
MESSAGE_THROTTLE_MS=500
```

## Production Checklist

- [ ] Enable HTTPS for WebRTC
- [ ] Configure TURN server for WebRTC
- [ ] Set up monitoring and alerts
- [ ] Configure log rotation
- [ ] Set up Redis persistence
- [ ] Configure backup strategy
- [ ] Test with load testing tool
- [ ] Set up CDN for static assets
- [ ] Configure rate limits per use case
- [ ] Review security headers in Nginx

## Support

For issues or questions, refer to the main README.md or open an issue in the repository.
