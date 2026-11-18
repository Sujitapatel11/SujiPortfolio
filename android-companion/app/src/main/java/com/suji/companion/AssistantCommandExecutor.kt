package com.suji.companion

import android.content.Context
import android.content.Intent
import android.net.Uri
import org.json.JSONObject
import java.net.InetAddress

internal object AssistantCommandExecutor {
    fun execute(context: Context, command: VerifiedDeviceCommand): JSONObject {
        return try {
            when (command.tool) {
                "browser.open_url" -> openUrl(context, command.url ?: error("missing_url"))
                "desktop.open_application" -> openApplication(context, command.appId ?: error("missing_app_id"))
                else -> error("tool_not_supported")
            }
            result(command, "completed", "launch_intent_dispatched", "The Android launch request was accepted by the operating system.")
        } catch (exception: Exception) {
            val code = when (exception.message) {
                "app_not_installed" -> "app_not_installed"
                "unsafe_url" -> "unsafe_url"
                else -> "launch_failed"
            }
            result(command, "failed", code, "Android could not open the requested app or URL.")
        }
    }

    private fun openApplication(context: Context, appId: String) {
        if (appId == "browser") {
            openUrl(context, "https://www.google.com/")
            return
        }
        val packageName = when (appId) {
            "whatsapp" -> "com.whatsapp"
            "instagram" -> "com.instagram.android"
            "youtube" -> "com.google.android.youtube"
            else -> throw IllegalArgumentException("app_not_installed")
        }
        val intent = context.packageManager.getLaunchIntentForPackage(packageName)
            ?: throw IllegalStateException("app_not_installed")
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    private fun openUrl(context: Context, value: String) {
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
        context.startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    private fun result(
        command: VerifiedDeviceCommand, outcome: String, code: String, message: String
    ) = JSONObject()
        .put("command_id", command.commandId)
        .put("payload_sha256", command.payloadHash)
        .put("nonce", command.nonce)
        .put("outcome", outcome)
        .put("result_code", code)
        .put("message", message)
}
