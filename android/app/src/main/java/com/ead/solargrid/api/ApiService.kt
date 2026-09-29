package com.ead.solargrid.api

import com.ead.solargrid.models.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @Multipart
    @POST("api/auth/register/start")
    suspend fun registerStart(
        @Part("nic") nic: RequestBody,
        @Part("name") name: RequestBody,
        @Part("email") email: RequestBody,
        @Part("password") password: RequestBody,
        @Part("phone") phone: RequestBody?,
        @Part("address") address: RequestBody?,
        @Part nicDocument: MultipartBody.Part
    ): Response<RegisterStartResponse>

    @POST("api/auth/register/verify-otp")
    suspend fun verifyOtp(@Body request: VerifyOtpRequest): Response<User>

    @POST("api/auth/register/resend-otp")
    suspend fun resendOtp(@Body request: ResendOtpRequest): Response<BaseResponse>

    @GET("api/users/{nic}")
    suspend fun getUser(@Path("nic") nic: String): Response<User>

    @PATCH("api/users/{nic}/profile")
    suspend fun updateProfile(
        @Path("nic") nic: String,
        @Body request: UpdateProfileRequest
    ): Response<User>

    @PATCH("api/users/{nic}/deactivation-request")
    suspend fun requestDeactivation(@Path("nic") nic: String): Response<BaseResponse>

    @GET("api/reservations/summary")
    suspend fun getReservationSummary(): Response<ReservationSummaryResponse>

    @GET("api/reservations/mine")
    suspend fun getMyReservations(
        @Query("status") status: String? = null,
        @Query("pageSize") pageSize: Int = 20
    ): Response<ReservationPageResponse>

    @GET("api/stations")
    suspend fun getStations(): Response<List<SolarStation>>
}
