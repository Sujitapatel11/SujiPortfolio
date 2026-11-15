package com.suji.companion

/** Pure, deterministic parser for the small set of safe device-local launch intents. */
internal object VoiceCommandParser {
    enum class App(val packageName: String, vararg val aliases: String) {
        WHATSAPP("com.whatsapp", "whatsapp", "व्हाट्सएप", "वाट्सएप"),
        INSTAGRAM("com.instagram.android", "instagram", "इंस्टाग्राम"),
        CHROME("com.android.chrome", "chrome", "क्रोम", "browser", "ब्राउज़र"),
        YOUTUBE("com.google.android.youtube", "youtube", "यूट्यूब")
    }

    sealed interface Result {
        data class Launch(val app: App) : Result
        data object Unsupported : Result
        data class NeedsLaunchIntent(val app: App) : Result
    }

    fun parse(command: String): Result {
        val normalized = command.lowercase()
            .replace(Regex("[.!?,;:।]+"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()
        if (normalized.isBlank()) return Result.Unsupported

        val hasLaunchIntent = listOf(
            "open", "launch", "start", " kholo", " khol", "खोलो", "खोल", "चालू", "चलाओ"
        ).any { phrase -> normalized.contains(phrase.trim()) }
        if (!hasLaunchIntent) return Result.Unsupported

        val app = App.values().firstOrNull { candidate ->
            candidate.aliases.any { alias ->
                Regex("(^|[^\\p{L}\\p{N}])" + Regex.escape(alias) + "([^\\p{L}\\p{N}]|$)")
                    .containsMatchIn(normalized)
            }
        } ?: return Result.Unsupported
        return Result.Launch(app)
    }
}
