package com.baatcheet.app.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.Divider
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

// ============================================
// Color Palette for Markdown Rendering
// ============================================

private object MarkdownColors {
    val Text = Color(0xFF1C1C1E)
    val TextSecondary = Color(0xFF3C3C43).copy(alpha = 0.6f)
    val Link = Color(0xFF007AFF)
    val CodeBackground = Color(0xFFF3F4F6)
    val CodeText = Color(0xFF374151)
    val CodeBlockBackground = Color(0xFF1E1E1E)
    val CodeBlockText = Color(0xFFD4D4D4)
    val TableBorder = Color(0xFFE5E7EB)
    val TableHeaderBackground = Color(0xFFF9FAFB)
    val TableCellBackground = Color(0xFFFFFFFF)
    val BlockquoteBorder = Color(0xFF34C759)
    val BlockquoteBackground = Color(0xFFF0FFF4)
    val KeywordColor = Color(0xFFC586C0)
    val StringColor = Color(0xFFCE9178)
    val CommentColor = Color(0xFF6A9955)
    val NumberColor = Color(0xFFB5CEA8)
    val FunctionColor = Color(0xFFDCDCAA)
    val GreenAccent = Color(0xFF34C759)
}

// ============================================
// Language Display Names
// ============================================

private val LANGUAGE_NAMES = mapOf(
    "javascript" to "JavaScript",
    "js" to "JavaScript",
    "typescript" to "TypeScript",
    "ts" to "TypeScript",
    "python" to "Python",
    "py" to "Python",
    "java" to "Java",
    "kotlin" to "Kotlin",
    "kt" to "Kotlin",
    "swift" to "Swift",
    "csharp" to "C#",
    "cs" to "C#",
    "cpp" to "C++",
    "c" to "C",
    "go" to "Go",
    "rust" to "Rust",
    "php" to "PHP",
    "ruby" to "Ruby",
    "sql" to "SQL",
    "html" to "HTML",
    "css" to "CSS",
    "scss" to "SCSS",
    "bash" to "Bash",
    "shell" to "Shell",
    "sh" to "Shell",
    "json" to "JSON",
    "yaml" to "YAML",
    "yml" to "YAML",
    "xml" to "XML",
    "markdown" to "Markdown",
    "md" to "Markdown",
    "text" to "Text",
    "txt" to "Text"
)

// Characters to clean from display (raw markdown artifacts)
private val CLEAN_PATTERN = Regex("[#*_~`]+")

// ============================================
// Markdown Elements
// ============================================

private sealed class MarkdownElement {
    data class Paragraph(val content: AnnotatedString) : MarkdownElement()
    data class Heading(val text: String, val level: Int) : MarkdownElement()
    data class CodeBlock(val code: String, val language: String?) : MarkdownElement()
    data class InlineCode(val code: String) : MarkdownElement()
    data class BulletList(val items: List<AnnotatedString>) : MarkdownElement()
    data class NumberedList(val items: List<AnnotatedString>) : MarkdownElement()
    data class Blockquote(val content: AnnotatedString) : MarkdownElement()
    data class Table(val headers: List<String>, val rows: List<List<String>>) : MarkdownElement()
    data class HorizontalRule(val id: Int = 0) : MarkdownElement()
    data object Empty : MarkdownElement()
}

// ============================================
// Main Composable
// ============================================

/**
 * Advanced Markdown text renderer for chat messages
 * Supports: Headers, Bold, Italic, Code blocks with syntax highlighting,
 * Tables with horizontal scroll, Lists, Blockquotes, Links, and more
 * 
 * CLEANED: Removes special characters (#*_~`) from display unless needed
 */
