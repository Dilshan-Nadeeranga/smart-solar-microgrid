package com.ead.solargrid.models

data class LoginResponse(
    val message: String,
    val token: String,
    val nic: String,
    val name: String,
    val role: String,
    val accountStatus: String,
    val registrationId: String? = null
)
