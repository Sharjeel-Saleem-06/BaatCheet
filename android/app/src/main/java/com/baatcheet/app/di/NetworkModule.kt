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
import javax.inject.Singleton

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
    fun provideAuthInterceptor(prefs: SharedPreferences): Interceptor {
        return Interceptor { chain ->
            val token = prefs.getString(TOKEN_KEY, null)
            val request = if (token != null) {
                chain.request().newBuilder()
                    .addHeader("Authorization", "Bearer $token")
                    .addHeader("Content-Type", "application/json")
                    .build()
            } else {
                chain.request().newBuilder()
                    .addHeader("Content-Type", "application/json")
                    .build()
            }
            chain.proceed(request)
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
        authInterceptor: Interceptor,
        loggingInterceptor: HttpLoggingInterceptor
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
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
