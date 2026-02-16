# Connecto Android App - Complete Implementation Guide

## 🎯 Overview

Full-featured video chat Android app with:
- ✅ Phone authentication (Supabase)
- ✅ Wallet system (coins + minutes)
- ✅ Video/Audio calling (WebRTC)
- ✅ Real-time billing
- ✅ Random matching + Direct connect
- ✅ Mock Razorpay recharge

---

## 📁 Project Structure

```
app/src/main/
├── java/com/connecto/
│   ├── MainActivity.kt              # Main entry point
│   ├── LoginActivity.kt             # Phone auth screen
│   ├── HomeActivity.kt              # Main dashboard
│   ├── VideoCallActivity.kt         # Video call screen
│   ├── WalletActivity.kt            # Wallet & recharge
│   ├── ProfileActivity.kt           # User profile
│   ├── api/
│   │   ├── ApiService.kt           # Retrofit API interface
│   │   ├── ApiClient.kt            # API client setup
│   │   └── models/                 # Data models
│   ├── webrtc/
│   │   ├── WebRTCClient.kt         # WebRTC implementation
│   │   └── SignalingClient.kt      # WebSocket signaling
│   └── utils/
│       ├── PreferenceManager.kt    # SharedPreferences
│       └── Constants.kt            # App constants
├── res/
│   ├── layout/                     # XML layouts
│   ├── values/                     # Strings, colors, styles
│   └── drawable/                   # Icons, images
└── AndroidManifest.xml
```

---

## 🔧 Setup Instructions

### 1. Create New Android Studio Project

- Open Android Studio
- New Project → Empty Activity
- Name: `Connecto`
- Package: `com.connecto`
- Language: Kotlin
- Minimum SDK: API 24 (Android 7.0)

### 2. Add Dependencies

Copy `build.gradle` files from this folder to your project.

### 3. Copy Source Files

Copy all `.kt` files from `/app/android-app/app/src/main/java/com/connecto/` to your project.

### 4. Copy Resources

Copy all XML files from `/app/android-app/app/src/main/res/` to your project.

### 5. Update AndroidManifest.xml

Replace with the provided `AndroidManifest.xml`.

### 6. Configure API Endpoint

In `Constants.kt`, update:
```kotlin
const val BASE_URL = "http://YOUR_SERVER_IP:8003/api/"
```

### 7. Build & Run

```bash
./gradlew assembleDebug
```

---

## 📱 App Features

### 1. Authentication
- Phone number login
- OTP verification (mock)
- Supabase integration

### 2. Home Screen
- Balance display (coins + minutes)
- Find Random button
- Online users list
- Quick actions

### 3. Video Calling
- WebRTC peer-to-peer
- Audio/Video toggle
- Timer with billing
- Auto-disconnect on low balance

### 4. Wallet
- Current balance
- Transaction history
- Recharge options (mock Razorpay)
- Package selection

### 5. Profile
- User details
- Call history
- Settings

---

## 🔌 API Integration

All APIs connect to your Node.js backend on port 8003.

### Authentication
```kotlin
POST /auth/login
{
  "phone": "+919876543210",
  "password": "123456"
}
```

### Wallet
```kotlin
GET /wallet/balance
Headers: { "Authorization": "Bearer TOKEN" }
```

### Calls
```kotlin
POST /calls/start
{
  "receiver_id": "user_uuid",
  "call_type": "video"
}
```

---

## 🎥 WebRTC Implementation

### Architecture
```
VideoCallActivity
    ↓
WebRTCClient (manages PeerConnection)
    ↓
SignalingClient (WebSocket to backend)
```

### Flow
1. Connect to WebSocket
2. Send offer to partner
3. Receive answer
4. Exchange ICE candidates
5. Establish peer connection
6. Start media streaming
7. Track call duration
8. Deduct coins on end

---

## 💰 Billing System

### Call Billing
- Video: 10 coins/minute
- Audio: 5 coins/minute
- Updates every minute
- Auto-disconnect at 5 coins

### Implementation
```kotlin
private fun startBillingTimer() {
    billingTimer = Timer()
    billingTimer?.scheduleAtFixedRate(0, 60000) {
        deductCoins()
    }
}
```

---

## 🎨 UI/UX Design

### Theme
- Primary: Purple Gradient (#667eea → #764ba2)
- Accent: Cyan (#06b6d4)
- Background: White
- Text: Dark Gray (#333)

### Screens
1. **Splash** - App logo, loading
2. **Login** - Phone input, OTP
3. **Home** - Balance, find random, users
4. **Call** - Video view, controls, timer
5. **Wallet** - Balance, recharge, history
6. **Profile** - User info, settings

---

## 🧪 Testing

### Local Testing
1. Run backend on port 8003
2. Connect phone to same network
3. Update BASE_URL with your IP
4. Test all features

### Features to Test
- [ ] Login with phone
- [ ] View balance
- [ ] Find random match
- [ ] Start video call
- [ ] Audio/Video toggle
- [ ] Call billing
- [ ] Wallet recharge
- [ ] Call history

---

## 📦 Build APK

### Debug APK
```bash
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk
```

### Release APK
```bash
./gradlew assembleRelease
# Sign with keystore
```

---

## 🚀 Deployment

### Backend
- Deploy Node.js backend to cloud
- Update BASE_URL in Constants.kt
- Enable HTTPS for WebRTC

### App
- Generate signed APK
- Upload to Google Play Console
- Submit for review

---

## 📝 Next Steps

1. ✅ Copy all files to Android Studio
2. ✅ Update API endpoint
3. ✅ Test on device
4. ⏳ Add real Razorpay integration
5. ⏳ Implement TURN server for WebRTC
6. ⏳ Add push notifications
7. ⏳ Google Play release

---

## 🆘 Troubleshooting

**WebRTC not connecting:**
- Check network permissions
- Verify STUN server accessibility
- Test on same network first

**API calls failing:**
- Check BASE_URL configuration
- Verify backend is running
- Check network connectivity

**Build errors:**
- Sync Gradle
- Clean & rebuild
- Check dependencies versions

---

## 📞 Support

For issues or questions:
- Check backend logs: `/var/log/connecto.log`
- Android logcat: `adb logcat | grep Connecto`

---

**Built with ❤️ for Connecto**