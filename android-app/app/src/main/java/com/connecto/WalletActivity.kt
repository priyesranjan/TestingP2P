package com.connecto

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.connecto.api.ApiClient
import com.connecto.utils.PreferenceManager
import kotlinx.coroutines.launch

class WalletActivity : AppCompatActivity() {
    
    private lateinit var coinsTextView: TextView
    private lateinit var videoMinutesTextView: TextView
    private lateinit var audioMinutesTextView: TextView
    private lateinit var cashBalanceTextView: TextView
    private lateinit var recharge100Button: Button
    private lateinit var recharge500Button: Button
    private lateinit var recharge1000Button: Button
    private lateinit var prefManager: PreferenceManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_wallet)
        
        prefManager = PreferenceManager(this)
        
        initViews()
        loadBalance()
    }
    
    private fun initViews() {
        coinsTextView = findViewById(R.id.coinsTextView)
        videoMinutesTextView = findViewById(R.id.videoMinutesTextView)
        audioMinutesTextView = findViewById(R.id.audioMinutesTextView)
        cashBalanceTextView = findViewById(R.id.cashBalanceTextView)
        recharge100Button = findViewById(R.id.recharge100Button)
        recharge500Button = findViewById(R.id.recharge500Button)
        recharge1000Button = findViewById(R.id.recharge1000Button)
        
        recharge100Button.setOnClickListener { mockRecharge(100) }
        recharge500Button.setOnClickListener { mockRecharge(500) }
        recharge1000Button.setOnClickListener { mockRecharge(1000) }
    }
    
    private fun loadBalance() {
        lifecycleScope.launch {
            try {
                val token = "Bearer ${prefManager.getToken()}"
                val response = ApiClient.apiService.getBalance(token)
                
                if (response.isSuccessful && response.body() != null) {
                    val balance = response.body()!!
                    coinsTextView.text = balance.coins.toString()
                    videoMinutesTextView.text = balance.video_minutes.toString()
                    audioMinutesTextView.text = balance.audio_minutes.toString()
                    cashBalanceTextView.text = "₹${balance.cash_balance}"
                } else {
                    Toast.makeText(this@WalletActivity, "Failed to load balance", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@WalletActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    private fun mockRecharge(amount: Int) {
        // Mock Razorpay payment
        Toast.makeText(
            this,
            "Mock Razorpay: Recharging $amount coins...\nAdmin will add coins manually!",
            Toast.LENGTH_LONG
        ).show()
        
        // In real app, integrate actual Razorpay here
        // For now, just show message to contact admin
    }
}