@Composable
fun MarkdownText(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = MarkdownColors.Text,
    fontSize: Float = 15f,
    lineHeight: Float = 22f
) {
    val elements = remember(text) { parseMarkdown(text, color) }
    
    SelectionContainer(modifier = modifier) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            elements.forEach { element ->
                when (element) {
                    is MarkdownElement.Heading -> HeadingView(element, color)
                    is MarkdownElement.Paragraph -> ParagraphView(element, fontSize, lineHeight)
                    is MarkdownElement.CodeBlock -> CodeBlockView(element)
                    is MarkdownElement.BulletList -> BulletListView(element, fontSize, lineHeight)
                    is MarkdownElement.NumberedList -> NumberedListView(element, fontSize, lineHeight)
                    is MarkdownElement.Blockquote -> BlockquoteView(element, fontSize, lineHeight)
                    is MarkdownElement.Table -> TableView(element)
                    is MarkdownElement.HorizontalRule -> HorizontalDivider(
                        modifier = Modifier.padding(vertical = 8.dp),
                        color = MarkdownColors.TableBorder
                    )
                    is MarkdownElement.Empty -> Spacer(modifier = Modifier.height(8.dp))
                    else -> {}
                }
            }
        }
    }
}

// ============================================
// Element Views
// ============================================

@Composable
private fun HeadingView(heading: MarkdownElement.Heading, color: Color) {
    val fontSize = when (heading.level) {
        1 -> 22.sp
        2 -> 19.sp
        3 -> 17.sp
        4 -> 16.sp
        else -> 15.sp
    }
    
    val fontWeight = if (heading.level <= 2) FontWeight.Bold else FontWeight.SemiBold
    
    Column {
        Text(
            text = heading.text,
            fontSize = fontSize,
            fontWeight = fontWeight,
            color = color,
            modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)
        )
        
        if (heading.level <= 2) {
            HorizontalDivider(
                color = MarkdownColors.TableBorder,
                modifier = Modifier.padding(bottom = 4.dp)
            )
        }
    }
}

@Composable
private fun ParagraphView(
    paragraph: MarkdownElement.Paragraph,
    fontSize: Float,
    lineHeight: Float
) {
    Text(
        text = paragraph.content,
        fontSize = fontSize.sp,
        lineHeight = lineHeight.sp
    )
}

@Composable
private fun CodeBlockView(codeBlock: MarkdownElement.CodeBlock) {
    val context = LocalContext.current
    var copied by remember { mutableStateOf(false) }
    var collapsed by remember { mutableStateOf(false) }
    
    val lineCount = codeBlock.code.lines().size
    val isLong = lineCount > 15
    val languageDisplay = codeBlock.language?.let { LANGUAGE_NAMES[it.lowercase()] ?: it } ?: "Code"
    
    // Reset copied state after delay
    LaunchedEffect(copied) {
        if (copied) {
            delay(2000)
            copied = false
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(MarkdownColors.CodeBlockBackground)
    ) {
        // Header with language badge and copy button
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF2D2D2D))
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Language badge
                Box(
                    modifier = Modifier
                        .background(
                            Color(0xFF404040),
                            RoundedCornerShape(4.dp)
                        )
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = languageDisplay,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFFCCCCCC)
                    )
                }
                
                // Line count
                Text(
                    text = "$lineCount line${if (lineCount != 1) "s" else ""}",
                    fontSize = 11.sp,
                    color = Color(0xFF8E8E93)
                )
            }
            
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Collapse button for long code
                if (isLong) {
                    IconButton(
                        onClick = { collapsed = !collapsed },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = if (collapsed) Icons.Default.ExpandMore else Icons.Default.ExpandLess,
                            contentDescription = if (collapsed) "Expand" else "Collapse",
                            tint = Color(0xFF8E8E93),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
                
                // Copy button
                IconButton(
                    onClick = {
                        copyToClipboard(context, codeBlock.code)
                        copied = true
                    },
                    modifier = Modifier
                        .background(
                            if (copied) Color(0xFF34C759).copy(alpha = 0.2f) else Color(0xFF404040),
                            RoundedCornerShape(4.dp)
                        )
                        .size(28.dp)
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (copied) Icons.Default.Check else Icons.Default.ContentCopy,
                            contentDescription = "Copy",
                            tint = if (copied) Color(0xFF34C759) else Color(0xFFCCCCCC),
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
            }
        }
        
        // Code content with horizontal scroll
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .then(
                    if (collapsed && isLong) Modifier.height(80.dp) else Modifier
                )
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(12.dp)
            ) {
                // Line numbers column
                Column(
                    modifier = Modifier.padding(end = 12.dp),
                    horizontalAlignment = Alignment.End
                ) {
                    codeBlock.code.lines().take(if (collapsed && isLong) 5 else Int.MAX_VALUE).forEachIndexed { index, _ ->
                        Text(
                            text = "${index + 1}",
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            color = Color(0xFF6E7681),
                            lineHeight = 20.sp
                        )
                    }
                }
                
                // Code content with syntax highlighting
                Column {
                    codeBlock.code.lines().take(if (collapsed && isLong) 5 else Int.MAX_VALUE).forEach { line ->
                        Text(
                            text = highlightLine(line, codeBlock.language),
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            lineHeight = 20.sp
                        )
                    }
                }
            }
        }
        
        // Collapsed indicator
        if (collapsed && isLong) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF2D2D2D))
                    .clickable { collapsed = false }
                    .padding(8.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Click to expand (${lineCount - 5} more lines)",
                    fontSize = 11.sp,
                    color = Color(0xFF8E8E93)
                )
            }
        }
    }
}

