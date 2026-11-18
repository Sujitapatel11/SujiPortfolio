package com.suji.companion

import android.content.Context
import android.content.Intent
import android.net.Uri
import org.json.JSONObject
import java.net.InetAddress

internal data class PreparedLaunch(val intent: Intent)

internal object AssistantCommandExecutor {
    /** Performs slow destination/package validation away from the UI thread. */
    fun prepare(context: Context, command: VerifiedDeviceCommand): PreparedLaunch {
        return when (command.tool) {
            "browser.open_url" -> PreparedLaunch(buildUrlIntent(command.url ?: error("missing_url")))
            "desktop.open_application" -> PreparedLaunch(buildAppIntent(context, command.appId ?: error("missing_app_id")))
            else -> throw IllegalArgumentException("tool_not_supported")
        }
    }

    private fun buildAppIntent(context: Context, appId: String): Intent {
        if (appId == "browser") return buildUrlIntent("https://www.google.com/")
        val packageNames = when (appId) {
            "whatsapp" -> listOf("com.whatsapp")
            "instagram" -> listOf("com.instagram.android")
            "youtube" -> listOf("com.google.android.youtube")
            "calculator" -> listOf("com.google.android.calculator", "com.android.calculator2")
            else -> throw IllegalArgumentException("app_not_installed")
        }
        return packageNames.firstNotNullOfOrNull { packageName ->
            context.packageManager.getLaunchIntentForPackage(packageName)
        } ?: throw IllegalStateException("app_not_installed")
    }

    private fun buildUrlIntent(value: String): Intent {
        val uri = Uri.parse(value)
        val scheme = uri.scheme?.lowercase()
        val host = uri.host?.lowercase()
        if (scheme !in setOf("https", "http") || host.isNullOrBlank() || uri.userInfo != null) {
            throw IllegalArgumentException("unsafe_url")
        }
        val addresses = InetAddress.getAllByName(host)
        if (addresses.isEmpty() || addresses.any {
                it.isAnyLocalAddress || it.isLoopbackAddress || it.isLinkLocalAddress ||
                    it.isSiteLocalAddress || it.isMulticastAddress
            } || host == "localhost" || host.endsWith(".localhost")) {
            throw IllegalArgumentException("unsafe_url")
        }
        return Intent(Intent.ACTION_VIEW, uri)
    }

    fun result(
        command: VerifiedDeviceCommand, outcome: String, code: String, message: String
    ) = JSONObject()
        .put("command_id", command.commandId)
        .put("payload_sha256", command.payloadHash)
        .put("nonce", command.nonce)
        .put("outcome", outcome)
        .put("result_code", code)
        .put("message", message)
}
