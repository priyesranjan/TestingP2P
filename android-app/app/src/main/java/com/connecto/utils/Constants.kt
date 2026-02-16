package com.connecto.utils

object Constants {
    // API Configuration
    const val BASE_URL = "http://192.168.1.100:8003/api/" // UPDATE WITH YOUR IP
    const val WS_URL = "ws://192.168.1.100:8003/api/ws"   // UPDATE WITH YOUR IP
    
    // SharedPreferences
    const val PREF_NAME = "Connecto_Prefs"
    const val KEY_TOKEN = "access_token"
    const val KEY_USER_ID = "user_id"
    const val KEY_USER_PHONE = "user_phone"
    const val KEY_USER_NAME = "user_name"
    
    // Call Configuration
    const val VIDEO_CALL_RATE_PER_MINUTE = 10
    const val AUDIO_CALL_RATE_PER_MINUTE = 5
    const val MIN_BALANCE_REQUIRED = 5
    
    // WebRTC
    const val ICE_SERVER_URL = "stun:stun.l.google.com:19302"
    
    // Request Codes
    const val REQUEST_CAMERA_PERMISSION = 1001
    const val REQUEST_AUDIO_PERMISSION = 1002
}