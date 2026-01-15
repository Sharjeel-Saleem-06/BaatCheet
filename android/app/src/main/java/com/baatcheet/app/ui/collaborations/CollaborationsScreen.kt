package com.baatcheet.app.ui.collaborations

import androidx.compose.animation.*
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.baatcheet.app.domain.model.PendingInvitation
import com.baatcheet.app.domain.model.Project

// Color palette
private val WhiteBackground = Color(0xFFFFFFFF)
private val GreenAccent = Color(0xFF34C759)
private val DarkText = Color(0xFF1C1C1E)
private val GrayText = Color(0xFF8E8E93)
private val ChipBackground = Color(0xFFF2F2F7)
private val InputBorder = Color(0xFFE5E5EA)
private val ErrorRed = Color(0xFFFF3B30)
private val WarningOrange = Color(0xFFFF9500)

/**
 * Collaborations Screen - Shows all collaborations and pending invitations
 * Similar to ChatGPT Teams workspace view
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CollaborationsScreen(
    collaborations: List<Project>,
    pendingInvitations: List<PendingInvitation>,
    isLoading: Boolean,
    isLoadingInvitations: Boolean,
    onBack: () -> Unit,
    onProjectClick: (String) -> Unit,
    onAcceptInvitation: (String) -> Unit,
    onDeclineInvitation: (String) -> Unit,
    onRefresh: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf(
        "Collaborations" to collaborations.size,
        "Invitations" to pendingInvitations.size
    )
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Collaborations",
                        fontWeight = FontWeight.SemiBold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = onRefresh) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = WhiteBackground
                )
            )
        },
        containerColor = WhiteBackground
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Tab Row
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = WhiteBackground,
                contentColor = GreenAccent
            ) {
                tabs.forEachIndexed { index, (title, count) ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Text(
                                    text = title,
                                    fontWeight = if (selectedTab == index) FontWeight.SemiBold else FontWeight.Normal,
                                    color = if (selectedTab == index) GreenAccent else GrayText
                                )
                                if (count > 0) {
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Box(
                                        modifier = Modifier
                                            .size(20.dp)
                                            .background(
                                                if (selectedTab == index) GreenAccent else GrayText.copy(alpha = 0.3f),
                                                CircleShape
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = if (count > 99) "99+" else "$count",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                    }
                                }
                            }
                        }
                    )
                }
            }
            
            // Content
            AnimatedContent(
                targetState = selectedTab,
                transitionSpec = {
                    fadeIn() + slideInHorizontally { if (targetState > initialState) it else -it } togetherWith
                    fadeOut() + slideOutHorizontally { if (targetState > initialState) -it else it }
                },
                label = "tab_content"
            ) { tabIndex ->
                when (tabIndex) {
                    0 -> CollaborationsTab(
                        collaborations = collaborations,
                        isLoading = isLoading,
                        onProjectClick = onProjectClick
                    )
                    1 -> InvitationsTab(
                        invitations = pendingInvitations,
                        isLoading = isLoadingInvitations,
                        onAccept = onAcceptInvitation,
                        onDecline = onDeclineInvitation
                    )
                }
            }
        }
    }
}

@Composable
private fun CollaborationsTab(
    collaborations: List<Project>,
    isLoading: Boolean,
    onProjectClick: (String) -> Unit
) {
    if (isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = GreenAccent)
        }
    } else if (collaborations.isEmpty()) {
        EmptyState(
            icon = Icons.Outlined.Group,
            title = "No Collaborations Yet",
            description = "When someone invites you to collaborate on a project and you accept, it will appear here."
        )
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(collaborations) { project ->
                CollaborationCard(
                    project = project,
                    onClick = { onProjectClick(project.id) }
                )
            }
        }
    }
}

@Composable
private fun InvitationsTab(
    invitations: List<PendingInvitation>,
    isLoading: Boolean,
    onAccept: (String) -> Unit,
    onDecline: (String) -> Unit
) {
    if (isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = GreenAccent)
        }
    } else if (invitations.isEmpty()) {
        EmptyState(
            icon = Icons.Outlined.Mail,
            title = "No Pending Invitations",
            description = "When someone invites you to collaborate on a project, it will appear here."
        )
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(invitations) { invitation ->
                InvitationCard(
                    invitation = invitation,
                    onAccept = { onAccept(invitation.id) },
                    onDecline = { onDecline(invitation.id) }
                )
            }
        }
    }
}

@Composable
private fun CollaborationCard(
    project: Project,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = WhiteBackground),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, InputBorder)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Project Emoji/Icon
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .background(GreenAccent.copy(alpha = 0.1f), RoundedCornerShape(14.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    if (project.emoji != null) {
                        Text(
                            text = project.emoji,
                            fontSize = 26.sp
                        )
                    } else {
                        Icon(
                            Icons.Outlined.Folder,
                            contentDescription = null,
                            tint = GreenAccent,
                            modifier = Modifier.size(26.dp)
                        )
                    }
                }
                
                Spacer(modifier = Modifier.width(14.dp))
                
                // Project Info
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = project.name,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = DarkText,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    
                    Spacer(modifier = Modifier.height(4.dp))
                    
                    // Owner info with avatar
                    if (project.owner != null) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(18.dp)
                                    .background(GrayText.copy(alpha = 0.2f), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = project.owner.firstName?.firstOrNull()?.toString()?.uppercase() ?: "O",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = GrayText
                                )
                            }
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = project.owner.displayName,
                                fontSize = 13.sp,
                                color = GrayText,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
                
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = GrayText,
                    modifier = Modifier.size(24.dp)
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Bottom row with role and stats
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Role badge - prominent
                RoleBadge(role = project.myRole ?: "viewer")
                
                // Stats row
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Conversation count
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Outlined.ChatBubbleOutline,
                            contentDescription = null,
                            tint = GrayText,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${project.conversationCount}",
                            fontSize = 13.sp,
                            color = GrayText,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    
                    // Collaborators count
                    if (project.collaboratorCount > 0) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Outlined.Groups,
                                contentDescription = null,
                                tint = GrayText,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "${project.collaboratorCount + 1}", // +1 for owner
                                fontSize = 13.sp,
                                color = GrayText,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun InvitationCard(
    invitation: PendingInvitation,
    onAccept: () -> Unit,
    onDecline: () -> Unit
) {
    var isProcessing by remember { mutableStateOf(false) }
    
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = WhiteBackground),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, GreenAccent.copy(alpha = 0.3f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // "New Invitation" badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = GreenAccent.copy(alpha = 0.1f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Outlined.Mail,
                            contentDescription = null,
                            tint = GreenAccent,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "New Invitation",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = GreenAccent
                        )
                    }
                }
                
                // Role badge
                RoleBadge(role = invitation.role)
            }
            
            Spacer(modifier = Modifier.height(14.dp))
            
            // Header with project info
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .background(GreenAccent.copy(alpha = 0.1f), RoundedCornerShape(14.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Outlined.Folder,
                        contentDescription = null,
                        tint = GreenAccent,
                        modifier = Modifier.size(26.dp)
                    )
                }
                
                Spacer(modifier = Modifier.width(14.dp))
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = invitation.projectName,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = DarkText
                    )
                    
                    if (invitation.projectDescription != null) {
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = invitation.projectDescription,
                            fontSize = 13.sp,
                            color = GrayText,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Inviter info with avatar
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(ChipBackground, RoundedCornerShape(10.dp))
                    .padding(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .background(GrayText.copy(alpha = 0.2f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = invitation.inviterName.firstOrNull()?.toString()?.uppercase() ?: "?",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = GrayText
                    )
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = "Invited by",
                        fontSize = 11.sp,
                        color = GrayText
                    )
                    Text(
                        text = invitation.inviterName,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = DarkText
                    )
                }
            }
            
            // Custom message if present
            if (invitation.message != null) {
                Spacer(modifier = Modifier.height(10.dp))
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = ChipBackground
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Icon(
                            Icons.Outlined.FormatQuote,
                            contentDescription = null,
                            tint = GrayText,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = invitation.message,
                            fontSize = 13.sp,
                            color = DarkText,
                            fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Decline button
                OutlinedButton(
                    onClick = {
                        isProcessing = true
                        onDecline()
                    },
                    enabled = !isProcessing,
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = ErrorRed
                    ),
                    border = androidx.compose.foundation.BorderStroke(1.dp, ErrorRed.copy(alpha = 0.5f))
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Decline", fontWeight = FontWeight.Medium)
                }
                
                // Accept button
                Button(
                    onClick = {
                        isProcessing = true
                        onAccept()
                    },
                    enabled = !isProcessing,
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = GreenAccent,
                        contentColor = Color.White
                    )
                ) {
                    if (isProcessing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            Icons.Default.Check,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Accept", fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
    }
}

@Composable
private fun RoleBadge(role: String) {
    val (backgroundColor, textColor, icon, displayName) = when (role.lowercase()) {
        "owner" -> Quadruple(GreenAccent.copy(alpha = 0.15f), GreenAccent, Icons.Outlined.Shield, "Owner")
        "admin" -> Quadruple(Color(0xFF007AFF).copy(alpha = 0.15f), Color(0xFF007AFF), Icons.Outlined.AdminPanelSettings, "Admin")
        "moderator" -> Quadruple(WarningOrange.copy(alpha = 0.15f), WarningOrange, Icons.Outlined.ManageAccounts, "Moderator")
        "editor" -> Quadruple(Color(0xFF007AFF).copy(alpha = 0.15f), Color(0xFF007AFF), Icons.Outlined.Edit, "Editor")
        else -> Quadruple(GrayText.copy(alpha = 0.15f), GrayText, Icons.Outlined.Visibility, "Viewer")
    }
    
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = backgroundColor
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = textColor,
                modifier = Modifier.size(14.dp)
            )
            Spacer(modifier = Modifier.width(5.dp))
            Text(
                text = displayName,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = textColor
            )
        }
    }
}

// Helper data class for quadruple
private data class Quadruple<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)

@Composable
private fun EmptyState(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    description: String
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(80.dp)
                .background(ChipBackground, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = GrayText,
                modifier = Modifier.size(40.dp)
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = title,
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            color = DarkText,
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = description,
            fontSize = 14.sp,
            color = GrayText,
            textAlign = TextAlign.Center,
            lineHeight = 20.sp
        )
    }
}
