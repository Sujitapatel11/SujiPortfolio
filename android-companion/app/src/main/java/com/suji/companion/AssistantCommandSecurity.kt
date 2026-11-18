package com.suji.companion

import org.json.JSONObject
import java.security.MessageDigest
import java.time.Instant

internal data class VerifiedDeviceCommand(
    val commandId: String,
    val payloadHash: String,
    val nonce: String,
    val tool: String,
    val appId: String? = null,
    val url: String? = null
)

internal object AssistantCommandSecurity {
    private val allowedApps = setOf("browser", "whatsapp", "instagram", "youtube", "calculator", "text_editor")

    fun verify(command: JSONObject, expectedDeviceId: String, now: Instant = Instant.now()): VerifiedDeviceCommand {
        val commandId = command.getString("command_id")
        require(command.getString("device_id") == expectedDeviceId) { "command_device_mismatch" }
        val nonce = command.getString("nonce")
        require(nonce.length in 32..64) { "command_nonce_invalid" }
        require(Instant.parse(command.getString("expires_at")).isAfter(now)) { "command_expired" }

        val tool = command.getString("tool")
        val args = command.getJSONObject("arguments")
        val keys = args.keys().asSequence().toList().sorted()
        require(keys.size == 1) { "command_arguments_invalid" }
        val key = keys.single()
        val value = args.opt(key)
        require(value is String) { "command_argument_type_invalid" }

        val expectedHash = when (tool) {
            "desktop.open_application" -> {
                require(key == "app_id" && value in allowedApps) { "command_app_not_allowed" }
                sha256Canonical(tool, key, value)
            }
            "browser.open_url" -> {
                require(key == "url" && value.isNotBlank()) { "command_url_invalid" }
                sha256Canonical(tool, key, value)
            }
            else -> throw IllegalArgumentException("command_tool_not_allowed")
        }
        val suppliedHash = command.getString("payload_sha256")
        require(MessageDigest.isEqual(
            expectedHash.toByteArray(Charsets.US_ASCII),
            suppliedHash.toByteArray(Charsets.US_ASCII)
        )) { "command_payload_hash_mismatch" }

        return VerifiedDeviceCommand(
            commandId = commandId,
            payloadHash = suppliedHash,
            nonce = nonce,
            tool = tool,
            appId = if (tool == "desktop.open_application") value else null,
            url = if (tool == "browser.open_url") value else null
        )
    }

    fun sha256Canonical(tool: String, argumentName: String, argumentValue: String): String {
        val canonical = "{\"arguments\":{" + jsonString(argumentName) + ":" +
            jsonString(argumentValue) + "},\"tool\":" + jsonString(tool) + "}"
        val bytes = MessageDigest.getInstance("SHA-256").digest(canonical.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }

    private fun jsonString(value: String): String = buildString {
        append('"')
        value.forEach { char ->
            when (char) {
                '"' -> append("\\\"")
                '\\' -> append("\\\\")
                '\b' -> append("\\b")
                '\u000C' -> append("\\f")
                '\n' -> append("\\n")
                '\r' -> append("\\r")
                '\t' -> append("\\t")
                else -> if (char.code < 0x20 || char.code > 0x7e) append("\\u%04x".format(char.code)) else append(char)
            }
        }
        append('"')
    }
}
