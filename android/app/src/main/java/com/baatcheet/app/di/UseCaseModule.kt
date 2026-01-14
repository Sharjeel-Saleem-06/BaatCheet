package com.baatcheet.app.di

import com.baatcheet.app.domain.repository.AuthRepository
import com.baatcheet.app.domain.usecase.auth.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

/**
 * UseCase Module
 * 
 * Provides UseCase instances for dependency injection.
 */
@Module
@InstallIn(SingletonComponent::class)
object UseCaseModule {
    
    @Provides
    fun provideSignInUseCase(authRepository: AuthRepository): SignInUseCase {
        return SignInUseCase(authRepository)
    }
    
    @Provides
    fun provideSignUpUseCase(authRepository: AuthRepository): SignUpUseCase {
        return SignUpUseCase(authRepository)
    }
    
    @Provides
    fun provideVerifyEmailUseCase(authRepository: AuthRepository): VerifyEmailUseCase {
        return VerifyEmailUseCase(authRepository)
    }
    
    @Provides
    fun provideLogoutUseCase(authRepository: AuthRepository): LogoutUseCase {
        return LogoutUseCase(authRepository)
    }
    
    @Provides
    fun provideGetCurrentUserUseCase(authRepository: AuthRepository): GetCurrentUserUseCase {
        return GetCurrentUserUseCase(authRepository)
    }
    
    @Provides
    fun provideIsAuthenticatedUseCase(authRepository: AuthRepository): IsAuthenticatedUseCase {
        return IsAuthenticatedUseCase(authRepository)
    }
}