@Composable
private fun BulletListView(
    list: MarkdownElement.BulletList,
    fontSize: Float,
    lineHeight: Float
) {
    Column(
        modifier = Modifier.padding(start = 4.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        list.items.forEach { item ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Start
            ) {
                Text(
                    text = "•",
                    fontSize = (fontSize + 2).sp,
                    color = MarkdownColors.GreenAccent,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(end = 10.dp)
                )
                Text(
                    text = item,
                    fontSize = fontSize.sp,
                    lineHeight = lineHeight.sp,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun NumberedListView(
    list: MarkdownElement.NumberedList,
    fontSize: Float,
    lineHeight: Float
) {
    Column(
        modifier = Modifier.padding(start = 4.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        list.items.forEachIndexed { index, item ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Start
            ) {
                Text(
                    text = "${index + 1}.",
                    fontSize = fontSize.sp,
                    color = MarkdownColors.GreenAccent,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .width(24.dp)
                        .padding(end = 8.dp)
                )
                Text(
                    text = item,
                    fontSize = fontSize.sp,
                    lineHeight = lineHeight.sp,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun BlockquoteView(
    blockquote: MarkdownElement.Blockquote,
    fontSize: Float,
    lineHeight: Float
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(4.dp))
            .background(MarkdownColors.BlockquoteBackground)
            .padding(12.dp)
    ) {
        Box(
            modifier = Modifier
                .width(3.dp)
                .height(IntrinsicSize.Min)
                .background(MarkdownColors.BlockquoteBorder)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = blockquote.content,
            fontSize = fontSize.sp,
            lineHeight = lineHeight.sp,
            fontStyle = FontStyle.Italic,
            color = MarkdownColors.TextSecondary
        )
    }
}

/**
 * Table View with HORIZONTAL SCROLL for mobile
 * Shows full table content without truncation
 */
@Composable
private fun TableView(table: MarkdownElement.Table) {
    if (table.headers.isEmpty()) return
    
    val scrollState = rememberScrollState()
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .border(1.dp, MarkdownColors.TableBorder, RoundedCornerShape(8.dp))
    ) {
        // Horizontal scroll container for the entire table
        Row(
            modifier = Modifier
                .horizontalScroll(scrollState)
        ) {
            Column {
                // Header row
                Row(
                    modifier = Modifier
                        .background(MarkdownColors.TableHeaderBackground)
                ) {
                    table.headers.forEachIndexed { index, header ->
                        Box(
                            modifier = Modifier
                                .widthIn(min = 100.dp, max = 200.dp)
                                .padding(horizontal = 12.dp, vertical = 10.dp)
                        ) {
                            Text(
                                text = header.trim(),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MarkdownColors.Text
                            )
                        }
                        if (index < table.headers.lastIndex) {
                            Box(
                                modifier = Modifier
                                    .width(1.dp)
                                    .height(40.dp)
                                    .background(MarkdownColors.TableBorder)
                            )
                        }
                    }
                }
                
                // Data rows
                table.rows.forEach { row ->
                    HorizontalDivider(color = MarkdownColors.TableBorder, thickness = 1.dp)
                    Row(
                        modifier = Modifier.background(MarkdownColors.TableCellBackground)
                    ) {
                        row.forEachIndexed { cellIndex, cell ->
                            Box(
                                modifier = Modifier
                                    .widthIn(min = 100.dp, max = 200.dp)
                                    .padding(horizontal = 12.dp, vertical = 10.dp)
                            ) {
                                Text(
                                    text = cell.trim(),
                                    fontSize = 13.sp,
                                    color = MarkdownColors.Text,
                                    lineHeight = 18.sp
                                )
                            }
                            if (cellIndex < row.lastIndex) {
                                Box(
                                    modifier = Modifier
                                        .width(1.dp)
                                        .height(40.dp)
                                        .background(MarkdownColors.TableBorder)
                                )
                            }
                        }
                    }
                }
            }
        }
        
        // Scroll hint if table is wide
        if (table.headers.size > 2) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFF5F5F5))
                    .padding(4.dp),
                horizontalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "← Swipe to see more →",
                    fontSize = 10.sp,
                    color = Color(0xFF8E8E93)
                )
            }
        }
    }
}

// ============================================
// Parsing Functions
// ============================================

private fun parseMarkdown(text: String, textColor: Color): List<MarkdownElement> {
    val elements = mutableListOf<MarkdownElement>()
    
    // Split by code blocks first
    val codeBlockPattern = Regex("```(\\w*)?\\n?([\\s\\S]*?)```")
    var lastEnd = 0
    
    codeBlockPattern.findAll(text).forEach { match ->
        // Add text before code block
        if (match.range.first > lastEnd) {
            val textBefore = text.substring(lastEnd, match.range.first)
            elements.addAll(parseTextContent(textBefore, textColor))
        }
        
        // Add code block
        val language = match.groupValues[1].ifEmpty { null }
        val code = match.groupValues[2].trimEnd()
        elements.add(MarkdownElement.CodeBlock(code, language))
        
        lastEnd = match.range.last + 1
    }
    
    // Add remaining text
    if (lastEnd < text.length) {
        val remainingText = text.substring(lastEnd)
        elements.addAll(parseTextContent(remainingText, textColor))
    }
    
    return elements
}

private fun parseTextContent(text: String, textColor: Color): List<MarkdownElement> {
    val elements = mutableListOf<MarkdownElement>()
    val lines = text.split("\n")
    var i = 0
    
    while (i < lines.size) {
        val line = lines[i].trim()
        
        when {
            line.isEmpty() -> {
                i++
            }
            
            // Headings
            line.startsWith("#") -> {
                val headerMatch = Regex("^(#{1,6})\\s+(.+)$").find(line)
                if (headerMatch != null) {
                    val level = headerMatch.groupValues[1].length
                    val headerText = headerMatch.groupValues[2]
                    elements.add(MarkdownElement.Heading(headerText, level))
                }
                i++
            }
            
            // Table detection
            line.contains("|") && i + 1 < lines.size && lines[i + 1].contains("---") -> {
                val tableLines = mutableListOf<String>()
                while (i < lines.size && lines[i].trim().contains("|")) {
                    tableLines.add(lines[i])
                    i++
                }
                elements.add(parseTable(tableLines))
            }
            
            // Horizontal rule
            line.matches(Regex("^[-*_]{3,}$")) -> {
                elements.add(MarkdownElement.HorizontalRule())
                i++
            }
            
            // Bullet list
            line.matches(Regex("^[-*+]\\s+.+")) -> {
                val listItems = mutableListOf<AnnotatedString>()
                while (i < lines.size && lines[i].trim().matches(Regex("^[-*+]\\s+.+"))) {
                    val itemText = lines[i].trim().replaceFirst(Regex("^[-*+]\\s+"), "")
                    listItems.add(parseInlineMarkdown(itemText, textColor))
                    i++
                }
                elements.add(MarkdownElement.BulletList(listItems))
            }
            
            // Numbered list
            line.matches(Regex("^\\d+\\.\\s+.+")) -> {
                val listItems = mutableListOf<AnnotatedString>()
                while (i < lines.size && lines[i].trim().matches(Regex("^\\d+\\.\\s+.+"))) {
                    val itemText = lines[i].trim().replaceFirst(Regex("^\\d+\\.\\s+"), "")
                    listItems.add(parseInlineMarkdown(itemText, textColor))
                    i++
                }
                elements.add(MarkdownElement.NumberedList(listItems))
            }
            
            // Blockquote
            line.startsWith(">") -> {
                val quoteLines = mutableListOf<String>()
                while (i < lines.size && lines[i].trim().startsWith(">")) {
                    quoteLines.add(lines[i].trim().removePrefix(">").trim())
                    i++
                }
                val quoteText = quoteLines.joinToString(" ")
                elements.add(MarkdownElement.Blockquote(parseInlineMarkdown(quoteText, textColor)))
            }
            
            // Regular paragraph
            else -> {
                val paragraphLines = mutableListOf<String>()
                while (i < lines.size && 
                    lines[i].trim().isNotEmpty() && 
                    !lines[i].trim().startsWith("#") &&
                    !lines[i].trim().matches(Regex("^[-*+]\\s+.+")) &&
                    !lines[i].trim().matches(Regex("^\\d+\\.\\s+.+")) &&
                    !lines[i].trim().startsWith(">") &&
                    !lines[i].contains("|")
                ) {
                    paragraphLines.add(lines[i])
                    i++
                }
                
                if (paragraphLines.isNotEmpty()) {
                    val paragraphText = paragraphLines.joinToString(" ")
                    elements.add(MarkdownElement.Paragraph(parseInlineMarkdown(paragraphText, textColor)))
                }
            }
        }
    }
    
    return elements
}

private fun parseTable(lines: List<String>): MarkdownElement.Table {
    if (lines.size < 2) return MarkdownElement.Table(emptyList(), emptyList())
    
    // Parse headers
    val headers = lines[0]
        .split("|")
        .map { it.trim() }
        .filter { it.isNotEmpty() }
    
    // Skip separator line (line 1)
    val rows = lines.drop(2).map { line ->
        line.split("|")
            .map { it.trim() }
            .filter { it.isNotEmpty() }
    }.filter { it.isNotEmpty() }
    
    return MarkdownElement.Table(headers, rows)
}

private fun parseInlineMarkdown(text: String, textColor: Color): AnnotatedString {
    return buildAnnotatedString {
        var i = 0
        val chars = text.toCharArray()
        
        while (i < chars.size) {
            when {
                // Bold: **text** or __text__
                i + 1 < chars.size && chars[i] == '*' && chars[i + 1] == '*' -> {
                    val endIndex = text.indexOf("**", i + 2)
                    if (endIndex != -1) {
                        withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = textColor)) {
                            append(text.substring(i + 2, endIndex))
                        }
                        i = endIndex + 2
                    } else {
                        // Don't show the asterisks, just skip them
                        i += 2
                    }
                }
                
                // Strikethrough: ~~text~~
                i + 1 < chars.size && chars[i] == '~' && chars[i + 1] == '~' -> {
                    val endIndex = text.indexOf("~~", i + 2)
                    if (endIndex != -1) {
                        withStyle(SpanStyle(textDecoration = TextDecoration.LineThrough, color = textColor)) {
                            append(text.substring(i + 2, endIndex))
                        }
                        i = endIndex + 2
                    } else {
                        i += 2
                    }
                }
                
                // Italic: *text* (only if not preceded by another *)
                chars[i] == '*' && (i == 0 || chars[i - 1] != '*') -> {
                    val endIndex = text.indexOf('*', i + 1)
                    if (endIndex != -1 && (endIndex + 1 >= chars.size || chars[endIndex + 1] != '*')) {
                        withStyle(SpanStyle(fontStyle = FontStyle.Italic, color = textColor)) {
                            append(text.substring(i + 1, endIndex))
                        }
                        i = endIndex + 1
                    } else {
                        // Skip the asterisk
                        i++
                    }
                }
                
                // Inline code: `code`
                chars[i] == '`' && (i == 0 || chars[i - 1] != '`') -> {
                    val endIndex = text.indexOf('`', i + 1)
                    if (endIndex != -1) {
                        withStyle(
                            SpanStyle(
                                fontFamily = FontFamily.Monospace,
                                background = MarkdownColors.CodeBackground,
                                color = MarkdownColors.CodeText
                            )
                        ) {
                            append(" ${text.substring(i + 1, endIndex)} ")
                        }
                        i = endIndex + 1
                    } else {
                        i++
                    }
                }
                
                // Link: [text](url)
                chars[i] == '[' -> {
                    val linkMatch = Regex("\\[([^\\]]+)\\]\\(([^)]+)\\)").find(text, i)
                    if (linkMatch != null && linkMatch.range.first == i) {
                        val linkText = linkMatch.groupValues[1]
                        withStyle(
                            SpanStyle(
                                color = MarkdownColors.Link,
                                textDecoration = TextDecoration.Underline
                            )
                        ) {
                            append(linkText)
                        }
                        i = linkMatch.range.last + 1
                    } else {
                        withStyle(SpanStyle(color = textColor)) {
                            append(chars[i])
                        }
                        i++
                    }
                }
                
                // Skip hash symbols at start of lines (already handled as headings)
                chars[i] == '#' && (i == 0 || chars[i - 1] == '\n' || chars[i - 1] == ' ') -> {
                    i++
                }
                
                // Regular character
                else -> {
                    withStyle(SpanStyle(color = textColor)) {
                        append(chars[i])
                    }
                    i++
                }
            }
        }
    }
}

