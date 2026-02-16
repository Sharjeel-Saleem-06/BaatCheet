package com.baatcheet.app.di

import android.content.Context
import android.content.SharedPreferences
import com.baatcheet.app.data.remote.api.BaatCheetApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton
import javax.inject.Named

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    private const val AUTH_PREFS = "baatcheet_auth"
    private const val TOKEN_KEY = "auth_token"
    
    @Provides
    @Singleton
    fun provideAuthPreferences(@ApplicationContext context: Context): SharedPreferences {
        return context.getSharedPreferences(AUTH_PREFS, Context.MODE_PRIVATE)
    }
    
    @Provides
    @Singleton
    fun provideSessionManager(
        @ApplicationContext context: Context,
        prefs: SharedPreferences
    ): SessionManager {
        return SessionManager(context, prefs)
    }
    
    @Provides
    @Singleton
    @Named("auth")
    fun provideAuthInterceptor(prefs: SharedPreferences): Interceptor {
        return Interceptor { chain ->
            val token = prefs.getString(TOKEN_KEY, null)
            val requestBuilder = chain.request().newBuilder()
                .addHeader("Content-Type", "application/json")
                .addHeader("X-Client-App", "BaatCheet-Android") // Identify as official app
            
            if (token != null) {
                requestBuilder.addHeader("Authorization", "Bearer $token")
            }
            
            chain.proceed(requestBuilder.build())
        }
    }
    
    @Provides
    @Singleton
    @Named("session")
    fun provideSessionInterceptor(sessionManager: SessionManager): Interceptor {
        return Interceptor { chain ->
            val response = chain.proceed(chain.request())
            
            // Check for 401 Unauthorized - session expired
            if (response.code == 401) {
                // Don't trigger for login/signup endpoints
                val path = chain.request().url.encodedPath
                if (!path.contains("signin") && 
                    !path.contains("signup") && 
                    !path.contains("google") &&
                    !path.contains("verify")) {
                    sessionManager.onSessionExpired()
                }
            }
            
            response
        }
    }
    
    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
    }
    
    @Provides
    @Singleton
    fun provideOkHttpClient(
        @Named("auth") authInterceptor: Interceptor,
        @Named("session") sessionInterceptor: Interceptor,
        loggingInterceptor: HttpLoggingInterceptor
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(sessionInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(120, TimeUnit.SECONDS)  // Increased for image generation
            .readTimeout(120, TimeUnit.SECONDS)     // Image generation can take 60-90 seconds
            .writeTimeout(120, TimeUnit.SECONDS)    // Allow longer uploads
            .build()
    }
    
    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BaatCheetApi.BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
    
    @Provides
    @Singleton
    fun provideBaatCheetApi(retrofit: Retrofit): BaatCheetApi {
        return retrofit.create(BaatCheetApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideAuthApi(retrofit: Retrofit): com.baatcheet.app.data.remote.api.AuthApi {
        return retrofit.create(com.baatcheet.app.data.remote.api.AuthApi::class.java)
    }
}
