# Hey Suji Android Companion

The Android app is a device executor for the existing FastAPI personal operator. It is not a second AI brain.

## Pair once

1. Sign in to the portfolio admin dashboard and open **Personal Operator Devices**.
2. Under **Pair an Android phone**, generate a device record and copy the backend URL, device ID and one-time device token.
3. Open this Android app and paste those three values into the pairing fields.
4. Tap **Verify and pair this phone**. The app verifies the token against the backend device-status endpoint.
5. Tap **Start approved-task receiver**. Android displays an ongoing notification while the app polls the backend queue.

The device token is encrypted at rest using a key held in Android Keystore. It is never stored in browser local storage. Use the dashboard's **Revoke** control to revoke a lost or retired device. Use **Stop receiver** to pause polling locally.

## How an approved task runs

1. Ask Hey Suji to prepare an allowlisted app-launch or public-URL action on a session bound to this phone.
2. Review and approve the exact proposal in the owner dashboard.
3. The phone receives the approved command and shows a separate notification.
4. Tap that notification. Android opens the companion activity and dispatches the approved launch while the activity is visible.
5. The result is encrypted locally, sent back to FastAPI, and recorded in the operator action history.

Android restricts activities started from the background. The notification tap is deliberate: a foreground service must not silently force another app to the front. The foreground receiver only queues the command and surfaces the notification.

The device verifies device identity, command expiry, nonce, tool allowlist and canonical SHA-256 payload before it can be executed. A temporary reporting failure retries the saved result instead of repeating the app launch.

## Supported actions

- Open WhatsApp, Instagram or YouTube if the native Android app is installed.
- Open Calculator where a supported calculator package is installed.
- Open a public HTTP(S) URL in the Android default browser.
- Open the default browser.

## Boundaries

- No background microphone or wake word. Voice capture remains an explicit user action.
- No sending messages, submitting applications, purchases, shell commands, arbitrary scripts, OTP or CAPTCHA handling.
- No unrestricted accessibility control.
- The receiver runs only while its visible foreground-service notification is active. Android may time-limit data-sync foreground services; start it manually when you need mobile execution.
- CI build/unit tests do not replace a real-phone pairing and execution test.

## Build

Open `android-companion` in Android Studio or run `gradle -p android-companion :app:assembleDebug :app:testDebugUnitTest`.
