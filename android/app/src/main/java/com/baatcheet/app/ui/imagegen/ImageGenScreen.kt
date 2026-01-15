package com.baatcheet.app.ui.imagegen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import android.content.ContentValues
import android.graphics.Bitmap
import android.os.Environment
import android.provider.MediaStore
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.URL

/**
 * Image Generation Screen
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ImageGenScreen(
    viewModel: ImageGenViewModel = hiltViewModel(),
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    
    var prompt by remember { mutableStateOf("") }
    var selectedStyle by remember { mutableStateOf<String?>(null) }
    var selectedAspectRatio by remember { mutableStateOf("1:1") }
    var enhancePrompt by remember { mutableStateOf(true) }
    
    val aspectRatios = listOf(
        "1:1" to "Square",
        "16:9" to "Landscape",
        "9:16" to "Portrait",
        "4:3" to "Standard"
    )
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Image Generation", fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.White,
                    titleContentColor = Color.Black
                )
            )
        },
        containerColor = Color.White
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // Status card
            uiState.status?.let { status ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFF0FDF4)
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.AutoAwesome,
                            contentDescription = null,
                            tint = Color(0xFF22C55E)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                "Remaining: ${status.remainingToday}/${status.dailyLimit}",
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                "Tier: ${status.tier}",
                                fontSize = 12.sp,
                                color = Color.Gray
                            )
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(20.dp))
            }
            
            // Prompt input
            Text(
                "Describe your image",
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = Color.Black
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = prompt,
                onValueChange = { prompt = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("A futuristic city with flying cars...") },
                minLines = 3,
                maxLines = 5,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFF22C55E),
                    unfocusedBorderColor = Color(0xFFE5E7EB)
                )
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Checkbox(
                    checked = enhancePrompt,
                    onCheckedChange = { enhancePrompt = it },
                    colors = CheckboxDefaults.colors(
                        checkedColor = Color(0xFF22C55E)
                    )
                )
                Text("Enhance prompt with AI", fontSize = 14.sp)
            }
            
            Spacer(modifier = Modifier.height(20.dp))
            
            // Styles
            if (uiState.styles.isNotEmpty()) {
                Text(
                    "Style",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.Black
                )
                Spacer(modifier = Modifier.height(8.dp))
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(uiState.styles) { style ->
                        StyleChip(
                            name = style.name,
                            isSelected = selectedStyle == style.id,
                            onClick = { selectedStyle = if (selectedStyle == style.id) null else style.id }
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(20.dp))
            }
            
            // Aspect Ratio
            Text(
                "Aspect Ratio",
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = Color.Black
            )
            Spacer(modifier = Modifier.height(8.dp))
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(aspectRatios) { (ratio, label) ->
                    AspectRatioChip(
                        ratio = ratio,
                        label = label,
                        isSelected = selectedAspectRatio == ratio,
                        onClick = { selectedAspectRatio = ratio }
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Generate button
            Button(
                onClick = {
                    if (prompt.isNotBlank()) {
                        viewModel.generateImage(
                            prompt = prompt,
                            style = selectedStyle,
                            aspectRatio = selectedAspectRatio,
                            enhancePrompt = enhancePrompt
                        )
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                enabled = prompt.isNotBlank() && !uiState.isGenerating && (uiState.status?.canGenerate != false),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF22C55E)
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                if (uiState.isGenerating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Generating...")
                } else {
                    Icon(Icons.Default.AutoAwesome, null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Generate Image")
                }
            }
            
            // Error message
            uiState.error?.let { error ->
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    error,
                    color = Color.Red,
                    fontSize = 14.sp,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center
                )
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Generated image
            uiState.generatedImage?.let { image ->
                Text(
                    "Generated Image",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.Black
                )
                Spacer(modifier = Modifier.height(12.dp))
                Box(modifier = Modifier.fillMaxWidth()) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                    ) {
                        AsyncImage(
                            model = image.imageUrl,
                            contentDescription = "Generated image",
                            modifier = Modifier
                                .fillMaxWidth()
                                .aspectRatio(getAspectRatioFloat(selectedAspectRatio)),
                            contentScale = ContentScale.Crop
                        )
                    }
                    
                    // Download button overlay
                    val context = LocalContext.current
                    val scope = rememberCoroutineScope()
                    IconButton(
                        onClick = {
                            scope.launch {
                                downloadImage(context, image.imageUrl, image.prompt)
                            }
                        },
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp)
                            .background(Color.Black.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                    ) {
                        Icon(
                            imageVector = Icons.Default.Download,
                            contentDescription = "Download",
                            tint = Color.White
                        )
                    }
                }
                
                // Enhanced prompt if available
                image.enhancedPrompt?.let { enhanced ->
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        "Enhanced Prompt:",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.Gray
                    )
                    Text(
                        enhanced,
                        fontSize = 13.sp,
                        color = Color.Black.copy(alpha = 0.7f),
                        lineHeight = 18.sp
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // History
            if (uiState.history.isNotEmpty()) {
                Text(
                    "Recent Generations",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.Black
                )
                Spacer(modifier = Modifier.height(12.dp))
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.heightIn(max = 400.dp)
                ) {
                    items(uiState.history.take(6)) { image ->
                        AsyncImage(
                            model = image.imageUrl,
                            contentDescription = "History image",
                            modifier = Modifier
                                .aspectRatio(1f)
                                .clip(RoundedCornerShape(12.dp)),
                            contentScale = ContentScale.Crop
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StyleChip(
    name: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(if (isSelected) Color(0xFF22C55E) else Color(0xFFF3F4F6))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) { onClick() }
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Text(
            name,
            fontSize = 14.sp,
            color = if (isSelected) Color.White else Color.Black
        )
    }
}

@Composable
private fun AspectRatioChip(
    ratio: String,
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .border(
                width = if (isSelected) 2.dp else 1.dp,
                color = if (isSelected) Color(0xFF22C55E) else Color(0xFFE5E7EB),
                shape = RoundedCornerShape(12.dp)
            )
            .background(if (isSelected) Color(0xFFF0FDF4) else Color.White)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) { onClick() }
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(ratio, fontWeight = FontWeight.Medium, fontSize = 14.sp)
        Text(label, fontSize = 11.sp, color = Color.Gray)
    }
}

private fun getAspectRatioFloat(ratio: String): Float {
    return when (ratio) {
        "16:9" -> 16f / 9f
        "9:16" -> 9f / 16f
        "4:3" -> 4f / 3f
        else -> 1f
    }
}

/**
 * Download image to device gallery
 */
