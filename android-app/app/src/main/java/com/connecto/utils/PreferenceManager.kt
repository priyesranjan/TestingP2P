package com.connecto.utils

import android.content.Context
import android.content.SharedPreferences

class PreferenceManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences(
        Constants.PREF_NAME,
        Context.MODE_PRIVATE
    )
    
    fun saveToken(token: String) {
        prefs.edit().putString(Constants.KEY_TOKEN, token).apply()
    }
    
    fun getToken(): String? {
        return prefs.getString(Constants.KEY_TOKEN, null)
    }
    
    fun saveUserId(userId: String) {
        prefs.edit().putString(Constants.KEY_USER_ID, userId).apply()
    }
    
    fun getUserId(): String? {
        return prefs.getString(Constants.KEY_USER_ID, null)
    }
    
    fun saveUserPhone(phone: String) {
        prefs.edit().putString(Constants.KEY_USER_PHONE, phone).apply()
    }
    
    fun getUserPhone(): String? {
        return prefs.getString(Constants.KEY_USER_PHONE, null)
    }
    
    fun saveUserName(name: String) {
        prefs.edit().putString(Constants.KEY_USER_NAME, name).apply()
    }
    
    fun getUserName(): String? {
        return prefs.getString(Constants.KEY_USER_NAME, null)
    }
    
    fun isLoggedIn(): Boolean {
        return getToken() != null
    }
    
    fun clearAll() {
        prefs.edit().clear().apply()
    }
}