package com.connecto.webrtc

import android.util.Log
import com.connecto.utils.Constants
import com.google.gson.Gson
import okhttp3.*
import org.webrtc.IceCandidate
import org.webrtc.SessionDescription
import java.util.concurrent.TimeUnit

class SignalingClient(
    private val listener: SignalingListener
) {
    private val TAG = "SignalingClient"
    private var webSocket: WebSocket? = null
    private val gson = Gson()
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .build()
    
    fun connect(token: String) {
        val request = Request.Builder()
            .url(Constants.WS_URL)
            .build()
        
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket connected")
                // Authenticate
                val authMessage = mapOf(
                    "type" to "auth",
                    "token" to token
                )
                send(authMessage)
            }
            
            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "Message received: $text")
                handleMessage(text)
            }
            
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket error: ${t.message}")
                listener.onError(t.message ?: "WebSocket connection failed")
            }
            
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closed: $reason")
                listener.onDisconnected()
            }
        })
    }
    
    private fun handleMessage(text: String) {
        try {
            val message = gson.fromJson(text, Map::class.java)
            val type = message["type"] as? String
            
            when (type) {
                "authenticated" -> {
                    val userId = message["userId"] as? String
                    listener.onAuthenticated(userId ?: "")
                }
                
                "match_found" -> {
                    val partnerId = message["partnerId"] as? String
                    listener.onMatchFound(partnerId ?: "")
                }
                
                "webrtc_signal" -> {
                    val signal = message["signal"] as? Map<*, *>
                    handleWebRTCSignal(signal)
                }
                
                "call_started" -> {
                    val callId = message["callId"] as? String
                    listener.onCallStarted(callId ?: "")
                }
                
                "call_ended" -> {
                    val duration = (message["duration_seconds"] as? Double)?.toInt() ?: 0
                    val cost = (message["cost"] as? Double)?.toInt() ?: 0
                    listener.onCallEnded(duration, cost)
                }
                
                "partner_disconnected" -> {
                    listener.onPartnerDisconnected()
                }
                
                "online_users" -> {
                    val users = message["users"] as? List<*>
                    listener.onOnlineUsersUpdate(users?.size ?: 0)
                }
                
                "insufficient_balance" -> {
                    listener.onInsufficientBalance()
                }
                
                "error" -> {
                    val errorMsg = message["message"] as? String
                    listener.onError(errorMsg ?: "Unknown error")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing message: ${e.message}")
        }
    }
    
    private fun handleWebRTCSignal(signal: Map<*, *>?) {
        signal ?: return
        
        val signalType = signal["type"] as? String
        
        when (signalType) {
            "offer" -> {
                val sdp = (signal["sdp"] as? Map<*, *>)?.get("sdp") as? String
                val type = (signal["sdp"] as? Map<*, *>)?.get("type") as? String
                if (sdp != null && type != null) {
                    val sessionDescription = SessionDescription(
                        SessionDescription.Type.fromCanonicalForm(type),
                        sdp
                    )
                    listener.onOfferReceived(sessionDescription)
                }
            }
            
            "answer" -> {
                val sdp = (signal["sdp"] as? Map<*, *>)?.get("sdp") as? String
                val type = (signal["sdp"] as? Map<*, *>)?.get("type") as? String
                if (sdp != null && type != null) {
                    val sessionDescription = SessionDescription(
                        SessionDescription.Type.fromCanonicalForm(type),
                        sdp
                    )
                    listener.onAnswerReceived(sessionDescription)
                }
            }
            
            "ice-candidate" -> {
                val candidate = signal["candidate"] as? Map<*, *>
                val sdp = candidate?.get("candidate") as? String
                val sdpMid = candidate?.get("sdpMid") as? String
                val sdpMLineIndex = (candidate?.get("sdpMLineIndex") as? Double)?.toInt() ?: 0
                
                if (sdp != null && sdpMid != null) {
                    val iceCandidate = IceCandidate(sdpMid, sdpMLineIndex, sdp)
                    listener.onIceCandidateReceived(iceCandidate)
                }
            }
        }
    }
    
    fun sendOffer(offer: SessionDescription, partnerId: String) {
        val message = mapOf(
            "type" to "webrtc_signal",
            "partnerId" to partnerId,
            "signal" to mapOf(
                "type" to "offer",
                "sdp" to mapOf(
                    "type" to offer.type.canonicalForm(),
                    "sdp" to offer.description
                )
            )
        )
        send(message)
    }
    
    fun sendAnswer(answer: SessionDescription, partnerId: String) {
        val message = mapOf(
            "type" to "webrtc_signal",
            "partnerId" to partnerId,
            "signal" to mapOf(
                "type" to "answer",
                "sdp" to mapOf(
                    "type" to answer.type.canonicalForm(),
                    "sdp" to answer.description
                )
            )
        )
        send(message)
    }
    
    fun sendIceCandidate(candidate: IceCandidate, partnerId: String) {
        val message = mapOf(
            "type" to "webrtc_signal",
            "partnerId" to partnerId,
            "signal" to mapOf(
                "type" to "ice-candidate",
                "candidate" to mapOf(
                    "candidate" to candidate.sdp,
                    "sdpMid" to candidate.sdpMid,
                    "sdpMLineIndex" to candidate.sdpMLineIndex
                )
            )
        )
        send(message)
    }
    
    fun findRandom(userId: String) {
        val message = mapOf(
            "type" to "find_random",
            "userId" to userId
        )
        send(message)
    }
    
    fun startCall(userId: String, partnerId: String, callType: String) {
        val message = mapOf(
            "type" to "start_call",
            "userId" to userId,
            "partnerId" to partnerId,
            "callType" to callType
        )
        send(message)
    }
    
    fun endCall(userId: String, callId: String) {
        val message = mapOf(
            "type" to "end_call",
            "userId" to userId,
            "callId" to callId
        )
        send(message)
    }
    
    fun disconnectChat(userId: String) {
        val message = mapOf(
            "type" to "disconnect_chat",
            "userId" to userId
        )
        send(message)
    }
    
    private fun send(message: Map<String, Any>) {
        val json = gson.toJson(message)
        webSocket?.send(json)
        Log.d(TAG, "Sent: $json")
    }
    
    fun disconnect() {
        webSocket?.close(1000, "Client disconnecting")
        webSocket = null
    }
    
    interface SignalingListener {
        fun onAuthenticated(userId: String)
        fun onMatchFound(partnerId: String)
        fun onOfferReceived(offer: SessionDescription)
        fun onAnswerReceived(answer: SessionDescription)
        fun onIceCandidateReceived(candidate: IceCandidate)
        fun onCallStarted(callId: String)
        fun onCallEnded(duration: Int, cost: Int)
        fun onPartnerDisconnected()
        fun onOnlineUsersUpdate(count: Int)
        fun onInsufficientBalance()
        fun onError(message: String)
        fun onDisconnected()
    }
}