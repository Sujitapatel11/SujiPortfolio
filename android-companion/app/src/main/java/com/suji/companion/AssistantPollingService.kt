package com.suji.companion

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicBoolean

/** Visible, user-started foreground receiver for owner-approved device commands. */
class AssistantPollingService : Service() {
    private val stopping = AtomicBoolean(false)
    private var worker: Thread? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopping.set(true)
            worker?.interrupt()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }

        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification("Connected · waiting for approved tasks"))
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
                    updateNotification("Pair this phone again to receive tasks")
                    stopping.set(true)
                    break
                }

                val pending = credentials.pendingResult
                if (!pending.isNullOrBlank()) {
                    AssistantBackendClient.submitCommandResult(credentials, JSONObject(pending))
                    DeviceCredentialStore.clearPendingResult(this)
                } else {
                    val command = AssistantBackendClient.claimNextCommand(credentials)
                    if (command != null) {
                        val verified = AssistantCommandSecurity.verify(command, credentials.deviceId)
                        val result = AssistantCommandExecutor.execute(this, verified)
                        // Persist the exact receipt first; retry reporting without replaying the app launch.
                        DeviceCredentialStore.savePendingResult(this, result)
                        AssistantBackendClient.submitCommandResult(credentials, result)
                        DeviceCredentialStore.clearPendingResult(this)
                        updateNotification("Last approved task: " + result.optString("outcome"))
                    }
                }
            } catch (_: InterruptedException) {
                Thread.currentThread().interrupt()
                break
            } catch (_: Exception) {
                updateNotification("Connection issue · retrying securely")
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

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getSystemService(NotificationManager::class.java).createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "Hey Suji task receiver",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "Visible status while this phone receives approved assistant tasks."
                }
            )
        }
    }

    private fun buildNotification(message: String): Notification =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Hey Suji is connected")
            .setContentText(message)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build()

    private fun updateNotification(message: String) {
        getSystemService(NotificationManager::class.java)
            .notify(NOTIFICATION_ID, buildNotification(message))
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        stopping.set(true)
        worker?.interrupt()
        worker = null
        super.onDestroy()
    }

    companion object {
        const val ACTION_STOP = "com.suji.companion.STOP_RECEIVER"
        private const val CHANNEL_ID = "suji_operator_receiver"
        private const val NOTIFICATION_ID = 7301
        private const val POLL_INTERVAL_MS = 2500L
    }
}
