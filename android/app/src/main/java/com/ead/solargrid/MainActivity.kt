package com.ead.solargrid

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.ead.solargrid.database.SessionManager
import com.ead.solargrid.ui.auth.LoginActivity
import com.ead.solargrid.ui.home.ProsumerHomeActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val sessionManager = SessionManager(this)
        val token = sessionManager.fetchAuthToken()

        if (token.isNullOrEmpty()) {
            startActivity(Intent(this, LoginActivity::class.java))
        } else {
            val role = sessionManager.getRole()
            if (role == "PROSUMER") {
                startActivity(Intent(this, ProsumerHomeActivity::class.java))
            } else {
                startActivity(Intent(this, LoginActivity::class.java))
            }
        }
        finish()
    }
}