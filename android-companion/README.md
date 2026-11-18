# Hey Suji Android Companion

The Android app is a device executor for the existing FastAPI personal operator. It is not a second AI brain.

## Pair once

1. Sign in to the portfolio admin dashboard and open **Personal Operator Devices**.
2. Under **Pair an Android phone**, generate a device record and copy the backend URL, device ID and one-time device token.
3. Open this Android app and paste those three values into the pairing fields.
4. Tap **Verify and pair this phone**. The app verifies the token against the backend device-status endpoint.
5. Tap **Start approved-task receiver**. Android displays an ongoing notification while the app polls the backend queue.

The device token is encrypted at rest using a key held in Android Keystore. It is never stored in browser local storage. Use the dashboard's **Revoke** control to revoke a lost or retired device. Use **Stop receiver** to pause polling locally.

## Supported commands

- Open WhatsApp, Instagram or YouTube if the native Android app is installed.
- Open a public HTTP(S) URL in the Android default browser.
- Open the default browser.

Every task is proposed by the hosted assistant and requires explicit owner approval before it is queued. The receiver validates device binding, expiry, nonce, arguments and payload SHA-256 before launching anything. It persists the execution receipt before submitting it, so a temporary network failure does not rerun the app-launch side effect.

## Boundaries

- No background microphone or wake word. Voice capture remains an explicit user action.
- No sending messages, submitting applications, purchases, shell commands, arbitrary scripts, OTP or CAPTCHA handling.
- No unrestricted accessibility control.
- The receiver runs only while its visible foreground-service notification is active.
- CI build/unit tests do not replace a real-phone pairing and execution test.

## Build

Open `android-companion` in Android Studio or run `gradle -p android-companion :app:testDebugUnitTest`.
