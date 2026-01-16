package com.baatcheet.app.ui.settings

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Colors
private val WhiteBackground = Color(0xFFFFFFFF)
private val GreenAccent = Color(0xFF34C759)
private val DarkText = Color(0xFF1C1C1E)
private val GrayText = Color(0xFF8E8E93)
private val LightGray = Color(0xFFF2F2F7)
private val InputBorder = Color(0xFFE5E5EA)
private val RedColor = Color(0xFFFF3B30)
private val OrangeColor = Color(0xFFFF9500)
private val BlueColor = Color(0xFF007AFF)
private val PurpleColor = Color(0xFF7C4DFF)

data class UserSettings(
    val displayName: String = "",
    val email: String = "",
    val avatar: String? = null,
    val tier: String = "free",
    val customInstructions: String = "",
    val imageGenerationsToday: Int = 0,
    val imageGenerationsLimit: Int = 2,
    val totalMessages: Int = 0,
    val totalConversations: Int = 0,
    val memberSince: String = ""
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    userSettings: UserSettings,
    onBack: () -> Unit,
    onLogout: () -> Unit,
    onDeleteAccount: () -> Unit,
    onClearHistory: () -> Unit = {},
    onPrivacyPolicy: () -> Unit = {},
    onTermsOfService: () -> Unit = {},
    onContactSupport: () -> Unit = {},
    onUpgrade: () -> Unit = {},
    onChangePassword: (currentPassword: String, newPassword: String) -> Unit = { _, _ -> },
    onSaveCustomInstructions: (String) -> Unit = {},
    onUpdateProfilePicture: () -> Unit = {},
    onUpdateDisplayName: (String) -> Unit = {}
) {
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showDeleteAccountDialog by remember { mutableStateOf(false) }
    var showClearHistoryDialog by remember { mutableStateOf(false) }
    var showChangePasswordDialog by remember { mutableStateOf(false) }
    var showCustomInstructionsDialog by remember { mutableStateOf(false) }
    var showEditProfileDialog by remember { mutableStateOf(false) }
    var expandedSection by remember { mutableStateOf<String?>(null) }
    
    // Logout Confirmation Dialog
    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            containerColor = WhiteBackground,
            shape = RoundedCornerShape(16.dp),
            icon = {
                Icon(
                    Icons.Default.Logout,
                    contentDescription = null,
                    tint = OrangeColor,
                    modifier = Modifier.size(32.dp)
                )
            },
            title = { Text("Sign Out", fontWeight = FontWeight.SemiBold) },
            text = { Text("Are you sure you want to sign out? You'll need to sign in again to access your chats.") },
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutDialog = false
                        onLogout()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = OrangeColor)
                ) {
                    Text("Sign Out")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel", color = GrayText)
                }
            }
        )
    }
    
    // Delete Account Dialog
    if (showDeleteAccountDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteAccountDialog = false },
            containerColor = WhiteBackground,
            shape = RoundedCornerShape(16.dp),
            icon = {
                Icon(
                    Icons.Default.DeleteForever,
                    contentDescription = null,
                    tint = RedColor,
                    modifier = Modifier.size(32.dp)
                )
            },
            title = { Text("Delete Account", fontWeight = FontWeight.SemiBold, color = RedColor) },
            text = { Text("This action is permanent and cannot be undone. All your data, chats, and projects will be permanently deleted.") },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteAccountDialog = false
                        onDeleteAccount()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = RedColor)
                ) {
                    Text("Delete Account")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteAccountDialog = false }) {
                    Text("Cancel", color = GrayText)
                }
            }
        )
    }
    
    // Clear History Dialog
    if (showClearHistoryDialog) {
        AlertDialog(
            onDismissRequest = { showClearHistoryDialog = false },
            containerColor = WhiteBackground,
            shape = RoundedCornerShape(16.dp),
            icon = {
                Icon(
                    Icons.Default.History,
                    contentDescription = null,
                    tint = OrangeColor,
                    modifier = Modifier.size(32.dp)
                )
            },
            title = { Text("Clear Chat History", fontWeight = FontWeight.SemiBold) },
            text = { Text("This will delete all your conversations. This action cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        showClearHistoryDialog = false
                        onClearHistory()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = OrangeColor)
                ) {
                    Text("Clear History")
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearHistoryDialog = false }) {
                    Text("Cancel", color = GrayText)
                }
            }
        )
    }
    
    // Change Password Dialog
    if (showChangePasswordDialog) {
        ChangePasswordDialog(
            onDismiss = { showChangePasswordDialog = false },
            onChangePassword = { currentPass, newPass ->
                showChangePasswordDialog = false
                onChangePassword(currentPass, newPass)
            }
        )
    }
    
    // Custom Instructions Dialog
    if (showCustomInstructionsDialog) {
        CustomInstructionsDialog(
            currentInstructions = userSettings.customInstructions,
            onDismiss = { showCustomInstructionsDialog = false },
            onSave = { instructions ->
                showCustomInstructionsDialog = false
                onSaveCustomInstructions(instructions)
            }
        )
    }
    
    // Edit Profile Dialog
    if (showEditProfileDialog) {
        EditProfileDialog(
            currentName = userSettings.displayName,
            onDismiss = { showEditProfileDialog = false },
            onUpdateName = { newName ->
                showEditProfileDialog = false
                onUpdateDisplayName(newName)
            },
            onUpdatePicture = {
                showEditProfileDialog = false
                onUpdateProfilePicture()
            }
        )
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = WhiteBackground,
                    titleContentColor = DarkText
                )
            )
        },
        containerColor = LightGray
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Profile Section
            item {
                SettingsCard {
                    ProfileSection(
                        displayName = userSettings.displayName,
                        email = userSettings.email,
                        tier = userSettings.tier,
                        memberSince = userSettings.memberSince,
                        onUpgrade = onUpgrade,
                        onEditProfile = { showEditProfileDialog = true }
                    )
                }
            }
            
            // Usage Stats
            item {
                SettingsCard {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Usage",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = GrayText,
                            modifier = Modifier.padding(bottom = 12.dp)
                        )
                        
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            UsageStatItem(
                                value = "${userSettings.totalMessages}",
                                label = "Messages"
                            )
                            UsageStatItem(
                                value = "${userSettings.totalConversations}",
                                label = "Chats"
                            )
                            UsageStatItem(
                                value = "${userSettings.imageGenerationsToday}/${userSettings.imageGenerationsLimit}",
                                label = "Images/Day"
                            )
                        }
                    }
                }
            }
            
            // 🆕 Personalization - Custom Instructions (like ChatGPT)
            item {
                SettingsCard {
                    Column {
                        SettingsSectionHeader(
                            icon = Icons.Outlined.AutoAwesome,
                            title = "Personalization",
                            isExpanded = expandedSection == "personalization",
                            onClick = { expandedSection = if (expandedSection == "personalization") null else "personalization" }
                        )
                        
                        AnimatedVisibility(
                            visible = expandedSection == "personalization",
                            enter = expandVertically(),
                            exit = shrinkVertically()
                        ) {
                            Column {
                                HorizontalDivider(color = InputBorder)
                                
                                SettingsClickableItem(
                                    icon = Icons.Outlined.EditNote,
                                    title = "Custom Instructions",
                                    subtitle = if (userSettings.customInstructions.isNotBlank()) 
                                        "Personalized responses enabled" 
                                    else 
                                        "Tell AI how to respond to you",
                                    onClick = { showCustomInstructionsDialog = true }
                                )
                                
                                // Info text
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    Icon(
                                        Icons.Outlined.Info,
                                        contentDescription = null,
                                        tint = BlueColor,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "Custom instructions are applied to all new conversations (not project chats). Example: \"Always respond in bullet points\" or \"I'm a software developer, prefer technical responses\"",
                                        fontSize = 12.sp,
                                        color = GrayText,
                                        lineHeight = 16.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }
            
            // Data Management
            item {
                SettingsCard {
                    Column {
                        SettingsSectionHeader(
                            icon = Icons.Outlined.Storage,
                            title = "Data Management",
                            isExpanded = expandedSection == "data",
                            onClick = { expandedSection = if (expandedSection == "data") null else "data" }
                        )
                        
                        AnimatedVisibility(
                            visible = expandedSection == "data",
                            enter = expandVertically(),
                            exit = shrinkVertically()
                        ) {
                            Column {
                                HorizontalDivider(color = InputBorder)
                                
                                SettingsClickableItem(
                                    icon = Icons.Outlined.DeleteSweep,
                                    title = "Clear Chat History",
                                    subtitle = "Delete all conversations",
                                    onClick = { showClearHistoryDialog = true },
                                    textColor = OrangeColor
                                )
                            }
                        }
                    }
                }
            }
            
            // About & Legal
            item {
                SettingsCard {
                    Column {
                        SettingsSectionHeader(
                            icon = Icons.Outlined.Info,
                            title = "About & Legal",
                            isExpanded = expandedSection == "about",
                            onClick = { expandedSection = if (expandedSection == "about") null else "about" }
                        )
                        
                        AnimatedVisibility(
                            visible = expandedSection == "about",
                            enter = expandVertically(),
                            exit = shrinkVertically()
                        ) {
                            Column {
                                HorizontalDivider(color = InputBorder)
                                
                                SettingsClickableItem(
                                    icon = Icons.Outlined.Policy,
                                    title = "Privacy Policy",
                                    onClick = onPrivacyPolicy
                                )
                                
                                SettingsClickableItem(
                                    icon = Icons.Outlined.Description,
                                    title = "Terms of Service",
                                    onClick = onTermsOfService
                                )
                                
                                SettingsClickableItem(
                                    icon = Icons.Outlined.Mail,
                                    title = "Contact Support",
                                    subtitle = "support@baatcheet.app",
                                    onClick = onContactSupport
                                )
                            }
                        }
                    }
                }
            }
            
            // Account & Security
            item {
                SettingsCard {
                    Column {
                        SettingsSectionHeader(
                            icon = Icons.Outlined.AccountCircle,
                            title = "Account & Security",
                            isExpanded = expandedSection == "account",
                            onClick = { expandedSection = if (expandedSection == "account") null else "account" }
                        )
                        
                        AnimatedVisibility(
                            visible = expandedSection == "account",
                            enter = expandVertically(),
                            exit = shrinkVertically()
                        ) {
                            Column {
                                HorizontalDivider(color = InputBorder)
                                
                                SettingsClickableItem(
                                    icon = Icons.Outlined.Lock,
                                    title = "Change Password",
                                    subtitle = "Update your password",
                                    onClick = { showChangePasswordDialog = true }
                                )
                                
                                SettingsClickableItem(
                                    icon = Icons.Outlined.Logout,
                                    title = "Sign Out",
                                    onClick = { showLogoutDialog = true },
                                    textColor = OrangeColor
                                )
                                
                                HorizontalDivider(color = InputBorder)
                                
                                SettingsClickableItem(
                                    icon = Icons.Outlined.DeleteForever,
                                    title = "Delete Account",
                                    subtitle = "Permanently delete your account",
                                    onClick = { showDeleteAccountDialog = true },
                                    textColor = RedColor
                                )
                            }
                        }
                    }
                }
            }
            
            // App Info
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "BaatCheet",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = GrayText
                    )
                    Text(
                        text = "Version 1.0.0",
                        fontSize = 12.sp,
                        color = GrayText.copy(alpha = 0.7f)
                    )
                }
            }
        }
    }
}

