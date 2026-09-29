package com.ead.solargrid.models

data class VerifyOtpRequest(
    val registrationId: String,
    val otp: String
)

data class ResendOtpRequest(
    val registrationId: String
)

data class RegisterStartResponse(
    val success: Boolean,
    val message: String,
    val registrationId: String?
)

data class BaseResponse(
    val success: Boolean,
    val message: String
)
