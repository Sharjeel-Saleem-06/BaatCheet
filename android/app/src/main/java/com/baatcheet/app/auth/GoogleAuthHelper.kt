package com.baatcheet.app.auth

import android.content.Context
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Google Authentication Helper
 * Uses Credential Manager API for Google Sign-In
 * 
 * Uses the WEB Client ID (not Android) for server-side verification
 */
@Singleton
class GoogleAuthHelper @Inject constructor(
    private val context: Context
) {
    companion object {
        private const val TAG = "GoogleAuthHelper"
        
        // Web Client ID from Google Cloud Console
        // Use this for server-side token verification
        const val WEB_CLIENT_ID = "1042263517850-1iibs7u9ddhq9dq91cbe8prqlj1q858o.apps.googleusercontent.com"
    }
    
    private val credentialManager = CredentialManager.create(context)
    
    /**
     * Sign in with Google using Credential Manager
     * Returns the ID token on success
     */
    suspend fun signInWithGoogle(): GoogleSignInResult = withContext(Dispatchers.Main) {
        try {
            Log.d(TAG, "Starting Google Sign-In...")
            
            val googleIdOption = GetGoogleIdOption.Builder()
                .setServerClientId(WEB_CLIENT_ID)
                .setFilterByAuthorizedAccounts(false) // Show all accounts, not just authorized
                .setAutoSelectEnabled(true) // Auto-select if only one account
                .build()
            
            val request = GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
                .build()
            
            val result = credentialManager.getCredential(
                request = request,
                context = context as android.app.Activity
            )
            
            handleSignInResponse(result)
        } catch (e: GetCredentialException) {
            Log.e(TAG, "Google Sign-In failed", e)
            GoogleSignInResult.Error(
                message = e.message ?: "Google Sign-In failed",
                exception = e
            )
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error during Google Sign-In", e)
            GoogleSignInResult.Error(
                message = e.message ?: "An unexpected error occurred",
                exception = e
            )
        }
    }
    
    private fun handleSignInResponse(result: GetCredentialResponse): GoogleSignInResult {
        val credential = result.credential
        
        return when (credential) {
            is CustomCredential -> {
                if (credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    try {
                        val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                        
                        Log.d(TAG, "Google Sign-In successful: ${googleIdTokenCredential.displayName}")
                        
                        GoogleSignInResult.Success(
                            idToken = googleIdTokenCredential.idToken,
                            displayName = googleIdTokenCredential.displayName,
                            email = googleIdTokenCredential.id,
                            photoUrl = googleIdTokenCredential.profilePictureUri?.toString(),
                            givenName = googleIdTokenCredential.givenName,
                            familyName = googleIdTokenCredential.familyName
                        )
                    } catch (e: GoogleIdTokenParsingException) {
                        Log.e(TAG, "Failed to parse Google ID token", e)
                        GoogleSignInResult.Error(
                            message = "Failed to parse Google credentials",
                            exception = e
                        )
                    }
                } else {
                    Log.e(TAG, "Unexpected credential type: ${credential.type}")
                    GoogleSignInResult.Error(
                        message = "Unexpected credential type received"
                    )
                }
            }
            else -> {
                Log.e(TAG, "Unexpected credential class: ${credential.javaClass}")
                GoogleSignInResult.Error(
                    message = "Unexpected credential type"
                )
            }
        }
    }
}

/**
 * Result sealed class for Google Sign-In
 */
sealed class GoogleSignInResult {
    data class Success(
        val idToken: String,
        val displayName: String?,
        val email: String,
        val photoUrl: String?,
        val givenName: String?,
        val familyName: String?
    ) : GoogleSignInResult()
    
    data class Error(
        val message: String,
        val exception: Exception? = null
    ) : GoogleSignInResult()
    
    object Cancelled : GoogleSignInResult()
}
