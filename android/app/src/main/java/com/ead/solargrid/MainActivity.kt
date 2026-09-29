package com.ead.solargrid

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.ead.solargrid.database.SessionManager
import com.ead.solargrid.ui.auth.LoginActivity
import com.ead.solargrid.ui.home.ProsumerHomeActivity
import com.ead.solargrid.ui.operator.GridOperatorHomeActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val sessionManager = SessionManager(this)
        val token = sessionManager.fetchAuthToken()

        if (token.isNullOrEmpty()) {
            startActivity(Intent(this, LoginActivity::class.java))
        } else {
            when (sessionManager.getRole()) {
                "PROSUMER" -> startActivity(Intent(this, ProsumerHomeActivity::class.java))
                "GRID_OPERATOR" -> startActivity(Intent(this, GridOperatorHomeActivity::class.java))
                else -> startActivity(Intent(this, LoginActivity::class.java))
            }
        }
        finish()
    }
}