private suspend fun downloadImage(context: android.content.Context, imageUrl: String, prompt: String) {
    try {
        withContext(Dispatchers.IO) {
            // Download bitmap from URL
            val url = URL(imageUrl)
            val connection = url.openConnection()
            connection.connect()
            val inputStream = connection.getInputStream()
            val bitmap = android.graphics.BitmapFactory.decodeStream(inputStream)
            inputStream.close()
            
            // Generate filename
            val filename = "BaatCheet_${System.currentTimeMillis()}.png"
            
            // Save to gallery using MediaStore
            val contentValues = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, filename)
                put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/BaatCheet")
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }
            
            val resolver = context.contentResolver
            val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
            
            uri?.let {
                resolver.openOutputStream(it)?.use { outputStream ->
                    bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
                }
                
                contentValues.clear()
                contentValues.put(MediaStore.Images.Media.IS_PENDING, 0)
                resolver.update(uri, contentValues, null, null)
            }
            
            withContext(Dispatchers.Main) {
                android.widget.Toast.makeText(context, "Image saved to gallery!", android.widget.Toast.LENGTH_SHORT).show()
            }
        }
    } catch (e: Exception) {
        withContext(Dispatchers.Main) {
            android.widget.Toast.makeText(context, "Failed to save image: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
        }
    }
}
