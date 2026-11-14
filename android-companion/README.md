# Suji Android Companion (initial scaffold)

This is the first Android-local execution slice for the unified device-aware assistant.

## Current scope
- Native Android app shell.
- Explicit tap-to-talk using Android speech recognition (Hindi locale).
- Strictly local allowlisted app launching: WhatsApp, Instagram, Chrome and YouTube.
- Reports success only after Android resolves and starts the target app.

## Not implemented yet
- Hosted backend pairing / device registration.
- Secure credential storage and revocation.
- Device-bound command queue and result reporting.
- AccessibilityService workflows.
- Background microphone / wake-word operation.
- Sending WhatsApp messages or other consequential actions.

The app intentionally does not send messages. Message sending must be a separate, explicit, user-confirmed feature after the secure command protocol is implemented.

## Build
Open the `android-companion` folder in Android Studio and build the app. The Android SDK and Gradle toolchain are required.
