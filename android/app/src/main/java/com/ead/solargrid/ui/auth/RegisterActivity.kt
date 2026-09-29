package com.ead.solargrid.ui.auth

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.ead.solargrid.R
import com.ead.solargrid.api.ApiClient
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileOutputStream
import java.util.regex.Pattern

class RegisterActivity : AppCompatActivity() {

    private val PICK_FILE_REQUEST = 1
    private var selectedFileUri: Uri? = null
    private lateinit var tvDocName: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register)

        val etName = findViewById<EditText>(R.id.etName)
        val etNic = findViewById<EditText>(R.id.etNic)
        val etEmail = findViewById<EditText>(R.id.etEmail)
        val etPhone = findViewById<EditText>(R.id.etPhone)
        val etAddress = findViewById<EditText>(R.id.etAddress)
        val etPassword = findViewById<EditText>(R.id.etPassword)
        val etConfirmPassword = findViewById<EditText>(R.id.etConfirmPassword)
        val btnSelectDoc = findViewById<Button>(R.id.btnSelectDoc)
        tvDocName = findViewById(R.id.tvDocName)
        val btnRegister = findViewById<Button>(R.id.btnRegister)

        btnSelectDoc.setOnClickListener {
            val intent = Intent(Intent.ACTION_GET_CONTENT)
            intent.type = "*/*"
            val mimeTypes = arrayOf("image/jpeg", "image/png", "application/pdf")
            intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes)
            startActivityForResult(intent, PICK_FILE_REQUEST)
        }

        btnRegister.setOnClickListener {
            val name = etName.text.toString().trim()
            val nic = etNic.text.toString().trim()
            val email = etEmail.text.toString().trim()
            val password = etPassword.text.toString()
            val confirm = etConfirmPassword.text.toString()
            val phone = etPhone.text.toString().trim()
            val address = etAddress.text.toString().trim()

            if (name.isEmpty() || nic.isEmpty() || email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Name, NIC, Email, and Password are required", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (password != confirm) {
                Toast.makeText(this, "Passwords do not match", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val nicRegex = "^(?:[0-9]{9}[VvXx]|[0-9]{12})$"
            if (!Pattern.matches(nicRegex, nic)) {
                Toast.makeText(this, "Invalid Sri Lankan NIC format", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (selectedFileUri == null) {
                Toast.makeText(this, "Please select your NIC document", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            submitRegistration(name, nic, email, password, phone, address)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == PICK_FILE_REQUEST && resultCode == Activity.RESULT_OK && data != null) {
            selectedFileUri = data.data
            tvDocName.text = getFileName(selectedFileUri!!)
        }
    }

    private fun getFileName(uri: Uri): String {
        var result: String? = null
        if (uri.scheme == "content") {
            val cursor = contentResolver.query(uri, null, null, null, null)
            try {
                if (cursor != null && cursor.moveToFirst()) {
                    result = cursor.getString(cursor.getColumnIndexOrThrow(OpenableColumns.DISPLAY_NAME))
                }
            } finally {
                cursor?.close()
            }
        }
        if (result == null) {
            result = uri.path
            val cut = result?.lastIndexOf('/')
            if (cut != null && cut != -1) {
                result = result?.substring(cut + 1)
            }
        }
        return result ?: "document"
    }

    private fun submitRegistration(name: String, nic: String, email: String, pass: String, phone: String, address: String) {
        val file = getFileFromUri(selectedFileUri!!)
        if (file == null) {
            Toast.makeText(this, "Failed to read document file", Toast.LENGTH_SHORT).show()
            return
        }

        if (file.length() > 5 * 1024 * 1024) {
            Toast.makeText(this, "File is too large. Max 5MB.", Toast.LENGTH_SHORT).show()
            return
        }

        // Prepare Multipart request
        val requestFile = file.asRequestBody("application/octet-stream".toMediaTypeOrNull())
        val documentPart = MultipartBody.Part.createFormData("NicDocument", file.name, requestFile)
        
        val namePart = name.toRequestBody("text/plain".toMediaTypeOrNull())
        val nicPart = nic.toRequestBody("text/plain".toMediaTypeOrNull())
        val emailPart = email.toRequestBody("text/plain".toMediaTypeOrNull())
        val passPart = pass.toRequestBody("text/plain".toMediaTypeOrNull())
        val phonePart = phone.toRequestBody("text/plain".toMediaTypeOrNull())
        val addressPart = address.toRequestBody("text/plain".toMediaTypeOrNull())

        val btnRegister = findViewById<Button>(R.id.btnRegister)
        btnRegister.isEnabled = false
        btnRegister.text = "Uploading... Please wait"
        Toast.makeText(this, "Uploading document and sending OTP...", Toast.LENGTH_SHORT).show()

        lifecycleScope.launch {
            try {
                val api = ApiClient.getApiService(this@RegisterActivity)
                val response = api.registerStart(
                    nicPart, namePart, emailPart, passPart, phonePart, addressPart, documentPart
                )
                
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    Toast.makeText(this@RegisterActivity, body.message, Toast.LENGTH_LONG).show()
                    
                    val intent = Intent(this@RegisterActivity, OtpVerificationActivity::class.java)
                    intent.putExtra("REGISTRATION_ID", body.registrationId)
                    startActivity(intent)
                    finish()
                } else {
                    btnRegister.isEnabled = true
                    btnRegister.text = "Submit Registration"
                    val errorString = response.errorBody()?.string()
                    val errorMessage = try {
                        if (errorString != null) {
                            org.json.JSONObject(errorString).getString("message")
                        } else {
                            "Registration failed"
                        }
                    } catch (e: Exception) {
                        "Registration failed: ${response.message()}"
                    }
                    Toast.makeText(this@RegisterActivity, errorMessage, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                btnRegister.isEnabled = true
                btnRegister.text = "Submit Registration"
                Toast.makeText(this@RegisterActivity, "Network Error. Please try again.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun getFileFromUri(uri: Uri): File? {
        return try {
            val inputStream = contentResolver.openInputStream(uri)
            val fileName = getFileName(uri)
            val tempFile = File(cacheDir, fileName)
            val outputStream = FileOutputStream(tempFile)
            inputStream?.copyTo(outputStream)
            inputStream?.close()
            outputStream.close()
            tempFile
        } catch (e: Exception) {
            null
        }
    }
}
