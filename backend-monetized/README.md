# Connecto - Monetized Video Chat Platform

## 🎯 What's Built

Complete **monetized video/audio chat platform** with:
- ✅ Supabase Authentication (email/password)
- ✅ User Wallet System with Credits/Coins
- ✅ Admin Panel to Add Coins Manually
- ✅ Real-time WebSocket Communication
- ✅ WebRTC Video/Audio Calling
- ✅ Per-Minute Call Billing (auto-deduct credits)
- ✅ Call History & Transaction Tracking
- ✅ Random Matching + Direct Connect

---

## 📁 Backend Structure

```
/app/backend-monetized/
├── server.js              # Main Express server
├── supabaseClient.js      # Supabase connection
├── websocket.js           # WebSocket + WebRTC handler
├── middleware.js          # Auth middleware
├── rateLimiter.js         # Rate limiting
├── database-schema.sql    # Database setup (RUN THIS FIRST!)
├── routes/
│   ├── auth.js           # Signup, Login, Logout
│   ├── wallet.js         # Balance, Transactions
│   ├── admin.js          # Add coins, View users, Stats
│   └── calls.js          # Call history, Start/End calls
├── package.json
└── .env                  # Supabase credentials
```

---

## 🚀 Setup Instructions

### Step 1: Run Database Schema in Supabase

1. Go to: https://supabase.com/dashboard
2. Select your project: **vjualydsnfhwbvpmkkvr**
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy entire content from `/app/backend-monetized/database-schema.sql`
6. Paste and click **RUN**

This creates:
- `profiles` table (user info)
- `wallets` table (credits/balance)
- `transactions` table (payment history)
- `calls` table (call records)
- `admin_actions` table (admin activity log)
- Automatic triggers & RLS policies

### Step 2: Start Backend

```bash
cd /app/backend-monetized
yarn install
yarn start
```

Backend runs on **port 8002**

### Step 3: Test APIs

**Health Check:**
```bash
curl http://localhost:8002/api/health
```

**Signup:**
```bash
curl -X POST http://localhost:8002/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Save the `access_token` from login response.

**Check Balance:**
```bash
curl http://localhost:8002/api/wallet/balance \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 👨‍💼 Admin Panel APIs

Admin uses secret key: `admin_secret_change_in_production`

### Get All Users
```bash
curl http://localhost:8002/api/admin/users \
  -H "x-admin-key: admin_secret_change_in_production"
```

### Add Coins to User
```bash
curl -X POST http://localhost:8002/api/admin/add-coins \
  -H "Content-Type: application/json" \
  -H "x-admin-key: admin_secret_change_in_production" \
  -d '{
    "user_id": "USER_ID_FROM_ABOVE",
    "amount": 100,
    "admin_email": "admin@connecto.com"
  }'
```

### Get Platform Stats
```bash
curl http://localhost:8002/api/admin/stats \
  -H "x-admin-key: admin_secret_change_in_production"
```

### View Admin Actions Log
```bash
curl http://localhost:8002/api/admin/actions \
  -H "x-admin-key: admin_secret_change_in_production"
```

---

## 💰 Call Billing System

**Configuration** (in `.env`):
- `CALL_RATE_PER_MINUTE=10` (10 coins per minute)
- `MIN_BALANCE_REQUIRED=5` (minimum 5 coins to start call)

**How it works:**
1. User starts call → checks balance >= 5 coins
2. Call proceeds if sufficient balance
3. User ends call → calculates duration
4. Deducts `duration_minutes × 10 coins` from caller's wallet
5. Transaction logged automatically

**Example:**
- 3 minute call = 30 coins deducted
- 1.5 minute call = 20 coins (rounded up to 2 minutes)

---

## 🔌 WebSocket Events

**Client → Server:**
```javascript
// Authenticate
{ type: 'auth', token: 'ACCESS_TOKEN' }

// Find random partner
{ type: 'find_random', userId: 'USER_ID' }

// Connect to specific user
{ type: 'connect_user', userId: 'USER_ID', targetUserId: 'TARGET_ID' }

// WebRTC signaling
{ type: 'webrtc_signal', userId: 'USER_ID', partnerId: 'PARTNER_ID', signal: {...} }

// Start call
{ type: 'start_call', userId: 'USER_ID', partnerId: 'PARTNER_ID', callType: 'video' }

// End call
{ type: 'end_call', userId: 'USER_ID', callId: 'CALL_ID' }

// Chat message
{ type: 'chat_message', userId: 'USER_ID', text: 'Hello!' }

// Disconnect chat
{ type: 'disconnect_chat', userId: 'USER_ID' }
```

**Server → Client:**
```javascript
// Authentication success
{ type: 'authenticated', userId, email }

// Match found
{ type: 'match_found', partnerId, partnerEmail }

// Insufficient balance
{ type: 'insufficient_balance', required: 5, current: 2 }

// Call started
{ type: 'call_started', callId }

// Call ended with billing
{ type: 'call_ended', callId, duration_seconds, cost }

// Online users update
{ type: 'online_users', users: [...], count: 5 }
```

---

## 📊 Database Tables

### `profiles`
- User profile info (auto-created on signup)

### `wallets`
- `balance` - Current coins
- `total_earned` - All coins received
- `total_spent` - All coins spent

### `transactions`
- Complete payment history
- Types: `credit`, `admin_credit`, `call_charge`

### `calls`
- Call logs with duration and cost
- Status: `active`, `ended`, `cancelled`

### `admin_actions`
- Audit log of admin activities

---

## 🎨 Admin Web Panel (Next Phase)

Admin dashboard features:
- View all users with balance
- Add coins to any user
- View platform statistics
- Call analytics
- Transaction reports
- Ban/unban users

---

## 📱 Android App (Next Phase)

Native Kotlin app will include:
- Email/password login
- Home screen with balance display
- Find random / Connect direct
- Video calling interface with timer
- In-call coin deduction indicator
- Recharge coins (mock Razorpay UI)
- Profile & wallet history

---

## 🔐 Security

- ✅ Supabase Row Level Security (RLS) enabled
- ✅ JWT token authentication
- ✅ Admin secret key protection
- ✅ Rate limiting on APIs
- ✅ Message sanitization (XSS protection)
- ✅ Secure WebSocket authentication

---

## 📈 Next Steps

1. ✅ **Backend Complete** - All APIs working
2. ⏳ **Admin Web Panel** - React dashboard (building next)
3. ⏳ **Android App** - Kotlin video chat app
4. ⏳ **Real Razorpay** - When ready to go live

---

## 🐛 Troubleshooting

**Issue: "Failed to fetch users"**
- Solution: Run database schema in Supabase SQL Editor

**Issue: "Authentication failed"**
- Solution: Check Supabase credentials in `.env`

**Issue: "Insufficient balance"**
- Solution: Use admin API to add coins to user

**Issue: WebSocket not connecting**
- Solution: Ensure backend running and use correct URL

---

## 🎯 Testing Workflow

1. **Create 2 users** (signup API)
2. **Login both** (get access tokens)
3. **Add coins** to User 1 (admin API)
4. **Connect WebSocket** for both users
5. **Find random** - they should match
6. **Start call** - check balance deduction
7. **End call** - verify billing

---

**Built with ❤️ for Connecto**
