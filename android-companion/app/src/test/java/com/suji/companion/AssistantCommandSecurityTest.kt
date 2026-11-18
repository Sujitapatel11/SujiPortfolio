package com.suji.companion

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.json.JSONObject
import java.time.Instant

class AssistantCommandSecurityTest {
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
        val payloadHash = AssistantCommandSecurity.sha256Canonical(
            "desktop.open_application", "app_id", "whatsapp"
        )
        val command = JSONObject()
            .put("command_id", "command-123")
            .put("device_id", "device-123")
            .put("nonce", "n".repeat(64))
            .put("expires_at", "2099-01-01T00:00:00Z")
            .put("tool", "desktop.open_application")
            .put("arguments", JSONObject().put("app_id", "whatsapp"))
            .put("payload_sha256", payloadHash)

        val verified = AssistantCommandSecurity.verify(
            command, "device-123", Instant.parse("2026-11-18T00:00:00Z")
        )
        assertEquals("whatsapp", verified.appId)
    }

    @Test fun rejectsWrongDeviceExpiredAndTamperedCommands() {
        val hash = AssistantCommandSecurity.sha256Canonical(
            "desktop.open_application", "app_id", "whatsapp"
        )
        val base = JSONObject()
            .put("command_id", "command-123")
            .put("device_id", "device-123")
            .put("nonce", "n".repeat(64))
            .put("expires_at", "2020-01-01T00:00:00Z")
            .put("tool", "desktop.open_application")
            .put("arguments", JSONObject().put("app_id", "whatsapp"))
            .put("payload_sha256", hash)
        assertTrue(runCatching {
            AssistantCommandSecurity.verify(base, "other-device", Instant.parse("2026-11-18T00:00:00Z"))
        }.isFailure)
        assertTrue(runCatching {
            AssistantCommandSecurity.verify(base, "device-123", Instant.parse("2026-11-18T00:00:00Z"))
        }.isFailure)

        base.put("expires_at", "2099-01-01T00:00:00Z")
        base.put("arguments", JSONObject().put("app_id", "unknown_app"))
        assertTrue(runCatching {
            AssistantCommandSecurity.verify(base, "device-123", Instant.parse("2026-11-18T00:00:00Z"))
        }.isFailure)
    }

    @Test fun canonicalJsonHandlesUnicodeAndQuotes() {
        val hash = AssistantCommandSecurity.sha256Canonical(
            "browser.open_url", "url", "https://example.com/?q=नमस्ते&x=\"ok\""
        )
        assertTrue(hash.matches(Regex("^[a-f0-9]{64}$")))
    }
}
