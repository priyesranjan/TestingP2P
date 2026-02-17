package com.appdost.connecto.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material.icons.filled.Cameraswitch
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import org.webrtc.SurfaceViewRenderer

@Composable
fun CallScreen(
    localVideoRenderer: SurfaceViewRenderer,
    remoteVideoRenderer: SurfaceViewRenderer,
    onEndCall: () -> Unit,
    onSkip: () -> Unit,
    onToggleMic: () -> Unit,
    onSwitchCamera: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // Remote Video (Full Screen)
        AndroidView(
            factory = { remoteVideoRenderer },
            modifier = Modifier.fillMaxSize()
        )

        // Local Video (PIP)
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(16.dp)
                .size(120.dp, 160.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color.DarkGray)
        ) {
            AndroidView(
                factory = { localVideoRenderer },
                modifier = Modifier.fillMaxSize()
            )
        }

        // Controls
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 32.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            // Mic
            IconButton(
                onClick = onToggleMic,
                modifier = Modifier
                    .size(50.dp)
                    .background(Color.White.copy(alpha = 0.2f), CircleShape)
            ) {
                Icon(Icons.Default.Mic, contentDescription = "Mic", tint = Color.White)
            }

            // End Call
            IconButton(
                onClick = onEndCall,
                modifier = Modifier
                    .size(60.dp)
                    .background(Color.Red, CircleShape)
            ) {
                Icon(Icons.Default.CallEnd, contentDescription = "End", tint = Color.White)
            }

            // Next / Skip
            IconButton(
                onClick = onSkip,
                modifier = Modifier
                    .size(60.dp)
                    .background(Color(0xFF4CC9F0), CircleShape)
            ) {
                Icon(Icons.Default.SkipNext, contentDescription = "Next", tint = Color.Black)
            }
            
            // Camera Switch
            IconButton(
                onClick = onSwitchCamera,
                modifier = Modifier
                    .size(50.dp)
                    .background(Color.White.copy(alpha = 0.2f), CircleShape)
            ) {
                Icon(Icons.Default.Cameraswitch, contentDescription = "Switch", tint = Color.White)
            }
        }
    }
}
