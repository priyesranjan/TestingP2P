package com.connecto

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.connecto.utils.PreferenceManager

class ProfileActivity : AppCompatActivity() {
    
    private lateinit var userNameTextView: TextView
    private lateinit var userPhoneTextView: TextView
    private lateinit var logoutButton: Button
    private lateinit var prefManager: PreferenceManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_profile)
        
        prefManager = PreferenceManager(this)
        
        initViews()
        loadProfile()
    }
    
    private fun initViews() {
        userNameTextView = findViewById(R.id.userNameTextView)
        userPhoneTextView = findViewById(R.id.userPhoneTextView)
        logoutButton = findViewById(R.id.logoutButton)
        
        logoutButton.setOnClickListener {
            logout()
        }
    }
    
    private fun loadProfile() {
        val name = prefManager.getUserName() ?: "User"
        val phone = prefManager.getUserPhone() ?: "N/A"
        
        userNameTextView.text = name
        userPhoneTextView.text = phone
    }
    
    private fun logout() {
        prefManager.clearAll()
        
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}