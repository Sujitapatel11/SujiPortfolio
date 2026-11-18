package com.suji.companion

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.text.InputType
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.util.concurrent.Executors

/** Owner-paired Android executor. It receives only approved tasks from the shared FastAPI brain. */
class MainActivity : Activity() {
    private lateinit var status: TextView
    private lateinit var apiBaseInput: EditText
    private lateinit var deviceIdInput: EditText
    private lateinit var deviceTokenInput: EditText
    private var recognizer: SpeechRecognizer? = null
    private val io = Executors.newSingleThreadExecutor()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        render()
        val saved = DeviceCredentialStore.load(this)
        if (saved != null) {
            apiBaseInput.setText(saved.apiBaseUrl)
            deviceIdInput.setText(saved.deviceId)
            status.text = "This phone is paired securely. Start the visible command receiver when you want it online."
        } else if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            status.text = "Pair this phone below. Voice recognition is not available on this device."
        }
    }

    private fun render() {
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(28, 36, 28, 36)
        }
        val title = TextView(this).apply {
            text = "HEY SUJI · ANDROID"
            textSize = 22f
            gravity = Gravity.CENTER
        }
        status = TextView(this).apply {
            text = "Pair this phone with the owner dashboard. Only approved, allowlisted tasks can run here."
            textSize = 14f
            gravity = Gravity.CENTER
            setPadding(0, 24, 0, 24)
        }
        apiBaseInput = EditText(this).apply {
            hint = "Backend URL (https://...)"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            singleLine = true
        }
        deviceIdInput = EditText(this).apply {
            hint = "Device ID"
            inputType = InputType.TYPE_CLASS_TEXT
            singleLine = true
        }
        deviceTokenInput = EditText(this).apply {
            hint = "One-time device token"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            singleLine = true
        }
        val pair = Button(this).apply {
            text = "Verify and pair this phone"
            setOnClickListener { pairDevice() }
        }
        val start = Button(this).apply {
            text = "Start approved-task receiver"
            setOnClickListener { startReceiver() }
        }
        val stop = Button(this).apply {
            text = "Stop receiver"
            setOnClickListener {
                stopService(Intent(this@MainActivity, AssistantPollingService::class.java))
                status.text = "Task receiver stopped. Device pairing remains saved."
            }
        }
        val forget = Button(this).apply {
            text = "Forget this device pairing"
            setOnClickListener {
                stopService(Intent(this@MainActivity, AssistantPollingService::class.java))
                DeviceCredentialStore.clear(this@MainActivity)
                deviceTokenInput.setText("")
                deviceIdInput.setText("")
                status.text = "Local credentials removed. Revoke the device in the owner dashboard as well."
            }
        }
        val localVoice = Button(this).apply {
            text = "Test local voice · open an app"
            setOnClickListener { beginListening() }
        }
        listOf(title, status, apiBaseInput, deviceIdInput, deviceTokenInput, pair, start, stop, forget, localVoice)
            .forEach { view ->
                content.addView(view, LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply { bottomMargin = 10 })
            }
        setContentView(ScrollView(this).apply { addView(content) })
    }

    private fun pairDevice() {
        val base = apiBaseInput.text.toString().trim()
        val deviceId = deviceIdInput.text.toString().trim()
        val token = deviceTokenInput.text.toString().trim()
        if (base.isBlank() || deviceId.isBlank() || token.length < 40) {
            status.text = "Enter the backend URL, device ID and one-time token from the owner dashboard."
            return
        }
        status.text = "Verifying device credentials over HTTPS…"
        io.execute {
            try {
                val normalizedBase = AssistantBackendClient.validateApiBaseUrl(base)
                val verified = AssistantBackendClient.verifyDevice(normalizedBase, deviceId, token)
                if (!verified) throw IllegalStateException("The backend returned a different device identity.")
                DeviceCredentialStore.save(this, DeviceCredentials(normalizedBase, deviceId, token))
                runOnUiThread {
                    deviceTokenInput.setText("")
                    status.text = "Phone paired. Credentials are encrypted with Android Keystore. Start the receiver to accept approved tasks."
                }
            } catch (exception: Exception) {
                runOnUiThread { status.text = exception.message ?: "Pairing failed. Check the backend URL and token." }
            }
        }
    }

    private fun startReceiver() {
        if (DeviceCredentialStore.load(this) == null) {
            status.text = "Pair this phone before starting the task receiver."
            return
        }
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 42)
            status.text = "Allow notifications, then tap Start approved-task receiver again."
            return
        }
        val serviceIntent = Intent(this, AssistantPollingService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(serviceIntent)
            else startService(serviceIntent)
            status.text = "Task receiver started. A visible notification will remain while it polls for approved tasks."
        } catch (exception: Exception) {
            status.text = exception.message ?: "Android could not start the task receiver."
        }
    }

    private fun beginListening() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), 41)
            return
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            status.text = "Speech recognition is not supported on this device."
            return
        }
        recognizer?.destroy()
        recognizer = SpeechRecognizer.createSpeechRecognizer(this).also { speech ->
            speech.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) { status.text = "Listening… बोलिए" }
                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEndOfSpeech() { status.text = "Processing…" }
                override fun onError(error: Int) { status.text = "Voice recognition failed ($error). Try again." }
                override fun onResults(results: Bundle?) {
                    val spoken = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()
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
        when (val parsed = VoiceCommandParser.parse(raw)) {
            is VoiceCommandParser.Result.Launch -> {
                val intent = packageManager.getLaunchIntentForPackage(parsed.app.packageName)
                if (intent == null) {
                    status.text = parsed.app.name.lowercase() + " is not installed on this phone."
                    return
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(intent)
                status.text = "Opened " + parsed.app.name.lowercase() + " locally."
            }
            VoiceCommandParser.Result.Unsupported -> {
                status.text = "I heard: " + raw + ". Try: Open WhatsApp, Instagram, Chrome or YouTube."
            }
            is VoiceCommandParser.Result.NeedsLaunchIntent -> {
                status.text = "Could not open " + parsed.app.name.lowercase() + "."
            }
        }
    }

    override fun onDestroy() {
        recognizer?.destroy()
        recognizer = null
        io.shutdown()
        super.onDestroy()
    }
}
