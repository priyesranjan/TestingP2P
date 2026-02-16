package com.connecto.api.models

data class LoginRequest(
    val phone: String,
    val password: String
)

data class LoginResponse(
    val access_token: String,
    val user: User
)

data class User(
    val id: String,
    val phone: String,
    val name: String?,
    val role: String?
)

data class WalletBalance(
    val coins: Int,
    val audio_minutes: Int,
    val video_minutes: Int,
    val promo_minutes: Int,
    val cash_balance: Double
)

data class CallRequest(
    val receiver_id: String,
    val call_type: String  // "video" or "audio"
)

data class CallResponse(
    val call_id: String,
    val message: String
)

data class EndCallRequest(
    val call_id: String
)

data class EndCallResponse(
    val duration_seconds: Int,
    val cost: Int,
    val message: String
)

data class OnlineUser(
    val userId: String,
    val email: String?,
    val status: String
)

data class OnlineUsersResponse(
    val users: List<OnlineUser>,
    val count: Int
)

data class ApiError(
    val error: String
)