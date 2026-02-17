package com.appdost.connecto

import android.util.Log
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class SignalingClient(private val listener: SignalingListener) {

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS) // Keep alive
        .build()

    private var webSocket: WebSocket? = null
    private val serverUrl = "wss://call.appdost.com/api/ws" // ⚡ Native WebSocket

    interface SignalingListener {
        fun onConnectionEstablished()
        fun onOfferReceived(description: String)
        fun onAnswerReceived(description: String)
        fun onIceCandidateReceived(candidate: String)
        fun onMatchFound(partnerId: String)
    }

    fun connect() {
        Log.d("SignalingClient", "Connecting to $serverUrl")
        val request = Request.Builder().url(serverUrl).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d("SignalingClient", "Connected!")
                listener.onConnectionEstablished()
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d("SignalingClient", "Msg: $text")
                handleMessage(text)
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                Log.d("SignalingClient", "Closing: $reason")
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e("SignalingClient", "Error: ${t.message}")
            }
        })
    }

    fun send(message: JSONObject) {
        webSocket?.send(message.toString())
    }

    private fun handleMessage(text: String) {
        try {
            val json = JSONObject(text)
            when (json.optString("type")) {
                "match_found" -> listener.onMatchFound(json.getString("partnerId"))
                "webrtc_signal" -> {
                    val signal = json.getJSONObject("signal")
                    val type = signal.optString("type")
                    if (type == "offer") {
                        listener.onOfferReceived(signal.getString("sdp"))
                    } else if (type == "answer") {
                        listener.onAnswerReceived(signal.getString("sdp"))
                    } else if (type == "ice-candidate") {
                        listener.onIceCandidateReceived(signal.getString("candidate")) // Simplified for brevity
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("SignalingClient", "JSON Parse Error: $e")
        }
    }
}
