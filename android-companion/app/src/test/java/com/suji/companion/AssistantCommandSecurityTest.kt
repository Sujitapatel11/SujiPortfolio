package com.suji.companion

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class AssistantCommandSecurityTest {
    private val now = Instant.parse("2026-11-18T00:00:00Z")
    private val validUntil = "2099-01-01T00:00:00Z"
    private val nonce = "n".repeat(64)

    @Test fun canonicalHashMatchesBackendPayloadFormat() {
        val appHash = AssistantCommandSecurity.sha256Canonical("desktop.open_application", "app_id", "whatsapp")
        assertEquals("a65cea18bef2c61d036e4720aae7d4d548fae10905469bea46e8d4b8a42bec71", appHash)
        val urlHash = AssistantCommandSecurity.sha256Canonical("browser.open_url", "url", "https://example.com")
        assertEquals("2e5b4ddbe739dff61ede4429df4aa6f0a54d1569038ba9993e2d2068df38d6da", urlHash)
    }

    @Test fun changingAnArgumentChangesItsHash() {
        val whatsapp = AssistantCommandSecurity.sha256Canonical("desktop.open_application", "app_id", "whatsapp")
        val instagram = AssistantCommandSecurity.sha256Canonical("desktop.open_application", "app_id", "instagram")
        assertNotEquals(whatsapp, instagram)
    }

    @Test fun verifiesDeviceBoundApprovedCommand() {
        val hash = AssistantCommandSecurity.sha256Canonical("desktop.open_application", "app_id", "whatsapp")
        val verified = AssistantCommandSecurity.verifyFields(
            commandId = "command-123",
            deviceId = "device-123",
            nonce = nonce,
            expiresAt = validUntil,
            tool = "desktop.open_application",
            arguments = mapOf("app_id" to "whatsapp"),
            suppliedHash = hash,
            expectedDeviceId = "device-123",
            now = now
        )
        assertEquals("whatsapp", verified.appId)
        assertEquals("command-123", verified.commandId)
    }

    @Test fun rejectsWrongDeviceExpiredAndTamperedCommands() {
        val hash = AssistantCommandSecurity.sha256Canonical("desktop.open_application", "app_id", "whatsapp")
        fun verify(
            deviceId: String = "device-123",
            expiry: String = validUntil,
            appId: String = "whatsapp",
            suppliedHash: String = hash
        ) = AssistantCommandSecurity.verifyFields(
            commandId = "command-123",
            deviceId = deviceId,
            nonce = nonce,
            expiresAt = expiry,
            tool = "desktop.open_application",
            arguments = mapOf("app_id" to appId),
            suppliedHash = suppliedHash,
            expectedDeviceId = "device-123",
            now = now
        )

        assertTrue(runCatching { verify(deviceId = "other-device") }.isFailure)
        assertTrue(runCatching { verify(expiry = "2020-01-01T00:00:00Z") }.isFailure)
        assertTrue(runCatching { verify(appId = "unknown_app") }.isFailure)
        assertTrue(runCatching { verify(suppliedHash = "0".repeat(64)) }.isFailure)
    }

    @Test fun rejectsMultipleArgumentsAndUnknownTools() {
        val hash = AssistantCommandSecurity.sha256Canonical("desktop.open_application", "app_id", "whatsapp")
        assertTrue(runCatching {
            AssistantCommandSecurity.verifyFields(
                "command", "device-123", nonce, validUntil,
                "desktop.open_application",
                mapOf("app_id" to "whatsapp", "extra" to "no"),
                hash, "device-123", now
            )
        }.isFailure)
        assertTrue(runCatching {
            AssistantCommandSecurity.verifyFields(
                "command", "device-123", nonce, validUntil,
                "shell.run", mapOf("command" to "whoami"),
                hash, "device-123", now
            )
        }.isFailure)
    }

    @Test fun canonicalJsonHandlesUnicodeAndQuotes() {
        val hash = AssistantCommandSecurity.sha256Canonical(
            "browser.open_url", "url", "https://example.com/?q=नमस्ते&x=\"ok\""
        )
        assertTrue(hash.matches(Regex("^[a-f0-9]{64}$")))
    }
}
