package com.ead.solargrid.api

import android.content.Context
import okhttp3.Interceptor
import okhttp3.Response
import com.ead.solargrid.database.SessionManager

class AuthInterceptor(private val context: Context) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val sessionManager = SessionManager(context)
        val token = sessionManager.fetchAuthToken()

        val requestBuilder = chain.request().newBuilder()

        if (token != null) {
            requestBuilder.addHeader("Authorization", "Bearer $token")
        }

        return chain.proceed(requestBuilder.build())
    }
}
