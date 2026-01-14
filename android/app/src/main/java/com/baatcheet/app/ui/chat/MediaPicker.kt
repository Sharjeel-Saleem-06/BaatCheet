package com.baatcheet.app.ui.chat

import android.Manifest
import android.content.Context
import android.net.Uri
import android.os.Build
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.FileProvider
import java.io.File

/**
 * Media Picker State
 */
data class MediaPickerState(
    val selectedImageUri: Uri? = null,
    val selectedFileUri: Uri? = null,
    val capturedImageUri: Uri? = null
)

/**
 * Media Picker Hook
 * Provides camera, gallery, and file picking functionality
 */
@Composable
fun rememberMediaPicker(
    onImageSelected: (Uri) -> Unit,
    onFileSelected: (Uri) -> Unit
): MediaPickerActions {
    val context = LocalContext.current
    var tempCameraUri by remember { mutableStateOf<Uri?>(null) }
    
    // Camera capture launcher
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success) {
            tempCameraUri?.let { uri ->
                onImageSelected(uri)
            }
        }
    }
    
    // Camera permission launcher
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            // Create temp file and launch camera
            val uri = createTempImageUri(context)
            tempCameraUri = uri
            cameraLauncher.launch(uri)
        } else {
            Toast.makeText(context, "Camera permission denied", Toast.LENGTH_SHORT).show()
        }
    }
    
    // Photo picker launcher (Android 13+) or legacy gallery picker
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        uri?.let { onImageSelected(it) }
    }
    
    // Legacy gallery picker for older Android versions
    val legacyGalleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let { onImageSelected(it) }
    }
    
    // File picker launcher
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        uri?.let { onFileSelected(it) }
    }
    
    return remember {
        MediaPickerActions(
            onCameraClick = {
                cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
            },
            onGalleryClick = {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    photoPickerLauncher.launch(
                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                    )
                } else {
                    legacyGalleryLauncher.launch("image/*")
                }
            },
            onFileClick = {
                filePickerLauncher.launch(arrayOf("*/*"))
            }
        )
    }
}

/**
 * Media Picker Actions
 */
data class MediaPickerActions(
    val onCameraClick: () -> Unit,
    val onGalleryClick: () -> Unit,
    val onFileClick: () -> Unit
)

/**
 * Create a temporary file URI for camera capture
 */
private fun createTempImageUri(context: Context): Uri {
    val tempFile = File.createTempFile(
        "camera_${System.currentTimeMillis()}_",
        ".jpg",
        context.cacheDir
    )
    return FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        tempFile
    )
}