// ============================================
// Syntax Highlighting
// ============================================

private fun highlightLine(line: String, language: String?): AnnotatedString {
    val keywords = getKeywordsForLanguage(language)
    
    return buildAnnotatedString {
        var remaining = line
        
        while (remaining.isNotEmpty()) {
            var matched = false
            
            // String literals (double quotes)
            val stringMatch = Regex("^\"(?:[^\"\\\\]|\\\\.)*\"").find(remaining)
            if (stringMatch != null) {
                withStyle(SpanStyle(color = MarkdownColors.StringColor)) {
                    append(stringMatch.value)
                }
                remaining = remaining.substring(stringMatch.value.length)
                matched = true
                continue
            }
            
            // String literals (single quotes)
            val singleStringMatch = Regex("^'(?:[^'\\\\]|\\\\.)*'").find(remaining)
            if (singleStringMatch != null) {
                withStyle(SpanStyle(color = MarkdownColors.StringColor)) {
                    append(singleStringMatch.value)
                }
                remaining = remaining.substring(singleStringMatch.value.length)
                matched = true
                continue
            }
            
            // Comments
            val commentMatch = Regex("^(//.*|#.*|--.*|/\\*.*\\*/)").find(remaining)
            if (commentMatch != null) {
                withStyle(SpanStyle(color = MarkdownColors.CommentColor, fontStyle = FontStyle.Italic)) {
                    append(commentMatch.value)
                }
                remaining = remaining.substring(commentMatch.value.length)
                matched = true
                continue
            }
            
            // Numbers
            val numberMatch = Regex("^\\b\\d+\\.?\\d*\\b").find(remaining)
            if (numberMatch != null) {
                withStyle(SpanStyle(color = MarkdownColors.NumberColor)) {
                    append(numberMatch.value)
                }
                remaining = remaining.substring(numberMatch.value.length)
                matched = true
                continue
            }
            
            // Keywords
            for (keyword in keywords) {
                val keywordMatch = Regex("^\\b$keyword\\b", RegexOption.IGNORE_CASE).find(remaining)
                if (keywordMatch != null) {
                    withStyle(SpanStyle(color = MarkdownColors.KeywordColor, fontWeight = FontWeight.Medium)) {
                        append(keywordMatch.value)
                    }
                    remaining = remaining.substring(keywordMatch.value.length)
                    matched = true
                    break
                }
            }
            
            if (!matched) {
                // Function calls
                val funcMatch = Regex("^(\\w+)\\s*\\(").find(remaining)
                if (funcMatch != null) {
                    withStyle(SpanStyle(color = MarkdownColors.FunctionColor)) {
                        append(funcMatch.groupValues[1])
                    }
                    remaining = remaining.substring(funcMatch.groupValues[1].length)
                } else {
                    // Default
                    withStyle(SpanStyle(color = MarkdownColors.CodeBlockText)) {
                        append(remaining[0])
                    }
                    remaining = remaining.substring(1)
                }
            }
        }
    }
}

