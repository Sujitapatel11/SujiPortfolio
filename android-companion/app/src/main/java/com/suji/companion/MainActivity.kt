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
import org.json.JSONObject
import java.util.concurrent.Executors

/** Owner-paired Android executor for the existing FastAPI personal operator. */
class MainActivity : Activity() {
    private lateinit var status: TextView
    private lateinit var apiBaseInput: EditText
    private lateinit var deviceIdInput: EditText
    private lateinit var deviceTokenInput: EditText
    private var recognizer: SpeechRecognizer? = null
    private val io = Executors.newSingleThreadExecutor()
    @Volatile private var executingCommandId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        render()
        val saved = DeviceCredentialStore.load(this)
        if (saved != null) {
            apiBaseInput.setText(saved.apiBaseUrl)
            deviceIdInput.setText(saved.deviceId)
            status.text = "This phone is paired securely. Start the visible task receiver when you want it online."
        } else if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            status.text = "Pair this phone below. Voice recognition is not available on this device."
        }
        handleApprovedTaskIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleApprovedTaskIntent(intent)
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
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
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
                runOnUiThread {
                    status.text = exception.message ?: "Pairing failed. Check the backend URL and token."
                }
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
        try {
            val serviceIntent = Intent(this, AssistantPollingService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(serviceIntent)
            else startService(serviceIntent)
            status.text = "Task receiver started. Keep its notification enabled to receive approved tasks."
        } catch (exception: Exception) {
            status.text = exception.message ?: "Android could not start the task receiver."
        }
    }

    private fun handleApprovedTaskIntent(intent: Intent?) {
        if (intent?.action != ACTION_EXECUTE_APPROVED) return
        val requestedCommandId = intent.getStringExtra(EXTRA_COMMAND_ID).orEmpty()
        if (requestedCommandId.isBlank() || executingCommandId == requestedCommandId) return
        executingCommandId = requestedCommandId
        status.text = "Verifying the approved task before opening it…"

        io.execute {
            var verifiedCommand: VerifiedDeviceCommand? = null
            try {
                val credentials = DeviceCredentialStore.load(this)
                    ?: throw IllegalStateException("This phone is no longer paired.")
                val rawCommand = credentials.pendingCommand
                    ?: throw IllegalStateException("There is no pending approved task.")
                val command = JSONObject(rawCommand)
                if (command.optString("command_id") != requestedCommandId) {
                    throw IllegalStateException("The pending task does not match this notification.")
                }
                val verified = AssistantCommandSecurity.verify(command, credentials.deviceId)
                verifiedCommand = verified
                val prepared = AssistantCommandExecutor.prepare(this, verified)

                runOnUiThread {
                    val result = try {
                        startActivity(prepared.intent)
                        AssistantCommandExecutor.result(
                            verified,
                            "completed",
                            "launch_intent_dispatched",
                            "Android accepted the approved launch request."
                        )
                    } catch (_: Exception) {
                        AssistantCommandExecutor.result(
                            verified,
                            "failed",
                            "launch_failed",
                            "Android could not open the requested app or URL."
                        )
                    }
                    DeviceCredentialStore.completePendingCommand(this, result)
                    status.text = if (result.optString("outcome") == "completed") {
                        "Android accepted the approved launch request. Sending the result to Hey Suji."
                    } else {
                        "Task failed: " + result.optString("result_code")
                    }
                    startReceiverForResultDelivery()
                    executingCommandId = null
                }
            } catch (exception: Exception) {
                val verified = verifiedCommand
                if (verified != null) {
                    val failure = AssistantCommandExecutor.result(
                        verified,
                        "failed",
                        "preparation_failed",
                        "The phone could not prepare the approved app or website launch."
                    )
                    DeviceCredentialStore.completePendingCommand(this, failure)
                    runOnUiThread {
                        status.text = "Task failed safely. Sending the result to Hey Suji."
                        startReceiverForResultDelivery()
                        executingCommandId = null
                    }
                } else {
                    executingCommandId = null
                    runOnUiThread {
                        status.text = exception.message ?: "The approved task could not be executed."
                    }
                }
            }
        }
    }

    private fun startReceiverForResultDelivery() {
        val credentials = DeviceCredentialStore.load(this) ?: return
        if (credentials.pendingResult == null) return
        try {
            val serviceIntent = Intent(this, AssistantPollingService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(serviceIntent)
            else startService(serviceIntent)
        } catch (exception: Exception) {
            status.text = "Task ran, but result reporting could not restart: " +
                (exception.message ?: "unknown error")
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
        when (val parsed = VoiceCommandParser.parse(raw)) {
            is VoiceCommandParser.Result.Launch -> {
                val launchIntent = packageManager.getLaunchIntentForPackage(parsed.app.packageName)
                if (launchIntent == null) {
                    status.text = parsed.app.name.lowercase() + " is not installed on this phone."
                    return
                }
                startActivity(launchIntent)
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

    companion object {
        const val ACTION_EXECUTE_APPROVED = "com.suji.companion.EXECUTE_APPROVED_TASK"
        const val EXTRA_COMMAND_ID = "approved_command_id"
    }
}
