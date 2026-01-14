package com.baatcheet.app.data.remote.api

import com.baatcheet.app.data.remote.dto.AuthResponseDto
import com.baatcheet.app.data.remote.dto.ResendCodeRequestDto
import com.baatcheet.app.data.remote.dto.SignInRequestDto
import com.baatcheet.app.data.remote.dto.SignUpRequestDto
import com.baatcheet.app.data.remote.dto.VerifyEmailRequestDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

/**
 * Auth API Interface for Retrofit
 * 
 * Defines all authentication-related API endpoints.
 */
interface AuthApi {
    
    @POST("mobile/auth/signin")
    suspend fun signIn(@Body request: SignInRequestDto): Response<AuthResponseDto>
    
    @POST("mobile/auth/signup")
    suspend fun signUp(@Body request: SignUpRequestDto): Response<AuthResponseDto>
    
    @POST("mobile/auth/verify-email")
    suspend fun verifyEmail(@Body request: VerifyEmailRequestDto): Response<AuthResponseDto>
    
    @POST("mobile/auth/resend-code")
    suspend fun resendVerificationCode(@Body request: ResendCodeRequestDto): Response<AuthResponseDto>
    
    @POST("mobile/auth/logout")
    suspend fun logout(
        @Header("Authorization") token: String
    ): Response<AuthResponseDto>
}