private fun getKeywordsForLanguage(language: String?): List<String> {
    return when (language?.lowercase()) {
        "javascript", "js", "typescript", "ts" -> listOf(
            "const", "let", "var", "function", "return", "if", "else", "for", "while",
            "class", "import", "export", "from", "async", "await", "try", "catch",
            "throw", "new", "this", "true", "false", "null", "undefined", "typeof",
            "interface", "type", "enum", "implements", "extends", "public", "private", "protected"
        )
        "python", "py" -> listOf(
            "def", "class", "return", "if", "elif", "else", "for", "while", "import",
            "from", "as", "try", "except", "raise", "with", "True", "False", "None",
            "and", "or", "not", "in", "is", "lambda", "yield", "async", "await", "self"
        )
        "java", "kotlin", "kt" -> listOf(
            "public", "private", "protected", "class", "interface", "extends", "implements",
            "return", "if", "else", "for", "while", "try", "catch", "throw", "new",
            "this", "true", "false", "null", "void", "int", "String", "boolean",
            "static", "final", "fun", "val", "var", "when", "data", "object", "companion"
        )
        "sql" -> listOf(
            "SELECT", "FROM", "WHERE", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "ON",
            "AND", "OR", "NOT", "IN", "LIKE", "ORDER", "BY", "GROUP", "HAVING",
            "INSERT", "UPDATE", "DELETE", "CREATE", "TABLE", "DROP", "ALTER", "INDEX", "NULL", "AS"
        )
        "bash", "shell", "sh" -> listOf(
            "if", "then", "else", "fi", "for", "do", "done", "while", "case", "esac",
            "function", "return", "echo", "exit", "export", "source", "cd", "ls", "rm"
        )
        else -> listOf(
            "if", "else", "for", "while", "return", "function", "class", "import",
            "true", "false", "null", "new", "this", "try", "catch"
        )
    }
}

// ============================================
// Utility Functions
// ============================================

private fun copyToClipboard(context: Context, text: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    val clip = ClipData.newPlainText("Code", text)
    clipboard.setPrimaryClip(clip)
    Toast.makeText(context, "Copied to clipboard", Toast.LENGTH_SHORT).show()
}

fun shareText(context: Context, text: String) {
    val sendIntent = Intent().apply {
        action = Intent.ACTION_SEND
        putExtra(Intent.EXTRA_TEXT, text)
        type = "text/plain"
    }
    val shareIntent = Intent.createChooser(sendIntent, "Share via")
    context.startActivity(shareIntent)
}
