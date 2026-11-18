package com.suji.companion

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

data class DeviceCredentials(
    val apiBaseUrl: String,
    val deviceId: String,
    val deviceToken: String,
    val pendingCommand: String? = null,
    val pendingResult: String? = null
)

/** Stores device credentials and execution receipts encrypted with an Android Keystore key. */
internal object DeviceCredentialStore {
    private const val KEY_ALIAS = "suji.operator.device.credentials.v1"
    private const val PREFS = "suji_operator_secure_state"
    private const val VALUE_KEY = "encrypted_payload"

    fun save(context: Context, credentials: DeviceCredentials) {
        val json = JSONObject()
            .put("api_base_url", credentials.apiBaseUrl)
            .put("device_id", credentials.deviceId)
            .put("device_token", credentials.deviceToken)
        credentials.pendingCommand?.let { json.put("pending_command", it) }
        credentials.pendingResult?.let { json.put("pending_result", it) }
        writeEncrypted(context, json)
    }

    fun load(context: Context): DeviceCredentials? {
        val json = readEncrypted(context) ?: return null
        return try {
            DeviceCredentials(
                apiBaseUrl = json.getString("api_base_url"),
                deviceId = json.getString("device_id"),
                deviceToken = json.getString("device_token"),
                pendingCommand = json.optString("pending_command").takeIf { it.isNotBlank() && it != "null" },
                pendingResult = json.optString("pending_result").takeIf { it.isNotBlank() && it != "null" }
            )
        } catch (_: Exception) {
            null
        }
    }

    fun savePendingCommand(context: Context, command: JSONObject) {
        val current = load(context) ?: return
        save(context, current.copy(pendingCommand = command.toString(), pendingResult = null))
    }

    fun clearPendingCommand(context: Context) {
        val current = load(context) ?: return
        save(context, current.copy(pendingCommand = null))
    }

    fun completePendingCommand(context: Context, result: JSONObject) {
        val current = load(context) ?: return
        save(context, current.copy(pendingCommand = null, pendingResult = result.toString()))
    }

    fun clearPendingResult(context: Context) {
        val current = load(context) ?: return
        save(context, current.copy(pendingResult = null))
    }

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .remove(VALUE_KEY).remove("iv").apply()
        try {
            val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
            if (keyStore.containsAlias(KEY_ALIAS)) keyStore.deleteEntry(KEY_ALIAS)
        } catch (_: Exception) { }
    }

    private fun writeEncrypted(context: Context, payload: JSONObject) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val ciphertext = cipher.doFinal(payload.toString().toByteArray(Charsets.UTF_8))
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .putString(VALUE_KEY, Base64.encodeToString(ciphertext, Base64.NO_WRAP))
            .apply()
    }

    private fun readEncrypted(context: Context): JSONObject? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val ivValue = prefs.getString("iv", null) ?: return null
        val ciphertextValue = prefs.getString(VALUE_KEY, null) ?: return null
        return try {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(
                Cipher.DECRYPT_MODE,
                getOrCreateKey(),
                GCMParameterSpec(128, Base64.decode(ivValue, Base64.NO_WRAP))
            )
            JSONObject(String(cipher.doFinal(Base64.decode(ciphertextValue, Base64.NO_WRAP)), Charsets.UTF_8))
        } catch (_: Exception) {
            clear(context)
            null
        }
    }

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build()
        )
        return generator.generateKey()
    }
}
