package com.baatcheet.app.ui.analytics

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Colors
private val WhiteBackground = Color(0xFFFFFFFF)
private val GreenAccent = Color(0xFF34C759)
private val DarkText = Color(0xFF1C1C1E)
private val GrayText = Color(0xFF8E8E93)
private val LightGray = Color(0xFFF2F2F7)
private val BlueColor = Color(0xFF007AFF)
private val PurpleColor = Color(0xFF7C4DFF)
private val OrangeColor = Color(0xFFFF9500)
private val PinkColor = Color(0xFFFF2D55)

data class AnalyticsData(
    val totalMessages: Int = 0,
    val totalConversations: Int = 0,
    val totalProjects: Int = 0,
    val totalCollaborations: Int = 0,
    val imageGenerations: Int = 0,
    val voiceMinutes: Int = 0,
    val tokensUsed: Long = 0,
    val tokensLimit: Long = 100000,
    val topModes: List<ModeUsage> = emptyList(),
    val weeklyActivity: List<DayActivity> = emptyList(),
    val topTopics: List<TopicUsage> = emptyList(),
    val streak: Int = 0,
    val lastActive: String = "Today"
)

data class ModeUsage(
    val mode: String,
    val count: Int,
    val percentage: Float,
    val color: Color
)

data class DayActivity(
    val day: String,
    val messages: Int
)

