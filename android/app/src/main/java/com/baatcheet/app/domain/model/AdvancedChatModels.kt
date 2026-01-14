package com.baatcheet.app.domain.model

/**
 * Result of analyzing a user prompt before sending
 * Contains AI recommendations for mode, format, and settings
 */
data class PromptAnalysisResult(
    val detectedMode: String,
    val modeDisplayName: String,
    val modeIcon: String,
    val modeConfidence: Double,
    val alternatives: List<String>,
    val intent: String,
    val format: String,
    val complexity: String,
    val language: String,
    val suggestedTemperature: Double,
    val suggestedMaxTokens: Int,
    val formattingHints: String,
    val shouldMakeTable: Boolean,
    val shouldUseCode: Boolean,
    val codeLanguage: String?
) {
    /**
     * Check if this is a high-confidence detection
     */
    val isHighConfidence: Boolean
        get() = modeConfidence >= 0.7
    
    /**
     * Check if format needs special rendering
     */
    val needsSpecialRendering: Boolean
        get() = shouldMakeTable || shouldUseCode || format == "table" || format == "code"
}

/**
 * Represents an AI mode (chat, code, image-gen, etc.)
 */
data class AIMode(
    val id: String,
    val displayName: String,
    val icon: String,
    val description: String,
    val capabilities: List<String>,
    val requiresSpecialAPI: Boolean,
    val freeDailyLimit: Int,
    val proDailyLimit: Int
) {
    /**
     * Check if this mode has limited usage
     */
    val isLimited: Boolean
        get() = requiresSpecialAPI || freeDailyLimit <= 10
    
    companion object {
        // Predefined modes for offline support
        val DEFAULT_MODES = listOf(
            AIMode("chat", "Chat", "💬", "General conversation", listOf("conversation"), false, 1000, 10000),
            AIMode("code", "Code", "💻", "Programming assistance", listOf("coding", "debugging"), false, 100, 1000),
            AIMode("image-generation", "Create Image", "🎨", "Generate images from text", listOf("image-generation"), true, 1, 50),
            AIMode("vision", "Analyze Image", "👁️", "Analyze and describe images", listOf("image-analysis", "ocr"), true, 10, 200),
            AIMode("web-search", "Browse", "🌐", "Search the web for current info", listOf("web-search"), true, 10, 200),
            AIMode("creative", "Write", "✍️", "Creative writing", listOf("stories", "poems"), false, 50, 500),
            AIMode("math", "Math", "🔢", "Mathematical problem solving", listOf("calculations", "equations"), false, 50, 500),
            AIMode("translate", "Translate", "🌍", "Language translation", listOf("translation"), false, 50, 500),
            AIMode("summarize", "Summarize", "📝", "Summarize long content", listOf("summarization"), false, 50, 500),
            AIMode("tutor", "Tutor", "👨‍🏫", "Patient teaching mode", listOf("teaching", "learning"), false, 50, 500),
        )
    }
}

/**
 * User usage information and quotas
 */
data class UsageInfo(
    val tier: String,
    val messagesUsed: Int,
    val messagesLimit: Int,
    val messagesRemaining: Int,
    val messagesPercentage: Int,
    val imagesUsed: Int,
    val imagesLimit: Int,
    val imagesRemaining: Int,
    val imagesPercentage: Int,
    val resetAt: String
) {
    /**
     * Check if user has reached message limit
     */
    val isMessageLimitReached: Boolean
        get() = messagesRemaining <= 0
    
    /**
     * Check if user has reached image limit
     */
    val isImageLimitReached: Boolean
        get() = imagesRemaining <= 0
    
    /**
     * Get a user-friendly description of remaining quota
     */
    val quotaDescription: String
        get() = "$messagesRemaining/$messagesLimit messages • $imagesRemaining/$imagesLimit images"
    
    /**
     * Check if user is on free tier
     */
    val isFreeTier: Boolean
        get() = tier == "free"
    
    companion object {
        val DEFAULT = UsageInfo(
            tier = "free",
            messagesUsed = 0,
            messagesLimit = 50,
            messagesRemaining = 50,
            messagesPercentage = 0,
            imagesUsed = 0,
            imagesLimit = 1,
            imagesRemaining = 1,
            imagesPercentage = 0,
            resetAt = ""
        )
    }
}

/**
 * Language detection result
 */
data class DetectedLanguageInfo(
    val primaryLanguage: String,
    val confidence: Double,
    val isRomanUrdu: Boolean,
    val urduWordCount: Int,
    val englishWordCount: Int,
    val detectedPatterns: List<String>
) {
    /**
     * Check if the detected language is mixed (Urdu + English)
     */
    val isMixed: Boolean
        get() = primaryLanguage == "mixed"
    
    /**
     * Get user-friendly language name
     */
    val displayName: String
        get() = when (primaryLanguage) {
            "urdu" -> "Roman Urdu"
            "english" -> "English"
            "mixed" -> "Mixed (Urdu + English)"
            else -> "Other"
        }
}

/**
 * Suggestion item for follow-up questions
 */
data class Suggestion(
    val text: String,
    val type: SuggestionType = SuggestionType.QUESTION
)

enum class SuggestionType {
    QUESTION,
    COMMAND,
    TOPIC
}

/**
 * Chat state information for UI
 */
data class ChatState(
    val currentMode: AIMode = AIMode.DEFAULT_MODES.first(),
    val usage: UsageInfo = UsageInfo.DEFAULT,
    val suggestions: List<String> = emptyList(),
    val detectedLanguage: DetectedLanguageInfo? = null,
    val isAnalyzing: Boolean = false,
    val analysisResult: PromptAnalysisResult? = null
)
