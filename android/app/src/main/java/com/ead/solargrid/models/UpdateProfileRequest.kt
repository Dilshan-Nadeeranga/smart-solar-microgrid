package com.ead.solargrid.models

data class UpdateProfileRequest(
    val name: String?,
    val email: String?,
    val phone: String?,
    val address: String?
)