@Composable
private fun SettingsCard(
    content: @Composable () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = WhiteBackground),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        content()
    }
}

@Composable
private fun ProfileSection(
    displayName: String,
    email: String,
    tier: String,
    memberSince: String,
    onUpgrade: () -> Unit,
    onEditProfile: () -> Unit = {}
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar - Clickable to edit profile picture
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .background(PurpleColor, CircleShape)
                    .clickable { onEditProfile() },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = displayName.take(2).uppercase(),
                    color = Color.White,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )
                // Edit overlay indicator
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .size(24.dp)
                        .background(GreenAccent, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Edit,
                        contentDescription = "Edit Profile",
                        tint = Color.White,
                        modifier = Modifier.size(14.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = displayName.ifEmpty { "User" },
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = DarkText
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    // Edit button for name
                    Icon(
                        Icons.Default.Edit,
                        contentDescription = "Edit Name",
                        tint = GrayText,
                        modifier = Modifier
                            .size(16.dp)
                            .clickable { onEditProfile() }
                    )
                }
                Text(
                    text = email,
                    fontSize = 14.sp,
                    color = GrayText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                // Hint text
                Text(
                    text = "Tap avatar to edit profile",
                    fontSize = 12.sp,
                    color = GreenAccent,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Tier Badge
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .background(
                        when (tier.lowercase()) {
                            "pro" -> GreenAccent.copy(alpha = 0.1f)
                            "enterprise" -> PurpleColor.copy(alpha = 0.1f)
                            else -> LightGray
                        },
                        RoundedCornerShape(20.dp)
                    )
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Icon(
                    when (tier.lowercase()) {
                        "pro" -> Icons.Default.Star
                        "enterprise" -> Icons.Default.Diamond
                        else -> Icons.Default.Person
                    },
                    contentDescription = null,
                    tint = when (tier.lowercase()) {
                        "pro" -> GreenAccent
                        "enterprise" -> PurpleColor
                        else -> GrayText
                    },
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = tier.replaceFirstChar { it.uppercase() },
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = when (tier.lowercase()) {
                        "pro" -> GreenAccent
                        "enterprise" -> PurpleColor
                        else -> GrayText
                    }
                )
            }
            
            if (tier.lowercase() == "free") {
                TextButton(onClick = onUpgrade) {
                    Text(
                        text = "Upgrade to Pro",
                        color = GreenAccent,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}

@Composable
private fun UsageStatItem(
    value: String,
    label: String
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = value,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = DarkText
        )
        Text(
            text = label,
            fontSize = 12.sp,
            color = GrayText
        )
    }
}

@Composable
private fun SettingsSectionHeader(
    icon: ImageVector,
    title: String,
    isExpanded: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = DarkText,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = title,
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            color = DarkText,
            modifier = Modifier.weight(1f)
        )
        Icon(
            if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
            contentDescription = null,
            tint = GrayText,
            modifier = Modifier.size(24.dp)
        )
    }
}

