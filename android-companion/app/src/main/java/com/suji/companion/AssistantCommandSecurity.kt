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

    /** Android JSON adapter. Parsing is kept separate from the pure validation tested on the JVM. */
    fun verify(command: JSONObject, expectedDeviceId: String, now: Instant = Instant.now()): VerifiedDeviceCommand {
        val argsJson = command.getJSONObject("arguments")
        val arguments = linkedMapOf<String, String>()
        val keys = argsJson.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            val value = argsJson.opt(key)
            require(value is String) { "command_argument_type_invalid" }
            arguments[key] = value
        }
        return verifyFields(
            commandId = command.getString("command_id"),
            deviceId = command.getString("device_id"),
            nonce = command.getString("nonce"),
            expiresAt = command.getString("expires_at"),
            tool = command.getString("tool"),
            arguments = arguments,
            suppliedHash = command.getString("payload_sha256"),
            expectedDeviceId = expectedDeviceId,
            now = now
        )
    }

    /** Pure deterministic validation so hash, expiry and device-binding tests run on the JVM. */
    fun verifyFields(
        commandId: String,
        deviceId: String,
        nonce: String,
        expiresAt: String,
        tool: String,
        arguments: Map<String, String>,
        suppliedHash: String,
        expectedDeviceId: String,
        now: Instant = Instant.now()
    ): VerifiedDeviceCommand {
        require(commandId.isNotBlank()) { "command_id_invalid" }
        require(deviceId == expectedDeviceId) { "command_device_mismatch" }
        require(nonce.length in 32..64) { "command_nonce_invalid" }
        require(Instant.parse(expiresAt).isAfter(now)) { "command_expired" }
        require(arguments.size == 1) { "command_arguments_invalid" }

        val key = arguments.keys.single()
        val value = arguments.values.single()
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
        require(suppliedHash.matches(Regex("^[a-f0-9]{64}$"))) { "command_hash_invalid" }
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
