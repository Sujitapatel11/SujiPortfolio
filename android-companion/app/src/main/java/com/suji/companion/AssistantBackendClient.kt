package com.suji.companion

import android.net.Uri
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

internal object AssistantBackendClient {
    fun validateApiBaseUrl(value: String): String {
        val trimmed = value.trim().trimEnd('/')
        val uri = Uri.parse(trimmed)
        val host = uri.host?.lowercase().orEmpty()
        val local = host in setOf("localhost", "127.0.0.1", "10.0.2.2")
        require(uri.userInfo == null && uri.query == null && uri.fragment == null) {
            "Backend URL must not contain credentials, query parameters or fragments."
        }
        require(uri.path.isNullOrEmpty() || uri.path == "/") {
            "Enter the backend origin only, without an API path."
        }
        require(uri.scheme == "https" || (uri.scheme == "http" && local)) {
            "Use the HTTPS backend URL shown in the owner dashboard."
        }
        require(host.isNotBlank()) { "Backend URL is invalid." }
        return trimmed
    }

    fun verifyDevice(apiBaseUrl: String, deviceId: String, token: String): Boolean {
        val response = request(apiBaseUrl, "/api/assistant/device/status", "GET", token, null)
        return response.optString("device_id") == deviceId && response.optString("status") == "active"
    }

    fun claimNextCommand(credentials: DeviceCredentials): JSONObject? =
        request(
            credentials.apiBaseUrl,
            "/api/assistant/device/commands/next",
            "GET",
            credentials.deviceToken,
            null
        ).optJSONObject("command")

    fun submitCommandResult(credentials: DeviceCredentials, result: JSONObject) {
        val commandId = result.getString("command_id")
        request(
            credentials.apiBaseUrl,
            "/api/assistant/device/commands/$commandId/result",
            "POST",
            credentials.deviceToken,
            result
        )
    }

    private fun request(baseUrl: String, path: String, method: String, token: String, body: JSONObject?): JSONObject {
        val base = validateApiBaseUrl(baseUrl)
        val connection = URL("$base$path").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 7000
            connection.readTimeout = 9000
            connection.instanceFollowRedirects = false
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { it.write(body.toString()) }
            }
            val status = connection.responseCode
            if (status !in 200..299) {
                throw IllegalStateException("Assistant backend request failed (HTTP $status).")
            }
            val input = connection.inputStream ?: return JSONObject()
            val content = BufferedReader(InputStreamReader(input, Charsets.UTF_8)).use { it.readText() }
            return if (content.isBlank()) JSONObject() else JSONObject(content)
        } finally {
            connection.disconnect()
        }
    }
}
