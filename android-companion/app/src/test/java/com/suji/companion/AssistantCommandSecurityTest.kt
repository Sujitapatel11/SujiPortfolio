package com.suji.companion

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

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

    @Test fun canonicalJsonHandlesUnicodeAndQuotes() {
        val hash = AssistantCommandSecurity.sha256Canonical(
            "browser.open_url", "url", "https://example.com/?q=नमस्ते&x=\"ok\""
        )
        assertTrue(hash.matches(Regex("^[a-f0-9]{64}$")))
    }
}