@Composable
private fun SettingsClickableItem(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    onClick: () -> Unit,
    textColor: Color = DarkText
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = textColor,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontSize = 15.sp,
                color = textColor
            )
            if (subtitle != null) {
                Text(
                    text = subtitle,
                    fontSize = 12.sp,
                    color = GrayText
                )
            }
        }
        Icon(
            Icons.Default.ChevronRight,
            contentDescription = null,
            tint = GrayText,
            modifier = Modifier.size(20.dp)
        )
    }
}

/**
 * Custom Instructions Dialog - Like ChatGPT's personalization feature
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CustomInstructionsDialog(
    currentInstructions: String,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit
) {
    var instructions by remember { mutableStateOf(currentInstructions) }
    
    androidx.compose.ui.window.Dialog(
        onDismissRequest = onDismiss
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.8f),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = WhiteBackground)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Custom Instructions",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = DarkText
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, "Close", tint = GrayText)
                    }
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = "What would you like BaatCheet to know about you to provide better responses?",
                    fontSize = 14.sp,
                    color = GrayText,
                    lineHeight = 20.sp
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Instructions TextField
                OutlinedTextField(
                    value = instructions,
                    onValueChange = { instructions = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    placeholder = { 
                        Text(
                            "Example instructions:\n\n" +
                            "• I'm a software developer working with Python and React\n" +
                            "• Always respond in bullet points\n" +
                            "• Keep explanations concise and technical\n" +
                            "• Prefer code examples over theoretical explanations\n" +
                            "• I prefer Roman Urdu for casual conversations",
                            color = GrayText.copy(alpha = 0.6f),
                            fontSize = 13.sp,
                            lineHeight = 20.sp
                        )
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = GreenAccent,
                        unfocusedBorderColor = InputBorder
                    )
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // Character count
                Text(
                    text = "${instructions.length}/1500 characters",
                    fontSize = 12.sp,
                    color = if (instructions.length > 1500) RedColor else GrayText,
                    modifier = Modifier.align(Alignment.End)
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (instructions.isNotBlank()) {
                        OutlinedButton(
                            onClick = { instructions = "" },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, RedColor.copy(alpha = 0.5f))
                        ) {
                            Text("Clear", color = RedColor)
                        }
                    }
                    
                    Button(
                        onClick = { onSave(instructions.take(1500)) },
                        modifier = Modifier.weight(if (instructions.isNotBlank()) 1f else 2f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = GreenAccent)
                    ) {
                        Text("Save Instructions")
                    }
                }
            }
        }
    }
}

/**
 * Change Password Dialog
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChangePasswordDialog(
    onDismiss: () -> Unit,
    onChangePassword: (currentPassword: String, newPassword: String) -> Unit
) {
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var showCurrentPassword by remember { mutableStateOf(false) }
    var showNewPassword by remember { mutableStateOf(false) }
    var showConfirmPassword by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    
    val isValid = currentPassword.isNotBlank() && 
                  newPassword.length >= 8 && 
                  newPassword == confirmPassword
    
    androidx.compose.ui.window.Dialog(
        onDismissRequest = onDismiss
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = WhiteBackground)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Change Password",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = DarkText
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, "Close", tint = GrayText)
                    }
                }
                
                Spacer(modifier = Modifier.height(20.dp))
                
                // Current Password
                OutlinedTextField(
                    value = currentPassword,
                    onValueChange = { 
                        currentPassword = it
                        errorMessage = null
                    },
                    label = { Text("Current Password") },
                    singleLine = true,
                    visualTransformation = if (showCurrentPassword) 
                        androidx.compose.ui.text.input.VisualTransformation.None 
                    else 
                        androidx.compose.ui.text.input.PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { showCurrentPassword = !showCurrentPassword }) {
                            Icon(
                                if (showCurrentPassword) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                                contentDescription = null,
                                tint = GrayText
                            )
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = GreenAccent,
                        unfocusedBorderColor = InputBorder
                    )
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // New Password
                OutlinedTextField(
                    value = newPassword,
                    onValueChange = { 
                        newPassword = it
                        errorMessage = null
                    },
                    label = { Text("New Password") },
                    singleLine = true,
                    visualTransformation = if (showNewPassword) 
                        androidx.compose.ui.text.input.VisualTransformation.None 
                    else 
                        androidx.compose.ui.text.input.PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { showNewPassword = !showNewPassword }) {
                            Icon(
                                if (showNewPassword) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                                contentDescription = null,
                                tint = GrayText
                            )
                        }
                    },
                    supportingText = {
                        if (newPassword.isNotEmpty() && newPassword.length < 8) {
                            Text("Password must be at least 8 characters", color = RedColor)
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = GreenAccent,
                        unfocusedBorderColor = InputBorder
                    )
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // Confirm Password
                OutlinedTextField(
                    value = confirmPassword,
                    onValueChange = { 
                        confirmPassword = it
                        errorMessage = null
                    },
                    label = { Text("Confirm New Password") },
                    singleLine = true,
                    visualTransformation = if (showConfirmPassword) 
                        androidx.compose.ui.text.input.VisualTransformation.None 
                    else 
                        androidx.compose.ui.text.input.PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { showConfirmPassword = !showConfirmPassword }) {
                            Icon(
                                if (showConfirmPassword) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                                contentDescription = null,
                                tint = GrayText
                            )
                        }
                    },
                    isError = confirmPassword.isNotEmpty() && confirmPassword != newPassword,
                    supportingText = {
                        if (confirmPassword.isNotEmpty() && confirmPassword != newPassword) {
                            Text("Passwords don't match", color = RedColor)
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = GreenAccent,
                        unfocusedBorderColor = InputBorder,
                        errorBorderColor = RedColor
                    )
                )
                
                // Error message
                if (errorMessage != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = errorMessage!!,
                        color = RedColor,
                        fontSize = 13.sp
                    )
                }
                
                Spacer(modifier = Modifier.height(24.dp))
                
                // Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, InputBorder)
                    ) {
                        Text("Cancel", color = GrayText)
                    }
                    
                    Button(
                        onClick = {
                            if (isValid) {
                                onChangePassword(currentPassword, newPassword)
                            } else {
                                errorMessage = "Please fill all fields correctly"
                            }
                        },
                        enabled = isValid,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = GreenAccent,
                            disabledContainerColor = GreenAccent.copy(alpha = 0.5f)
                        )
                    ) {
                        Text("Update")
                    }
                }
            }
        }
    }
}

/**
 * Edit Profile Dialog - Update profile picture and display name
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditProfileDialog(
    currentName: String,
    onDismiss: () -> Unit,
    onUpdateName: (String) -> Unit,
    onUpdatePicture: () -> Unit
) {
    var displayName by remember { mutableStateOf(currentName) }
    
    androidx.compose.ui.window.Dialog(
        onDismissRequest = onDismiss
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = WhiteBackground)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Edit Profile",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = DarkText
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, "Close", tint = GrayText)
                    }
                }
                
                Spacer(modifier = Modifier.height(24.dp))
                
                // Profile Picture Section
                Box(
                    modifier = Modifier
                        .size(100.dp)
                        .background(PurpleColor, CircleShape)
                        .clickable { onUpdatePicture() },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = displayName.take(2).uppercase(),
                        color = Color.White,
                        fontSize = 36.sp,
                        fontWeight = FontWeight.Bold
                    )
                    // Camera icon overlay
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .size(32.dp)
                            .background(GreenAccent, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.CameraAlt,
                            contentDescription = "Change Photo",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = "Tap to change photo",
                    fontSize = 13.sp,
                    color = GrayText
                )
                
                Spacer(modifier = Modifier.height(24.dp))
                
                // Display Name Input
                OutlinedTextField(
                    value = displayName,
                    onValueChange = { displayName = it },
                    label = { Text("Display Name") },
                    singleLine = true,
                    leadingIcon = {
                        Icon(Icons.Default.Person, contentDescription = null, tint = GrayText)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = GreenAccent,
                        unfocusedBorderColor = InputBorder
                    )
                )
                
                Spacer(modifier = Modifier.height(24.dp))
                
                // Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, InputBorder)
                    ) {
                        Text("Cancel", color = GrayText)
                    }
                    
                    Button(
                        onClick = { 
                            if (displayName.isNotBlank()) {
                                onUpdateName(displayName) 
                            }
                        },
                        enabled = displayName.isNotBlank() && displayName != currentName,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = GreenAccent,
                            disabledContainerColor = GreenAccent.copy(alpha = 0.5f)
                        )
                    ) {
                        Text("Save")
                    }
                }
            }
        }
    }
}
