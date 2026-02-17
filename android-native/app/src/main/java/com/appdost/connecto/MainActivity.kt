package com.appdost.connecto

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import com.appdost.connecto.ui.theme.ConnectoTheme
import com.appdost.connecto.ui.screens.HomeScreen
import com.appdost.connecto.ui.screens.CallScreen
import org.webrtc.SurfaceViewRenderer
import org.webrtc.EglBase

class MainActivity : ComponentActivity(), SignalingClient.SignalingListener {

    private lateinit var signalingClient: SignalingClient
    private lateinit var webRTCClient: WebRTCClient
    
    // View Renderers
    private lateinit var localRenderer: SurfaceViewRenderer
    private lateinit var remoteRenderer: SurfaceViewRenderer
    private val rootEglBase = EglBase.create()

    private var appState by mutableStateOf("HOME") // HOME, CALLING
    private var connectionStatus by mutableStateOf("Ready")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Init Renderers
        localRenderer = SurfaceViewRenderer(this).apply {
            init(rootEglBase.eglBaseContext, null)
            setMirror(true)
        }
        remoteRenderer = SurfaceViewRenderer(this).apply {
            init(rootEglBase.eglBaseContext, null)
        }

        signalingClient = SignalingClient(this)
        webRTCClient = WebRTCClient(this, signalingClient)

        setContent {
            ConnectoTheme {
                if (appState == "HOME") {
                    HomeScreen(
                        onStartMatch = {
                            connectionStatus = "Connecting..."
                            signalingClient.connect()
                        },
                        status = connectionStatus
                    )
                } else {
                    CallScreen(
                        localVideoRenderer = localRenderer,
                        remoteVideoRenderer = remoteRenderer,
                        onEndCall = { 
                            webRTCClient.stop()
                            appState = "HOME" 
                        },
                        onSkip = {
                            webRTCClient.stop()
                            signalingClient.connect() // Find new
                        },
                        onToggleMic = { /* Implement */ },
                        onSwitchCamera = { /* Implement */ }
                    )
                }
            }
        }
    }

    override fun onMatchFound(partnerId: String) {
        connectionStatus = "Match Found!"
        appState = "CALLING"
        webRTCClient.startCall()
        // Attach renderers logic here
    }

    // ... (Existing overrides)
    override fun onConnectionEstablished() { connectionStatus = "Looking for match..." }
    override fun onOfferReceived(description: String) {}
    override fun onAnswerReceived(description: String) {}
    override fun onIceCandidateReceived(candidate: String) {}
}
