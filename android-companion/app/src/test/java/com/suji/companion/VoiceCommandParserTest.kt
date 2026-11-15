package com.suji.companion

import org.junit.Assert.assertEquals
import org.junit.Test

class VoiceCommandParserTest {
    @Test fun parsesEnglishOpenCommand() {
        assertEquals(VoiceCommandParser.Result.Launch(VoiceCommandParser.App.WHATSAPP),
            VoiceCommandParser.parse("Open WhatsApp"))
    }

    @Test fun parsesHindiVerbAfterAppName() {
        assertEquals(VoiceCommandParser.Result.Launch(VoiceCommandParser.App.INSTAGRAM),
            VoiceCommandParser.parse("Instagram kholo"))
    }

    @Test fun parsesHindiScript() {
        assertEquals(VoiceCommandParser.Result.Launch(VoiceCommandParser.App.YOUTUBE),
            VoiceCommandParser.parse("यूट्यूब खोलो"))
    }

    @Test fun parsesChromeAsBrowser() {
        assertEquals(VoiceCommandParser.Result.Launch(VoiceCommandParser.App.CHROME),
            VoiceCommandParser.parse("Browser open karo"))
    }

    @Test fun doesNotLaunchWhenAppIsOnlyMentioned() {
        assertEquals(VoiceCommandParser.Result.Unsupported,
            VoiceCommandParser.parse("WhatsApp par message kya hai"))
    }

    @Test fun rejectsUnknownApps() {
        assertEquals(VoiceCommandParser.Result.Unsupported,
            VoiceCommandParser.parse("Open Snapchat"))
    }

    @Test fun rejectsEmptyInput() {
        assertEquals(VoiceCommandParser.Result.Unsupported,
            VoiceCommandParser.parse("   "))
    }
}
