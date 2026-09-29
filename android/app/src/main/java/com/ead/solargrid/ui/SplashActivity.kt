package com.ead.solargrid.ui

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.ead.solargrid.database.SessionManager
import com.ead.solargrid.ui.auth.LoginActivity
import com.ead.solargrid.ui.home.ProsumerHomeActivity
import com.ead.solargrid.ui.operator.GridOperatorHomeActivity

/** Yellow window theme only; routes immediately with no splash delay. */
class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val sessionManager = SessionManager(this)
        val token = sessionManager.fetchAuthToken()
        val next = when {
            token.isNullOrEmpty() -> Intent(this, LoginActivity::class.java)
            sessionManager.getRole() == "PROSUMER" -> Intent(this, ProsumerHomeActivity::class.java)
            sessionManager.getRole() == "GRID_OPERATOR" -> Intent(this, GridOperatorHomeActivity::class.java)
            else -> Intent(this, LoginActivity::class.java)
        }
        startActivity(next)
        finish()
    }
}
