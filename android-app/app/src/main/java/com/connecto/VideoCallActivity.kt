package com.connecto

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Button
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.connecto.utils.PreferenceManager
import com.connecto.webrtc.SignalingClient
import com.connecto.webrtc.WebRTCClient
import org.webrtc.IceCandidate
import org.webrtc.MediaStream
import org.webrtc.PeerConnection
import org.webrtc.SessionDescription
import org.webrtc.SurfaceViewRenderer
import java.util.*

class VideoCallActivity : AppCompatActivity(), 
    WebRTCClient.PeerConnectionObserver,
    SignalingClient.SignalingListener {
    
    private lateinit var localView: SurfaceViewRenderer
    private lateinit var remoteView: SurfaceViewRenderer
    private lateinit var timerTextView: TextView
    private lateinit var statusTextView: TextView
    private lateinit var muteButton: ImageButton
    private lateinit var videoButton: ImageButton
    private lateinit var switchCameraButton: ImageButton
    private lateinit var endCallButton: Button
    
    private lateinit var webRTCClient: WebRTCClient
    private lateinit var signalingClient: SignalingClient
    private lateinit var prefManager: PreferenceManager
    
    private var partnerId: String? = null
    private var callId: String? = null
    private var isAudioEnabled = true
    private var isVideoEnabled = true
    
    private var callTimer: Timer? = null
    private var elapsedSeconds = 0
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_video_call)
        
        prefManager = PreferenceManager(this)
        
        initViews()
        setupWebRTC()
        setupSignaling()
    }
    
    private fun initViews() {
        localView = findViewById(R.id.localView)
        remoteView = findViewById(R.id.remoteView)
        timerTextView = findViewById(R.id.timerTextView)
        statusTextView = findViewById(R.id.statusTextView)
        muteButton = findViewById(R.id.muteButton)
        videoButton = findViewById(R.id.videoButton)
        switchCameraButton = findViewById(R.id.switchCameraButton)
        endCallButton = findViewById(R.id.endCallButton)
        
        muteButton.setOnClickListener {
            isAudioEnabled = !isAudioEnabled
            webRTCClient.toggleAudio(isAudioEnabled)
            muteButton.setImageResource(
                if (isAudioEnabled) R.drawable.ic_mic_on else R.drawable.ic_mic_off
            )
        }
        
        videoButton.setOnClickListener {
            isVideoEnabled = !isVideoEnabled
            webRTCClient.toggleVideo(isVideoEnabled)
            videoButton.setImageResource(
                if (isVideoEnabled) R.drawable.ic_videocam_on else R.drawable.ic_videocam_off
            )
        }
        
        switchCameraButton.setOnClickListener {
            webRTCClient.switchCamera()
        }
        
        endCallButton.setOnClickListener {
            endCall()
        }
    }
    
    private fun setupWebRTC() {
        webRTCClient = WebRTCClient(this, this)
        webRTCClient.initializePeerConnection()
        webRTCClient.startLocalVideoCapture(localView)
    }
    
    private fun setupSignaling() {
        signalingClient = SignalingClient(this)
        val token = prefManager.getToken() ?: ""
        signalingClient.connect(token)
    }
    
    // SignalingClient.SignalingListener implementation
    override fun onAuthenticated(userId: String) {
        runOnUiThread {
            statusTextView.text = "Authenticated. Finding partner..."
            signalingClient.findRandom(userId)
        }
    }
    
    override fun onMatchFound(partnerId: String) {
        this.partnerId = partnerId
        runOnUiThread {
            statusTextView.text = "Partner found! Connecting..."
        }
        
        // Create offer
        webRTCClient.createOffer { offer ->
            signalingClient.sendOffer(offer, partnerId)
            
            // Start call
            val userId = prefManager.getUserId() ?: ""
            signalingClient.startCall(userId, partnerId, "video")
        }
    }
    
    override fun onOfferReceived(offer: SessionDescription) {
        webRTCClient.setRemoteDescription(offer)
        webRTCClient.createAnswer { answer ->
            partnerId?.let { 
                signalingClient.sendAnswer(answer, it)
            }
        }
    }
    
    override fun onAnswerReceived(answer: SessionDescription) {
        webRTCClient.setRemoteDescription(answer)
    }
    
    override fun onIceCandidateReceived(candidate: IceCandidate) {
        webRTCClient.addIceCandidate(candidate)
    }
    
    override fun onCallStarted(callId: String) {
        this.callId = callId
        runOnUiThread {
            statusTextView.text = "Call connected"
            startCallTimer()
        }
    }
    
    override fun onCallEnded(duration: Int, cost: Int) {
        runOnUiThread {
            Toast.makeText(
                this,
                "Call ended. Duration: $duration seconds. Cost: $cost coins",
                Toast.LENGTH_LONG
            ).show()
            finish()
        }
    }
    
    override fun onPartnerDisconnected() {
        runOnUiThread {
            Toast.makeText(this, "Partner disconnected", Toast.LENGTH_SHORT).show()
            finish()
        }
    }
    
    override fun onOnlineUsersUpdate(count: Int) {
        // Handle if needed
    }
    
    override fun onInsufficientBalance() {
        runOnUiThread {
            Toast.makeText(
                this,
                "Insufficient balance! Please recharge.",
                Toast.LENGTH_LONG
            ).show()
            finish()
        }
    }
    
    override fun onError(message: String) {
        runOnUiThread {
            Toast.makeText(this, "Error: $message", Toast.LENGTH_SHORT).show()
        }
    }
    
    override fun onDisconnected() {
        runOnUiThread {
            Toast.makeText(this, "Disconnected from server", Toast.LENGTH_SHORT).show()
            finish()
        }
    }
    
    // WebRTCClient.PeerConnectionObserver implementation
    override fun onIceCandidate(candidate: IceCandidate) {
        partnerId?.let {
            signalingClient.sendIceCandidate(candidate, it)
        }
    }
    
    override fun onAddStream(stream: MediaStream) {
        runOnUiThread {
            if (stream.videoTracks.isNotEmpty()) {
                stream.videoTracks[0].addSink(remoteView)
                remoteView.visibility = View.VISIBLE
            }
        }
    }
    
    override fun onIceConnectionChange(state: PeerConnection.IceConnectionState?) {
        runOnUiThread {
            when (state) {
                PeerConnection.IceConnectionState.CONNECTED -> {
                    statusTextView.text = "Connected"
                }
                PeerConnection.IceConnectionState.DISCONNECTED -> {
                    statusTextView.text = "Disconnected"
                }
                PeerConnection.IceConnectionState.FAILED -> {
                    Toast.makeText(this, "Connection failed", Toast.LENGTH_SHORT).show()
                    finish()
                }
                else -> {}
            }
        }
    }
    
    private fun startCallTimer() {
        callTimer = Timer()
        callTimer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                elapsedSeconds++
                runOnUiThread {
                    val minutes = elapsedSeconds / 60
                    val seconds = elapsedSeconds % 60
                    timerTextView.text = String.format("%02d:%02d", minutes, seconds)
                }
            }
        }, 1000, 1000)
    }
    
    private fun endCall() {
        callTimer?.cancel()
        
        callId?.let {
            val userId = prefManager.getUserId() ?: ""
            signalingClient.endCall(userId, it)
        }
        
        webRTCClient.close()
        signalingClient.disconnect()
        finish()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        callTimer?.cancel()
        webRTCClient.close()
        signalingClient.disconnect()
    }
}