package com.baatcheet.app.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.baatcheet.app.domain.model.AuthResult
import com.baatcheet.app.domain.model.User
import com.baatcheet.app.domain.usecase.auth.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Auth ViewModel
 * 
 * Follows MVVM pattern with Clean Architecture.
 * Uses StateFlow for reactive UI updates.
 * All business logic is delegated to UseCases.
 */
@HiltViewModel
class AuthViewModel @Inject constructor(
    private val signInUseCase: SignInUseCase,
    private val signUpUseCase: SignUpUseCase,
    private val verifyEmailUseCase: VerifyEmailUseCase,
    private val logoutUseCase: LogoutUseCase,
    private val getCurrentUserUseCase: GetCurrentUserUseCase,
    private val isAuthenticatedUseCase: IsAuthenticatedUseCase
) : ViewModel() {
    
    // UI State
    private val _state = MutableStateFlow(AuthState())
    val state: StateFlow<AuthState> = _state.asStateFlow()
    
    // Pending email for verification
    private var pendingEmail: String? = null
    
    init {
        // Check if user is already authenticated
        if (isAuthenticatedUseCase()) {
            _state.update { 
                it.copy(
                    isAuthenticated = true,
                    currentUser = getCurrentUserUseCase()
                ) 
            }
        }
    }
    
    /**
     * Handle UI events
     */
    fun onEvent(event: AuthEvent) {
        when (event) {
            is AuthEvent.SignIn -> signIn(event.email, event.password)
            is AuthEvent.SignUp -> signUp(event.email, event.password, event.firstName, event.lastName)
            is AuthEvent.VerifyEmail -> verifyEmail(event.code)
            is AuthEvent.ResendCode -> resendCode()
            is AuthEvent.Logout -> logout()
            is AuthEvent.ClearError -> clearError()
            is AuthEvent.SetPendingEmail -> setPendingEmail(event.email)
        }
    }
    
    private fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            
            when (val result = signInUseCase(email, password)) {
                is AuthResult.Success -> {
                    _state.update { 
                        it.copy(
                            isLoading = false,
                            isAuthenticated = true,
                            currentUser = result.user,
                            error = null
                        )
                    }
                }
                is AuthResult.NeedsVerification -> {
                    pendingEmail = email
                    _state.update { 
                        it.copy(
                            isLoading = false,
                            needsVerification = true,
                            pendingEmail = email
                        )
                    }
                }
                is AuthResult.Failure -> {
                    _state.update { 
                        it.copy(
                            isLoading = false,
                            error = result.error.message ?: "Sign in failed"
                        )
                    }
                }
            }
        }
    }
    
    private fun signUp(email: String, password: String, firstName: String?, lastName: String?) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            
            when (val result = signUpUseCase(email, password, firstName, lastName)) {
                is AuthResult.Success -> {
                    _state.update { 
                        it.copy(
                            isLoading = false,
                            isAuthenticated = true,
                            currentUser = result.user,
                            error = null
                        )
                    }
                }
                is AuthResult.NeedsVerification -> {
                    pendingEmail = email
                    _state.update { 
                        it.copy(
                            isLoading = false,
                            needsVerification = true,
                            pendingEmail = email
                        )
                    }
                }
                is AuthResult.Failure -> {
                    _state.update { 
                        it.copy(
                            isLoading = false,
                            error = result.error.message ?: "Sign up failed"
                        )
                    }
                }
            }
        }
    }
    
    private fun verifyEmail(code: String) {
        val email = pendingEmail ?: _state.value.pendingEmail ?: return
        
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            
            when (val result = verifyEmailUseCase(email, code)) {
                is AuthResult.Success -> {
                    pendingEmail = null
                    _state.update { 
                        it.copy(
                            isLoading = false,
                            isAuthenticated = true,
                            needsVerification = false,
                            currentUser = result.user,
                            pendingEmail = null,
                            error = null
                        )
                    }
                }
                is AuthResult.NeedsVerification -> {
                    _state.update { 
                        it.copy(
                            isLoading = false,
                            error = "Invalid code. Please try again."
                        )
                    }
                }
                is AuthResult.Failure -> {
                    _state.update { 
                        it.copy(
                            isLoading = false,
                            error = result.error.message ?: "Verification failed"
                        )
                    }
                }
            }
        }
    }
    
    private fun resendCode() {
        // Note: This would need repository method to be exposed
        // For now, reset the countdown
        _state.update { it.copy(error = null) }
    }
    
    private fun logout() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            logoutUseCase()
            _state.update { 
                AuthState() // Reset to initial state
            }
        }
    }
    
    private fun clearError() {
        _state.update { it.copy(error = null) }
    }
    
    private fun setPendingEmail(email: String) {
        pendingEmail = email
        _state.update { it.copy(pendingEmail = email) }
    }
}

/**
 * Auth UI State
 */
data class AuthState(
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val needsVerification: Boolean = false,
    val currentUser: User? = null,
    val pendingEmail: String? = null,
    val error: String? = null
)

/**
 * Auth UI Events
 */
sealed class AuthEvent {
    data class SignIn(val email: String, val password: String) : AuthEvent()
    data class SignUp(
        val email: String,
        val password: String,
        val firstName: String? = null,
        val lastName: String? = null
    ) : AuthEvent()
    data class VerifyEmail(val code: String) : AuthEvent()
    data object ResendCode : AuthEvent()
    data object Logout : AuthEvent()
    data object ClearError : AuthEvent()
    data class SetPendingEmail(val email: String) : AuthEvent()
}
