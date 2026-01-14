package com.baatcheet.app.ui.collaborations

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.baatcheet.app.data.repository.ProjectCollaborators
import com.baatcheet.app.domain.model.Collaborator
import com.baatcheet.app.domain.model.Project
import com.baatcheet.app.domain.model.UserSummary

// Color palette
private val WhiteBackground = Color(0xFFFFFFFF)
private val GreenAccent = Color(0xFF34C759)
private val DarkText = Color(0xFF1C1C1E)
private val GrayText = Color(0xFF8E8E93)
private val ChipBackground = Color(0xFFF2F2F7)
private val ErrorRed = Color(0xFFFF3B30)

/**
 * Project Details Bottom Sheet
 * Shows project info and collaborators with management options
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectDetailsSheet(
    project: Project,
    collaborators: ProjectCollaborators?,
    isLoading: Boolean,
    isOwner: Boolean,
    onDismiss: () -> Unit,
    onInviteClick: () -> Unit,
    onRemoveCollaborator: (String) -> Unit,
    onRefreshContext: () -> Unit,
    onDeleteProject: () -> Unit
) {
    var showDeleteConfirm by remember { mutableStateOf(false) }
    var collaboratorToRemove by remember { mutableStateOf<Collaborator?>(null) }
    
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = WhiteBackground,
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp)
        ) {
            // Project Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .background(GreenAccent.copy(alpha = 0.1f), RoundedCornerShape(14.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Outlined.Folder,
                        contentDescription = null,
                        tint = GreenAccent,
                        modifier = Modifier.size(28.dp)
                    )
                }
                
                Spacer(modifier = Modifier.width(16.dp))
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = project.name,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = DarkText
                    )
                    if (project.description != null) {
                        Text(
                            text = project.description,
                            fontSize = 14.sp,
                            color = GrayText,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(20.dp))
            
            // Stats Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                StatItem(
                    icon = Icons.Outlined.ChatBubbleOutline,
                    value = "${project.conversationCount}",
                    label = "Chats"
                )
                StatItem(
                    icon = Icons.Outlined.Group,
                    value = "${(collaborators?.collaborators?.size ?: 0) + 1}",
                    label = "Members"
                )
                if (project.myRole != null) {
                    StatItem(
                        icon = when (project.myRole.lowercase()) {
                            "owner" -> Icons.Outlined.Shield
                            "editor" -> Icons.Outlined.Edit
                            else -> Icons.Outlined.Visibility
                        },
                        value = project.myRole.replaceFirstChar { it.uppercase() },
                        label = "Your Role"
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            HorizontalDivider(color = ChipBackground)
            Spacer(modifier = Modifier.height(16.dp))
            
            // Team Section
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Team Members",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = DarkText
                )
                
                if (isOwner) {
                    TextButton(onClick = onInviteClick) {
                        Icon(
                            Icons.Default.PersonAdd,
                            contentDescription = null,
                            tint = GreenAccent,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Invite", color = GreenAccent)
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = GreenAccent, modifier = Modifier.size(24.dp))
                }
            } else {
                LazyColumn(
                    modifier = Modifier.heightIn(max = 300.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Owner first
                    collaborators?.owner?.let { owner ->
                        item {
                            CollaboratorItem(
                                user = owner,
                                role = "owner",
                                isOwner = true,
                                canRemove = false,
                                onRemove = {}
                            )
                        }
                    }
                    
                    // Other collaborators
                    items(collaborators?.collaborators ?: emptyList()) { collaborator ->
                        CollaboratorItem(
                            user = collaborator.user,
                            role = collaborator.role,
                            isOwner = false,
                            canRemove = isOwner,
                            onRemove = { collaboratorToRemove = collaborator }
                        )
                    }
                }
            }
            
            // Actions for owner
            if (isOwner) {
                Spacer(modifier = Modifier.height(24.dp))
                HorizontalDivider(color = ChipBackground)
                Spacer(modifier = Modifier.height(16.dp))
                
                // Refresh AI Context
                OutlinedButton(
                    onClick = onRefreshContext,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = DarkText)
                ) {
                    Icon(
                        Icons.Default.Refresh,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Refresh AI Context")
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // Delete Project
                OutlinedButton(
                    onClick = { showDeleteConfirm = true },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = ErrorRed),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = androidx.compose.ui.graphics.SolidColor(ErrorRed.copy(alpha = 0.5f))
                    )
                ) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Delete Project")
                }
            }
        }
    }
    
    // Delete Confirmation Dialog
    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Delete Project?") },
            text = { 
                Text("This will permanently delete the project and remove all collaborators. Conversations will be unlinked but not deleted.")
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteConfirm = false
                        onDeleteProject()
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = ErrorRed)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }
    
    // Remove Collaborator Confirmation
    collaboratorToRemove?.let { collaborator ->
        AlertDialog(
            onDismissRequest = { collaboratorToRemove = null },
            title = { Text("Remove Collaborator?") },
            text = { 
                Text("${collaborator.user.displayName} will no longer have access to this project.")
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        onRemoveCollaborator(collaborator.userId)
                        collaboratorToRemove = null
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = ErrorRed)
                ) {
                    Text("Remove")
                }
            },
            dismissButton = {
                TextButton(onClick = { collaboratorToRemove = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun StatItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    value: String,
    label: String
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = GreenAccent,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            fontSize = 18.sp,
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
private fun CollaboratorItem(
    user: UserSummary,
    role: String,
    isOwner: Boolean,
    canRemove: Boolean,
    onRemove: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(ChipBackground, RoundedCornerShape(12.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Avatar
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(
                    when (role.lowercase()) {
                        "owner" -> GreenAccent
                        "editor" -> Color(0xFF007AFF)
                        else -> GrayText
                    },
                    CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = user.initials,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }
        
        Spacer(modifier = Modifier.width(12.dp))
        
        // Info
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = user.displayName,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                    color = DarkText
                )
                if (isOwner) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = GreenAccent.copy(alpha = 0.1f)
                    ) {
                        Text(
                            text = "Owner",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium,
                            color = GreenAccent,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }
            if (user.email != null) {
                Text(
                    text = user.email,
                    fontSize = 12.sp,
                    color = GrayText
                )
            }
        }
        
        // Role badge (for non-owners)
        if (!isOwner) {
            Surface(
                shape = RoundedCornerShape(6.dp),
                color = when (role.lowercase()) {
                    "editor" -> Color(0xFF007AFF).copy(alpha = 0.1f)
                    else -> GrayText.copy(alpha = 0.1f)
                }
            ) {
                Text(
                    text = role.replaceFirstChar { it.uppercase() },
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    color = when (role.lowercase()) {
                        "editor" -> Color(0xFF007AFF)
                        else -> GrayText
                    },
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
        
        // Remove button
        if (canRemove && !isOwner) {
            Spacer(modifier = Modifier.width(8.dp))
            IconButton(
                onClick = onRemove,
                modifier = Modifier.size(32.dp)
            ) {
                Icon(
                    Icons.Default.Close,
                    contentDescription = "Remove",
                    tint = ErrorRed,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}
