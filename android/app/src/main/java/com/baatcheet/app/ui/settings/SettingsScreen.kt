package com.baatcheet.app.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel

/**
 * Settings Screen - App preferences, API Keys, Webhooks, and Account
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel = hiltViewModel(),
    onBack: () -> Unit,
    onLogout: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val clipboardManager = LocalClipboardManager.current
    
    var showApiKeyDialog by remember { mutableStateOf(false) }
    var showWebhookDialog by remember { mutableStateOf(false) }
    var showDeleteAccountDialog by remember { mutableStateOf(false) }
    var showExportDataDialog by remember { mutableStateOf(false) }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", fontWeight = FontWeight.SemiBold) },
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
        containerColor = Color(0xFFF9FAFB)
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Account Section
            item {
                SettingsSection(title = "Account") {
                    SettingsItem(
                        icon = Icons.Default.Person,
                        title = "Profile",
                        subtitle = uiState.userEmail ?: "Not signed in",
                        onClick = { }
                    )
                    SettingsItem(
                        icon = Icons.Default.Logout,
                        title = "Sign Out",
                        onClick = onLogout,
                        tintColor = Color(0xFFEF4444)
                    )
                }
            }
            
            // API Keys Section
            item {
                SettingsSection(title = "Developer") {
                    SettingsItem(
                        icon = Icons.Default.Key,
                        title = "API Keys",
                        subtitle = "${uiState.apiKeys.size} keys",
                        onClick = { showApiKeyDialog = true }
                    )
                    SettingsItem(
                        icon = Icons.Default.Webhook,
                        title = "Webhooks",
                        subtitle = "${uiState.webhooks.size} webhooks",
                        onClick = { showWebhookDialog = true }
                    )
                }
            }
            
            // Preferences Section
            item {
                SettingsSection(title = "Preferences") {
                    SettingsToggleItem(
                        icon = Icons.Default.DarkMode,
                        title = "Dark Mode",
                        isChecked = uiState.darkModeEnabled,
                        onCheckedChange = { viewModel.toggleDarkMode() }
                    )
                    SettingsToggleItem(
                        icon = Icons.Default.Notifications,
                        title = "Notifications",
                        isChecked = uiState.notificationsEnabled,
                        onCheckedChange = { viewModel.toggleNotifications() }
                    )
                    SettingsToggleItem(
                        icon = Icons.Default.VoiceChat,
                        title = "Voice Input",
                        isChecked = uiState.voiceInputEnabled,
                        onCheckedChange = { viewModel.toggleVoiceInput() }
                    )
                }
            }
            
            // Data & Privacy Section
            item {
                SettingsSection(title = "Data & Privacy") {
                    SettingsItem(
                        icon = Icons.Default.Download,
                        title = "Export Data",
                        subtitle = "Download all your data",
                        onClick = { showExportDataDialog = true }
                    )
                    SettingsItem(
                        icon = Icons.Default.DeleteForever,
                        title = "Delete Account",
                        subtitle = "Permanently delete your account",
                        onClick = { showDeleteAccountDialog = true },
                        tintColor = Color(0xFFEF4444)
                    )
                }
            }
            
            // About Section
            item {
                SettingsSection(title = "About") {
                    SettingsItem(
                        icon = Icons.Default.Info,
                        title = "Version",
                        subtitle = "1.0.0"
                    )
                    SettingsItem(
                        icon = Icons.Default.Policy,
                        title = "Privacy Policy",
                        onClick = { }
                    )
                    SettingsItem(
                        icon = Icons.Default.Description,
                        title = "Terms of Service",
                        onClick = { }
                    )
                }
            }
        }
    }
    
    // API Keys Dialog
    if (showApiKeyDialog) {
        ApiKeysDialog(
            apiKeys = uiState.apiKeys,
            isLoading = uiState.isLoadingApiKeys,
            onDismiss = { showApiKeyDialog = false },
            onCreate = { name -> viewModel.createApiKey(name) },
            onDelete = { id -> viewModel.deleteApiKey(id) },
            onCopy = { key -> clipboardManager.setText(AnnotatedString(key)) }
        )
    }
    
    // Webhooks Dialog
    if (showWebhookDialog) {
        WebhooksDialog(
            webhooks = uiState.webhooks,
            isLoading = uiState.isLoadingWebhooks,
            onDismiss = { showWebhookDialog = false },
            onCreate = { url, events -> viewModel.createWebhook(url, events) },
            onDelete = { id -> viewModel.deleteWebhook(id) },
            onTest = { id -> viewModel.testWebhook(id) }
        )
    }
    
    // Export Data Dialog
    if (showExportDataDialog) {
        AlertDialog(
            onDismissRequest = { showExportDataDialog = false },
            title = { Text("Export Data") },
            text = { 
                Text("This will generate a download of all your data including conversations, projects, and settings.")
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.exportData()
                        showExportDataDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E))
                ) {
                    Text("Export")
                }
            },
            dismissButton = {
                TextButton(onClick = { showExportDataDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
    
    // Delete Account Dialog
    if (showDeleteAccountDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteAccountDialog = false },
            title = { Text("Delete Account", color = Color(0xFFEF4444)) },
            text = { 
                Text("This action is permanent and cannot be undone. All your data will be deleted.")
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteAccount()
                        showDeleteAccountDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteAccountDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun SettingsSection(
    title: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Column {
        Text(
            title,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = Color.Gray,
            modifier = Modifier.padding(start = 16.dp, bottom = 8.dp)
        )
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(content = content)
        }
    }
}

@Composable
private fun SettingsItem(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    onClick: (() -> Unit)? = null,
    tintColor: Color = Color(0xFF22C55E)
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (onClick != null) {
                    Modifier.clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) { onClick() }
                } else Modifier
            )
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = tintColor,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                title,
                fontSize = 15.sp,
                color = Color.Black
            )
            subtitle?.let {
                Text(
                    it,
                    fontSize = 13.sp,
                    color = Color.Gray
                )
            }
        }
        if (onClick != null) {
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = Color.Gray,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

@Composable
private fun SettingsToggleItem(
    icon: ImageVector,
    title: String,
    isChecked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = Color(0xFF22C55E),
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Text(
            title,
            fontSize = 15.sp,
            color = Color.Black,
            modifier = Modifier.weight(1f)
        )
        Switch(
            checked = isChecked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = Color(0xFF22C55E),
                uncheckedThumbColor = Color.White,
                uncheckedTrackColor = Color.Gray.copy(alpha = 0.3f)
            )
        )
    }
}

@Composable
private fun ApiKeysDialog(
    apiKeys: List<ApiKeyItem>,
    isLoading: Boolean,
    onDismiss: () -> Unit,
    onCreate: (String) -> Unit,
    onDelete: (String) -> Unit,
    onCopy: (String) -> Unit
) {
    var newKeyName by remember { mutableStateOf("") }
    var showCreateForm by remember { mutableStateOf(false) }
    
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 500.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("API Keys", fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, "Close")
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                if (isLoading) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(100.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = Color(0xFF22C55E))
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.weight(1f, fill = false),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(apiKeys) { key ->
                            ApiKeyListItem(
                                key = key,
                                onDelete = { onDelete(key.id) },
                                onCopy = { key.keyPreview?.let { onCopy(it) } }
                            )
                        }
                        
                        if (apiKeys.isEmpty()) {
                            item {
                                Text(
                                    "No API keys yet",
                                    color = Color.Gray,
                                    modifier = Modifier.padding(vertical = 16.dp)
                                )
                            }
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                if (showCreateForm) {
                    OutlinedTextField(
                        value = newKeyName,
                        onValueChange = { newKeyName = it },
                        placeholder = { Text("API Key Name") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = { showCreateForm = false },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Cancel")
                        }
                        Button(
                            onClick = {
                                if (newKeyName.isNotBlank()) {
                                    onCreate(newKeyName)
                                    newKeyName = ""
                                    showCreateForm = false
                                }
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E))
                        ) {
                            Text("Create")
                        }
                    }
                } else {
                    Button(
                        onClick = { showCreateForm = true },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E))
                    ) {
                        Icon(Icons.Default.Add, null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Create API Key")
                    }
                }
            }
        }
    }
}

@Composable
private fun ApiKeyListItem(
    key: ApiKeyItem,
    onDelete: () -> Unit,
    onCopy: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(Color(0xFFF9FAFB))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(key.name ?: "Unnamed", fontWeight = FontWeight.Medium)
            key.keyPreview?.let {
                Text("...${it}", fontSize = 12.sp, color = Color.Gray)
            }
        }
        IconButton(onClick = onCopy, modifier = Modifier.size(32.dp)) {
            Icon(Icons.Default.ContentCopy, "Copy", modifier = Modifier.size(18.dp))
        }
        IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
            Icon(Icons.Default.Delete, "Delete", tint = Color.Red.copy(alpha = 0.7f), modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun WebhooksDialog(
    webhooks: List<WebhookItem>,
    isLoading: Boolean,
    onDismiss: () -> Unit,
    onCreate: (String, List<String>) -> Unit,
    onDelete: (String) -> Unit,
    onTest: (String) -> Unit
) {
    var newWebhookUrl by remember { mutableStateOf("") }
    var showCreateForm by remember { mutableStateOf(false) }
    val selectedEvents = remember { mutableStateListOf<String>() }
    
    val availableEvents = listOf(
        "message.created",
        "message.completed",
        "conversation.created",
        "conversation.archived"
    )
    
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 500.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Webhooks", fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, "Close")
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                if (isLoading) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(100.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = Color(0xFF22C55E))
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.weight(1f, fill = false),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(webhooks) { webhook ->
                            WebhookListItem(
                                webhook = webhook,
                                onDelete = { onDelete(webhook.id) },
                                onTest = { onTest(webhook.id) }
                            )
                        }
                        
                        if (webhooks.isEmpty()) {
                            item {
                                Text(
                                    "No webhooks yet",
                                    color = Color.Gray,
                                    modifier = Modifier.padding(vertical = 16.dp)
                                )
                            }
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                if (showCreateForm) {
                    OutlinedTextField(
                        value = newWebhookUrl,
                        onValueChange = { newWebhookUrl = it },
                        placeholder = { Text("Webhook URL (https://...)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Events:", fontSize = 12.sp, color = Color.Gray)
                    availableEvents.forEach { event ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    if (event in selectedEvents) {
                                        selectedEvents.remove(event)
                                    } else {
                                        selectedEvents.add(event)
                                    }
                                }
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = event in selectedEvents,
                                onCheckedChange = {
                                    if (it) selectedEvents.add(event) else selectedEvents.remove(event)
                                }
                            )
                            Text(event, fontSize = 13.sp)
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = { showCreateForm = false },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Cancel")
                        }
                        Button(
                            onClick = {
                                if (newWebhookUrl.isNotBlank() && selectedEvents.isNotEmpty()) {
                                    onCreate(newWebhookUrl, selectedEvents.toList())
                                    newWebhookUrl = ""
                                    selectedEvents.clear()
                                    showCreateForm = false
                                }
                            },
                            modifier = Modifier.weight(1f),
                            enabled = newWebhookUrl.isNotBlank() && selectedEvents.isNotEmpty(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E))
                        ) {
                            Text("Create")
                        }
                    }
                } else {
                    Button(
                        onClick = { showCreateForm = true },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E))
                    ) {
                        Icon(Icons.Default.Add, null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Create Webhook")
                    }
                }
            }
        }
    }
}

@Composable
private fun WebhookListItem(
    webhook: WebhookItem,
    onDelete: () -> Unit,
    onTest: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(Color(0xFFF9FAFB))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                webhook.url ?: "Unknown URL",
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                "${webhook.events?.size ?: 0} events",
                fontSize = 12.sp,
                color = Color.Gray
            )
        }
        IconButton(onClick = onTest, modifier = Modifier.size(32.dp)) {
            Icon(Icons.Default.PlayArrow, "Test", tint = Color(0xFF22C55E), modifier = Modifier.size(18.dp))
        }
        IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
            Icon(Icons.Default.Delete, "Delete", tint = Color.Red.copy(alpha = 0.7f), modifier = Modifier.size(18.dp))
        }
    }
}

// Data classes
data class ApiKeyItem(
    val id: String,
    val name: String?,
    val keyPreview: String?,
    val isActive: Boolean
)

data class WebhookItem(
    val id: String,
    val url: String?,
    val events: List<String>?,
    val isActive: Boolean
)
