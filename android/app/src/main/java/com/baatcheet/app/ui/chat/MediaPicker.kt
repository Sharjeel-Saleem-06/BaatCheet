package com.baatcheet.app.ui.chat

import android.Manifest
import android.content.Context
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
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
 * Allowed document MIME types (NO videos, NO audio)
 */
private val ALLOWED_DOCUMENT_TYPES = arrayOf(
    // PDF
    "application/pdf",
    // Plain text
    "text/plain",
    "text/markdown",
    "text/csv",
    "text/html",
    "text/xml",
    // Microsoft Office
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    // JSON
    "application/json",
    // XML
    "application/xml",
)

/**
 * Allowed image MIME types
 */
private val ALLOWED_IMAGE_TYPES = arrayOf(
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
)

/**
 * Check if a MIME type is an allowed document type
 */
private fun isAllowedDocument(mimeType: String?): Boolean {
    if (mimeType == null) return false
    return ALLOWED_DOCUMENT_TYPES.any { it.equals(mimeType, ignoreCase = true) } ||
           mimeType.startsWith("text/")
}

/**
 * Check if a MIME type is an allowed image type
 */
private fun isAllowedImage(mimeType: String?): Boolean {
    if (mimeType == null) return false
    return ALLOWED_IMAGE_TYPES.any { it.equals(mimeType, ignoreCase = true) } ||
           mimeType.startsWith("image/")
}

/**
 * Check if a MIME type is a video (NOT allowed)
 */
private fun isVideo(mimeType: String?): Boolean {
    return mimeType?.startsWith("video/") == true
}

/**
 * Check if a MIME type is audio (NOT allowed for documents)
 */
private fun isAudio(mimeType: String?): Boolean {
    return mimeType?.startsWith("audio/") == true
}

/**
 * Get MIME type from URI
 */
private fun getMimeType(context: Context, uri: Uri): String? {
    return context.contentResolver.getType(uri) ?: run {
        // Try to get from file extension
        val extension = MimeTypeMap.getFileExtensionFromUrl(uri.toString())
        MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
    }
}

/**
 * Get filename from URI
 */
private fun getFileName(context: Context, uri: Uri): String {
    var name = "file_${System.currentTimeMillis()}"
    
    context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (nameIndex >= 0 && cursor.moveToFirst()) {
            name = cursor.getString(nameIndex) ?: name
        }
    }
    
    return name
}

/**
 * Media Picker Hook
 * Provides camera, gallery, and file picking functionality
 * With strict file type validation
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
    
    // Photo picker launcher (Android 13+) - IMAGES ONLY
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        uri?.let { selectedUri ->
            val mimeType = getMimeType(context, selectedUri)
            when {
                isVideo(mimeType) -> {
                    Toast.makeText(context, "Videos are not supported. Please select an image.", Toast.LENGTH_LONG).show()
                }
                isAllowedImage(mimeType) -> {
                    onImageSelected(selectedUri)
                }
                else -> {
                    Toast.makeText(context, "Please select a valid image file (JPG, PNG, GIF, WebP)", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
    
    // Legacy gallery picker for older Android versions - IMAGES ONLY
    val legacyGalleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let { selectedUri ->
            val mimeType = getMimeType(context, selectedUri)
            when {
                isVideo(mimeType) -> {
                    Toast.makeText(context, "Videos are not supported. Please select an image.", Toast.LENGTH_LONG).show()
                }
                isAllowedImage(mimeType) -> {
                    onImageSelected(selectedUri)
                }
                else -> {
                    Toast.makeText(context, "Please select a valid image file (JPG, PNG, GIF, WebP)", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
    
    // File picker launcher - DOCUMENTS ONLY (NO videos, NO audio)
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        uri?.let { selectedUri ->
            val mimeType = getMimeType(context, selectedUri)
            val fileName = getFileName(context, selectedUri)
            
            when {
                isVideo(mimeType) -> {
                    Toast.makeText(
                        context, 
                        "Videos are not supported.\nPlease select a document (PDF, DOC, TXT, etc.)", 
                        Toast.LENGTH_LONG
                    ).show()
                }
                isAudio(mimeType) -> {
                    Toast.makeText(
                        context, 
                        "Audio files are not supported.\nPlease select a document (PDF, DOC, TXT, etc.)", 
                        Toast.LENGTH_LONG
                    ).show()
                }
                isAllowedImage(mimeType) -> {
                    // If user selected an image from file picker, redirect to image handler
                    Toast.makeText(context, "Image selected: $fileName", Toast.LENGTH_SHORT).show()
                    onImageSelected(selectedUri)
                }
                isAllowedDocument(mimeType) -> {
                    Toast.makeText(context, "Document selected: $fileName", Toast.LENGTH_SHORT).show()
                    onFileSelected(selectedUri)
                }
                else -> {
                    Toast.makeText(
                        context, 
                        "Unsupported file type: ${mimeType ?: "unknown"}\n\nSupported: PDF, DOC, TXT, CSV, JSON, XML", 
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }
    
    return remember {
        MediaPickerActions(
            onCameraClick = {
                cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
            },
            onGalleryClick = {
                // Use photo picker (images only) - explicitly request ImageOnly
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    photoPickerLauncher.launch(
                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                    )
                } else {
                    // Legacy: request only images
                    legacyGalleryLauncher.launch("image/*")
                }
            },
            onFileClick = {
                // Open document picker with ONLY document types (no video, no audio)
                filePickerLauncher.launch(ALLOWED_DOCUMENT_TYPES)
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
