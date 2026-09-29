package com.ead.solargrid.ui.auth

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.ead.solargrid.R
import com.ead.solargrid.api.ApiClient
import com.ead.solargrid.database.SessionManager
import com.ead.solargrid.models.LoginRequest
import com.ead.solargrid.ui.home.ProsumerHomeActivity
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        val etNic = findViewById<EditText>(R.id.etNic)
        val etPassword = findViewById<EditText>(R.id.etPassword)
        val btnLogin = findViewById<Button>(R.id.btnLogin)
        val tvRegister = findViewById<TextView>(R.id.tvRegister)

        val sessionManager = SessionManager(this)

        btnLogin.setOnClickListener {
            val nic = etNic.text.toString().trim()
            val password = etPassword.text.toString()

            if (nic.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            lifecycleScope.launch {
                try {
                    val api = ApiClient.getApiService(this@LoginActivity)
                    val response = api.login(LoginRequest(nic, password))

                    if (response.isSuccessful && response.body() != null) {
                        val body = response.body()!!
                        
                        if (body.accountStatus == "UNVERIFIED") {
                            Toast.makeText(this@LoginActivity, body.message, Toast.LENGTH_LONG).show()
                            val intent = Intent(this@LoginActivity, OtpVerificationActivity::class.java)
                            intent.putExtra("REGISTRATION_ID", body.registrationId)
                            startActivity(intent)
                            return@launch
                        }

                        sessionManager.saveAuthToken(body.token)
                        sessionManager.saveUserSession(
                            nic = body.nic,
                            name = body.name,
                            email = "", // Fetch later or add to response
                            phone = "",
                            address = "",
                            role = body.role,
                            accountStatus = body.accountStatus
                        )

                        if (body.role == "PROSUMER") {
                            startActivity(Intent(this@LoginActivity, ProsumerHomeActivity::class.java))
                            finish()
                        } else {
                            Toast.makeText(this@LoginActivity, "Logged in as ${body.role}", Toast.LENGTH_SHORT).show()
                            // Route to Grid/Backoffice home here
                        }
                    } else {
                        val errorString = response.errorBody()?.string()
                        val errorMessage = try {
                            if (errorString != null) {
                                org.json.JSONObject(errorString).getString("message")
                            } else {
                                "Login failed"
                            }
                        } catch (e: Exception) {
                            "Login failed: ${response.message()}"
                        }
                        Toast.makeText(this@LoginActivity, errorMessage, Toast.LENGTH_LONG).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(this@LoginActivity, "Network Error: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }

        tvRegister.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }
    }
}
