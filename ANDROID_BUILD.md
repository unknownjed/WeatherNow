# WeatherNow Android build

The Android project is in `android/` and uses Capacitor. The browser/PWA build remains unchanged.

## One-time setup

Install Android Studio and its bundled JDK, then open this project’s `android/` folder in Android Studio. Let Gradle install the requested Android SDK components.

Before building the APK, set the API origin in the project `.env` file. The native WebView cannot use relative `/api` URLs:

```env
VITE_API_BASE_URL=https://your-weathernow-service.onrender.com
```

Use the actual Render URL for the WeatherNow service. Do not use a laptop-only `localhost` address.

## Build and run

```powershell
npm.cmd run android:debug
```

The debug APK is generated under `android/app/build/outputs/apk/debug/`. You can also open `android/` in Android Studio, select a connected Android device/emulator, and press **Run**.

The native app provides Android audio-file picking, a Media3 foreground music service with notification controls, and a foreground text-to-speech service. YouTube remains an embedded web player and cannot be forced to play in the background outside YouTube’s rules.
