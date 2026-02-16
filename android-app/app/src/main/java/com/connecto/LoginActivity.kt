package com.connecto

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.connecto.api.ApiClient
import com.connecto.api.models.LoginRequest
import com.connecto.utils.PreferenceManager
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {
    
    private lateinit var phoneEditText: EditText
    private lateinit var passwordEditText: EditText
    private lateinit var loginButton: Button
    private lateinit var prefManager: PreferenceManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)
        
        prefManager = PreferenceManager(this)
        
        phoneEditText = findViewById(R.id.phoneEditText)
        passwordEditText = findViewById(R.id.passwordEditText)
        loginButton = findViewById(R.id.loginButton)
        
        loginButton.setOnClickListener {
            val phone = phoneEditText.text.toString()
            val password = passwordEditText.text.toString()
            
            if (phone.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Please enter phone and password", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            
            login(phone, password)
        }
    }
    
    private fun login(phone: String, password: String) {
        loginButton.isEnabled = false
        loginButton.text = "Logging in..."
        
        lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.login(
                    LoginRequest(phone, password)
                )
                
                if (response.isSuccessful && response.body() != null) {
                    val loginResponse = response.body()!!
                    
                    prefManager.saveToken(loginResponse.access_token)
                    prefManager.saveUserId(loginResponse.user.id)
                    prefManager.saveUserPhone(loginResponse.user.phone)
                    loginResponse.user.name?.let { prefManager.saveUserName(it) }
                    
                    Toast.makeText(this@LoginActivity, "Login successful!", Toast.LENGTH_SHORT).show()
                    
                    startActivity(Intent(this@LoginActivity, HomeActivity::class.java))
                    finish()
                } else {
                    Toast.makeText(this@LoginActivity, "Login failed", Toast.LENGTH_SHORT).show()
                    loginButton.isEnabled = true
                    loginButton.text = "Login"
                }
            } catch (e: Exception) {
                Toast.makeText(this@LoginActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                loginButton.isEnabled = true
                loginButton.text = "Login"
            }
        }
    }
}