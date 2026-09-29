package com.ead.solargrid.ui.home

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.ead.solargrid.R
import com.ead.solargrid.database.SessionManager
import com.ead.solargrid.ui.auth.LoginActivity

class ProsumerHomeActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_prosumer_home)

        val sessionManager = SessionManager(this)
        val user = sessionManager.getUserSession()

        val tvWelcome = findViewById<TextView>(R.id.tvWelcome)
        val btnLogout = findViewById<Button>(R.id.btnLogout)

        if (user != null) {
            tvWelcome.text = "Welcome, ${user.name}!"
        }

        btnLogout.setOnClickListener {
            sessionManager.logout()
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }
    }
}
