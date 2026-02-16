package com.connecto.api

import com.connecto.api.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>
    
    @GET("wallet/balance")
    suspend fun getBalance(
        @Header("Authorization") token: String
    ): Response<WalletBalance>
    
    @POST("wallet/deduct-minutes")
    suspend fun deductMinutes(
        @Header("Authorization") token: String,
        @Body request: Map<String, Any>
    ): Response<Map<String, Any>>
    
    @POST("calls/start")
    suspend fun startCall(
        @Header("Authorization") token: String,
        @Body request: CallRequest
    ): Response<CallResponse>
    
    @POST("calls/end")
    suspend fun endCall(
        @Header("Authorization") token: String,
        @Body request: EndCallRequest
    ): Response<EndCallResponse>
    
    @GET("calls/history")
    suspend fun getCallHistory(
        @Header("Authorization") token: String
    ): Response<Map<String, List<Any>>>
}