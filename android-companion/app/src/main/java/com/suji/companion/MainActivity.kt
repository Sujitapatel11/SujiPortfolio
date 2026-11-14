package com.suji.companion

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.util.Locale

/**
 * First local-device slice: explicit tap-to-talk and allowlisted app launching.
 * No cloud dispatch and no message sending are enabled in this initial scaffold.
 */
class MainActivity : Activity() {
    private lateinit var status: TextView
    private var recognizer: SpeechRecognizer? = null

    private val appPackages = mapOf(
        "whatsapp" to "com.whatsapp",
        "instagram" to "com.instagram.android",
        "chrome" to "com.android.chrome",
        "youtube" to "com.google.android.youtube"
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        render()
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            status.text = "Speech recognition is unavailable on this device."
        }
    }

    private fun render() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(32, 32, 32, 32)
        }
        val title = TextView(this).apply {
            text = "SUJI · DEVICE COMPANION"
            textSize = 22f
            gravity = Gravity.CENTER
        }
        status = TextView(this).apply {
            text = "This phone will execute its own local commands."
            textSize = 16f
            gravity = Gravity.CENTER
            setPadding(0, 28, 0, 28)
        }
        val listen = Button(this).apply {
            text = "Tap to speak"
            setOnClickListener { beginListening() }
        }
        layout.addView(title)
        layout.addView(status)
        layout.addView(listen)
        setContentView(layout)
    }

    private fun beginListening() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), 41)
            return
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            status.text = "Speech recognition is not supported."
            return
        }
        recognizer?.destroy()
        recognizer = SpeechRecognizer.createSpeechRecognizer(this).also { speech ->
            speech.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) { status.text = "Listening…" }
                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEndOfSpeech() { status.text = "Processing…" }
                override fun onError(error: Int) { status.text = "Voice recognition failed ($error). Try again." }
                override fun onResults(results: Bundle?) {
                    val spoken = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        ?.firstOrNull().orEmpty()
                    executeLocalCommand(spoken)
                }
                override fun onPartialResults(partialResults: Bundle?) {}
                override fun onEvent(eventType: Int, params: Bundle?) {}
            })
            val request = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, "hi-IN")
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "hi-IN")
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            }
            speech.startListening(request)
        }
    }

    private fun executeLocalCommand(raw: String) {
        val text = raw.lowercase(Locale.ROOT).trim()
            .replace(Regex("[.!?।]+$"), "")
        val normalized = when {
            text.contains("whatsapp") || text.contains("व्हाट्सएप") || text.contains("वाट्सएप") -> "whatsapp"
            text.contains("instagram") || text.contains("इंस्टाग्राम") -> "instagram"
            text.contains("chrome") || text.contains("क्रोम") -> "chrome"
            text.contains("youtube") || text.contains("यूट्यूब") -> "youtube"
            else -> null
        }
        if (normalized == null || !(text.startsWith("open") || text.startsWith("ओपन") ||
                    text.startsWith("खोल") || text.startsWith("start") || text.startsWith("चालू"))) {
            status.text = "Heard: $raw. Supported: open WhatsApp, Instagram, Chrome or YouTube."
            return
        }
        val packageName = appPackages[normalized] ?: return
        val launch = packageManager.getLaunchIntentForPackage(packageName)
        if (launch == null) {
            status.text = "$normalized is not installed on this phone."
            return
        }
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(launch)
        status.text = "Opened $normalized on this phone."
    }

    override fun onDestroy() {
        recognizer?.destroy()
        recognizer = null
        super.onDestroy()
    }
}
