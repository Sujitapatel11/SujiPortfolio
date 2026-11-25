package com.suji.companion

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.time.Instant
import java.util.concurrent.atomic.AtomicBoolean

/** User-started foreground receiver. It queues approved commands for an explicit notification tap. */
class AssistantPollingService : Service() {
    private val stopping = AtomicBoolean(false)
    private var worker: Thread? = null
    @Volatile private var lastNotifiedCommandId: String? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopping.set(true)
            worker?.interrupt()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }
        createNotificationChannels()
        startForeground(NOTIFICATION_ID, buildServiceNotification("Connected · waiting for approved tasks"))
        if (worker?.isAlive != true) {
            stopping.set(false)
            worker = Thread({ pollLoop() }, "suji-android-command-poller").apply {
                isDaemon = true
                start()
            }
        }
        return START_STICKY
    }

    private fun pollLoop() {
        while (!stopping.get()) {
            try {
                val credentials = DeviceCredentialStore.load(this)
                if (credentials == null) {
                    updateServiceNotification("Pair this phone again to receive tasks")
                    stopping.set(true)
                    break
                }

                when {
                    !credentials.pendingResult.isNullOrBlank() -> {
                        AssistantBackendClient.submitCommandResult(credentials, JSONObject(credentials.pendingResult))
                        DeviceCredentialStore.clearPendingResult(this)
                        updateServiceNotification("Task result sent to Hey Suji")
                    }
                    !credentials.pendingCommand.isNullOrBlank() -> {
                        val command = JSONObject(credentials.pendingCommand)
                        val commandId = command.optString("command_id")
                        val expiry = Instant.parse(command.getString("expires_at"))
                        if (!expiry.isAfter(Instant.now())) {
                            DeviceCredentialStore.clearPendingCommand(this)
                            lastNotifiedCommandId = null
                            updateServiceNotification("Approved task expired · create a new approval")
                        } else if (commandId != lastNotifiedCommandId) {
                            showApprovedTaskNotification(command)
                            lastNotifiedCommandId = commandId
                        }
                    }
                    else -> {
                        val command = AssistantBackendClient.claimNextCommand(credentials)
                        if (command != null) {
                            AssistantCommandSecurity.verify(command, credentials.deviceId)
                            DeviceCredentialStore.savePendingCommand(this, command)
                            showApprovedTaskNotification(command)
                            lastNotifiedCommandId = command.optString("command_id")
                        }
                    }
                }
            } catch (_: InterruptedException) {
                Thread.currentThread().interrupt()
                break
            } catch (_: DeviceRevokedException) {
                DeviceCredentialStore.clear(this)
                updateServiceNotification("Device credential revoked · pair again from the owner dashboard")
                stopping.set(true)
                break
            } catch (_: Exception) {
                updateServiceNotification("Connection issue · retrying securely")
            }

            try {
                Thread.sleep(POLL_INTERVAL_MS)
            } catch (_: InterruptedException) {
                Thread.currentThread().interrupt()
                break
            }
        }
        stopSelf()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(
                NotificationChannel(
                    SERVICE_CHANNEL_ID,
                    "Hey Suji connection",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "Quiet status while the approved-task receiver is connected."
                }
            )
            manager.createNotificationChannel(
                NotificationChannel(
                    TASK_CHANNEL_ID,
                    "Hey Suji approved tasks",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Tap to run the exact action you already approved in Hey Suji."
                }
            )
        }
    }

    private fun showApprovedTaskNotification(command: JSONObject) {
        val commandId = command.optString("command_id")
        val appId = command.optJSONObject("arguments")?.optString("app_id")
        val description = when (command.optString("tool")) {
            "desktop.open_application" -> "Open " + (appId ?: "approved app")
            "browser.open_url" -> "Open approved website"
            else -> "Run approved task"
        }
        val openIntent = Intent(this, MainActivity::class.java).apply {
            action = MainActivity.ACTION_EXECUTE_APPROVED
            putExtra(MainActivity.EXTRA_COMMAND_ID, commandId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            commandId.hashCode(),
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        getSystemService(NotificationManager::class.java).notify(
            TASK_NOTIFICATION_ID,
            NotificationCompat.Builder(this, TASK_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Hey Suji · approved task ready")
                .setContentText(description + " · tap to execute on this phone")
                .setStyle(NotificationCompat.BigTextStyle().bigText(
                    description + ". You already approved this exact action in the owner dashboard. Tap to run it now."
                ))
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setOnlyAlertOnce(true)
                .build()
        )
    }

    private fun buildServiceNotification(message: String): Notification =
        NotificationCompat.Builder(this, SERVICE_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Hey Suji is connected")
            .setContentText(message)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build()

    private fun updateServiceNotification(message: String) {
        getSystemService(NotificationManager::class.java)
            .notify(NOTIFICATION_ID, buildServiceNotification(message))
    }

    override fun onBind(intent: Intent?): IBinder? = null

    @Suppress("OVERRIDE_DEPRECATION")
    override fun onTimeout(startId: Int, fgsType: Int) {
        stopping.set(true)
        worker?.interrupt()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf(startId)
    }

    override fun onDestroy() {
        stopping.set(true)
        worker?.interrupt()
        worker = null
        super.onDestroy()
    }

    companion object {
        const val ACTION_STOP = "com.suji.companion.STOP_RECEIVER"
        private const val SERVICE_CHANNEL_ID = "suji_operator_service"
        private const val TASK_CHANNEL_ID = "suji_operator_tasks"
        private const val NOTIFICATION_ID = 7301
        private const val TASK_NOTIFICATION_ID = 7302
        private const val POLL_INTERVAL_MS = 15000L
    }
}