data class TopicUsage(
    val topic: String,
    val count: Int
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnalyticsScreen(
    analyticsData: AnalyticsData,
    isLoading: Boolean = false,
    onBack: () -> Unit,
    onRefresh: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Analytics", fontWeight = FontWeight.SemiBold) },
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
                    containerColor = WhiteBackground,
                    titleContentColor = DarkText
                )
            )
        },
        containerColor = LightGray
    ) { padding ->
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = GreenAccent)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Streak & Activity
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = WhiteBackground)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            StreakItem(
                                icon = Icons.Default.LocalFireDepartment,
                                value = "${analyticsData.streak}",
                                label = "Day Streak",
                                color = OrangeColor
                            )
                            StreakItem(
                                icon = Icons.Default.Schedule,
                                value = analyticsData.lastActive,
                                label = "Last Active",
                                color = BlueColor
                            )
                        }
                    }
                }
                
                // Main Stats Grid
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        StatCard(
                            modifier = Modifier.weight(1f),
                            icon = Icons.Outlined.Chat,
                            value = "${analyticsData.totalMessages}",
                            label = "Messages",
                            color = GreenAccent
                        )
                        StatCard(
                            modifier = Modifier.weight(1f),
                            icon = Icons.Outlined.Forum,
                            value = "${analyticsData.totalConversations}",
                            label = "Chats",
                            color = BlueColor
                        )
                    }
                }
                
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        StatCard(
                            modifier = Modifier.weight(1f),
                            icon = Icons.Outlined.Folder,
                            value = "${analyticsData.totalProjects}",
                            label = "Projects",
                            color = PurpleColor
                        )
                        StatCard(
                            modifier = Modifier.weight(1f),
                            icon = Icons.Outlined.Group,
                            value = "${analyticsData.totalCollaborations}",
                            label = "Collaborations",
                            color = OrangeColor
                        )
                    }
                }
                
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        StatCard(
                            modifier = Modifier.weight(1f),
                            icon = Icons.Outlined.Image,
                            value = "${analyticsData.imageGenerations}",
                            label = "Images",
                            color = PinkColor
                        )
                        StatCard(
                            modifier = Modifier.weight(1f),
                            icon = Icons.Outlined.Mic,
                            value = "${analyticsData.voiceMinutes}m",
                            label = "Voice",
                            color = GreenAccent
                        )
                    }
                }
                
                // Token Usage
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = WhiteBackground)
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Token Usage",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = DarkText
                                )
                                Text(
                                    text = "${formatNumber(analyticsData.tokensUsed)} / ${formatNumber(analyticsData.tokensLimit)}",
                                    fontSize = 14.sp,
                                    color = GrayText
                                )
                            }
                            
                            Spacer(modifier = Modifier.height(12.dp))
                            
                            val progress = (analyticsData.tokensUsed.toFloat() / analyticsData.tokensLimit).coerceIn(0f, 1f)
                            LinearProgressIndicator(
                                progress = { progress },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(8.dp)
                                    .clip(RoundedCornerShape(4.dp)),
                                color = when {
                                    progress > 0.9f -> PinkColor
                                    progress > 0.7f -> OrangeColor
                                    else -> GreenAccent
                                },
                                trackColor = LightGray
                            )
                            
                            Spacer(modifier = Modifier.height(8.dp))
                            
                            Text(
                                text = "${(progress * 100).toInt()}% used this month",
                                fontSize = 12.sp,
                                color = GrayText
                            )
                        }
                    }
                }
                
                // Weekly Activity Chart
                if (analyticsData.weeklyActivity.isNotEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = WhiteBackground)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Text(
                                    text = "Weekly Activity",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = DarkText
                                )
                                
                                Spacer(modifier = Modifier.height(16.dp))
                                
                                WeeklyActivityChart(
                                    data = analyticsData.weeklyActivity
                                )
                            }
                        }
                    }
                }
                
                // Top Modes
                if (analyticsData.topModes.isNotEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = WhiteBackground)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Text(
                                    text = "Most Used Modes",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = DarkText
                                )
                                
                                Spacer(modifier = Modifier.height(16.dp))
                                
                                analyticsData.topModes.forEach { mode ->
                                    ModeUsageItem(mode = mode)
                                    if (mode != analyticsData.topModes.last()) {
                                        Spacer(modifier = Modifier.height(12.dp))
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Top Topics
                if (analyticsData.topTopics.isNotEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = WhiteBackground)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Text(
                                    text = "Top Topics",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = DarkText
                                )
                                
                                Spacer(modifier = Modifier.height(12.dp))
                                
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    items(analyticsData.topTopics) { topic ->
                                        TopicChip(topic = topic)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StreakItem(
    icon: ImageVector,
    value: String,
    label: String,
    color: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(32.dp)
        )
        Spacer(modifier = Modifier.height(8.dp))
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
private fun StatCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    value: String,
    label: String,
    color: Color
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = WhiteBackground)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(color.copy(alpha = 0.1f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = value,
                fontSize = 24.sp,
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
}

@Composable
private fun WeeklyActivityChart(
    data: List<DayActivity>
) {
    val maxMessages = data.maxOfOrNull { it.messages } ?: 1
    
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(120.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.Bottom
    ) {
        data.forEach { day ->
            Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                val heightFraction = (day.messages.toFloat() / maxMessages).coerceIn(0.1f, 1f)
                
                Box(
                    modifier = Modifier
                        .width(32.dp)
                        .height((80 * heightFraction).dp)
                        .clip(RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
                        .background(GreenAccent.copy(alpha = 0.3f + (0.7f * heightFraction)))
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = day.day,
                    fontSize = 11.sp,
                    color = GrayText
                )
            }
        }
    }
}

@Composable
private fun ModeUsageItem(
    mode: ModeUsage
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .background(mode.color, CircleShape)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = mode.mode,
            fontSize = 14.sp,
            color = DarkText,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = "${mode.count}",
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = DarkText
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = "${(mode.percentage * 100).toInt()}%",
            fontSize = 12.sp,
            color = GrayText
        )
    }
}

@Composable
private fun TopicChip(
    topic: TopicUsage
) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = LightGray
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = topic.topic,
                fontSize = 13.sp,
                color = DarkText
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = "${topic.count}",
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = GreenAccent
            )
        }
    }
}

private fun formatNumber(number: Long): String {
    return when {
        number >= 1_000_000 -> String.format("%.1fM", number / 1_000_000.0)
        number >= 1_000 -> String.format("%.1fK", number / 1_000.0)
        else -> number.toString()
    }
}
