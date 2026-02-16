package com.connecto

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.connecto.api.ApiClient
import com.connecto.utils.PreferenceManager
import kotlinx.coroutines.launch

class HomeActivity : AppCompatActivity() {
    
    private lateinit var balanceTextView: TextView
    private lateinit var coinsTextView: TextView
    private lateinit var videoMinutesTextView: TextView
    private lateinit var audioMinutesTextView: TextView
    private lateinit var findRandomButton: Button
    private lateinit var walletButton: Button
    private lateinit var profileButton: Button
    private lateinit var prefManager: PreferenceManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)
        
        prefManager = PreferenceManager(this)
        
        initViews()
        checkPermissions()
        loadBalance()
    }
    
    private fun initViews() {
        balanceTextView = findViewById(R.id.balanceTextView)
        coinsTextView = findViewById(R.id.coinsTextView)
        videoMinutesTextView = findViewById(R.id.videoMinutesTextView)
        audioMinutesTextView = findViewById(R.id.audioMinutesTextView)
        findRandomButton = findViewById(R.id.findRandomButton)
        walletButton = findViewById(R.id.walletButton)
        profileButton = findViewById(R.id.profileButton)
        
        findRandomButton.setOnClickListener {
            startActivity(Intent(this, VideoCallActivity::class.java))
        }
        
        walletButton.setOnClickListener {
            startActivity(Intent(this, WalletActivity::class.java))
        }
        
        profileButton.setOnClickListener {
            startActivity(Intent(this, ProfileActivity::class.java))
        }
    }
    
    private fun checkPermissions() {
        val permissions = arrayOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
        )
        
        val notGranted = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        
        if (notGranted.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, notGranted.toTypedArray(), 100)
        }
    }
    
    private fun loadBalance() {
        lifecycleScope.launch {
            try {
                val token = "Bearer ${prefManager.getToken()}"
                val response = ApiClient.apiService.getBalance(token)
                
                if (response.isSuccessful && response.body() != null) {
                    val balance = response.body()!!
                    coinsTextView.text = "${balance.coins} Coins"
                    videoMinutesTextView.text = "${balance.video_minutes} Video Min"
                    audioMinutesTextView.text = "${balance.audio_minutes} Audio Min"
                } else {
                    Toast.makeText(this@HomeActivity, "Failed to load balance", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@HomeActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    override fun onResume() {
        super.onResume()
        loadBalance()
    }
}