package com.baatcheet.app.di

import com.baatcheet.app.data.local.AuthPreferences
import com.baatcheet.app.data.remote.api.AuthApi
import com.baatcheet.app.data.remote.api.BaatCheetApi
import com.baatcheet.app.data.repository.AuthRepositoryImpl
import com.baatcheet.app.data.repository.ChatRepository
import com.baatcheet.app.domain.repository.AuthRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {
    
    @Provides
    @Singleton
    fun provideChatRepository(api: BaatCheetApi): ChatRepository {
        return ChatRepository(api)
    }
    
    @Provides
    @Singleton
    fun provideAuthRepository(
        authApi: AuthApi,
        authPreferences: AuthPreferences
    ): AuthRepository {
        return AuthRepositoryImpl(authApi, authPreferences)
    }
}
