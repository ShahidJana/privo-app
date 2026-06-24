# Privo — Complete Project Setup Requirements
## Every Single Thing You Need (Zero to Running App)

> Is guide ko upar se neeche follow karo. Koi step skip mat karo. Har step ke baad checkpoint hai — verify karo phir aage barhao.

---

# PART 1 — System Requirements (Tumhara Computer)

## 1.1 Minimum Hardware

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 8GB | 16GB |
| Storage (free) | 20GB | 40GB |
| Processor | Intel i5 / AMD Ryzen 5 | Intel i7 / AMD Ryzen 7 |
| OS | Windows 10 64-bit | Windows 11 / macOS / Ubuntu |

> **Note:** Android development Windows pe perfectly kaam karta hai. macOS zaruri nahi (iOS ke liye hoga — v2 mein).

---

# PART 2 — Software Installation (Exact Order Follow Karo)

## Step 1 — Node.js

**Kyun:** React Native Node.js pe run karta hai.

**Install:**
1. https://nodejs.org pe jao
2. **LTS version** download karo (v20.x ya v22.x) — "Current" nahi
3. Install karo default settings ke saath

**Verify:**
```bash
node --version    # v20.x.x hona chahiye
npm --version     # 10.x.x hona chahiye
```

✅ **Checkpoint:** Dono commands version show karein.

---

## Step 2 — Java Development Kit (JDK)

**Kyun:** Android apps Java/Kotlin compile karne ke liye JDK chahiye.

**Install — Exact version important hai:**
```bash
# Windows — winget se (PowerShell Admin mein):
winget install Microsoft.OpenJDK.17

# Ya manually:
# https://adoptium.net pe jao
# Temurin 17 (LTS) download karo
```

**Environment variable set karo (Windows):**
1. `Windows + R` → `sysdm.cpl` → Advanced → Environment Variables
2. New System Variable:
   - Name: `JAVA_HOME`
   - Value: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x.x-hotspot`
3. `Path` mein add karo: `%JAVA_HOME%\bin`

**Verify:**
```bash
java --version    # openjdk 17.x.x hona chahiye
javac --version   # javac 17.x.x hona chahiye
echo %JAVA_HOME%  # Path show hona chahiye
```

✅ **Checkpoint:** Teeno commands sahi output dein.

> ⚠️ **Common mistake:** JDK 11 ya JDK 21 install kar lete hain. React Native ke liye JDK 17 best hai abhi.

---

## Step 3 — Android Studio

**Kyun:** Android SDK, emulator, aur native build tools ke liye.

**Install:**
1. https://developer.android.com/studio download karo
2. Install karo — "Standard" installation select karo
3. Pehli launch pe SDK download hoga (~2-3 GB) — wait karo

**SDK Setup (Android Studio ke andar):**
1. `SDK Manager` kholo (Tools → SDK Manager)
2. **SDK Platforms tab:**
   - Android 14 (API 34) ✅ check karo
   - Android 8.0 (API 26) ✅ check karo (min SDK)
3. **SDK Tools tab:**
   - Android SDK Build-Tools ✅
   - Android SDK Platform-Tools ✅
   - Android Emulator ✅
   - Intel x86 Emulator Accelerator (HAXM) ✅ (Intel processor hai to)
4. Apply → OK → download hone do

**Environment Variables (Windows):**
```
ANDROID_HOME = C:\Users\YourName\AppData\Local\Android\Sdk

Path mein add karo:
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
```

**Verify:**
```bash
adb --version
# Android Debug Bridge version 1.x.x hona chahiye
```

✅ **Checkpoint:** `adb --version` kaam kare.

---

## Step 4 — Android Emulator (Virtual Device)

**Android Studio mein:**
1. `Device Manager` kholo (Tools → Device Manager)
2. `Create Device` click karo
3. **Hardware:** Pixel 7 select karo
4. **System Image:** API 34 (Android 14) — `x86_64` architecture
5. Download karo agar nahi hai → Finish

**Emulator start karo:**
- Device Manager mein Play button dabao
- Pehli baar 2-3 minute lagenge start hone mein

✅ **Checkpoint:** Android home screen emulator mein dikhe.

> 💡 **Physical device bhi use kar sakte ho (better performance):**
> 1. Phone mein `Developer Options` on karo (Settings → About → Build Number 7 baar tap karo)
> 2. `USB Debugging` on karo
> 3. USB se PC se connect karo
> 4. `adb devices` — device list mein dikhe

---

## Step 5 — VS Code

**Install:**
1. https://code.visualstudio.com download karo
2. Install karo

**Extensions install karo (Ctrl+Shift+X):**

**Mandatory:**
```
msjsdiag.vscode-react-native     → React Native Tools
dbaeumer.vscode-eslint            → ESLint
esbenp.prettier-vscode            → Prettier
usernamehako.errorlens            → Error Lens
eamodio.gitlens                   → GitLens
dsznajder.es7-react-js-snippets   → React Snippets
christian-kohler.path-intellisense → Path Autocomplete
```

**Helpful:**
```
pkief.material-icon-theme         → File icons
zhuangtongfa.numerated-bookmarks  → Code bookmarks
qwtel.sqlite-viewer               → SQLite file viewer (debug ke liye)
```

✅ **Checkpoint:** Extensions sidebar mein installed dikh rahein.

---

## Step 6 — Git

**Install:**
1. https://git-scm.com download karo
2. Install — default settings

**Setup:**
```bash
git config --global user.name "Tumhara Naam"
git config --global user.email "tumhari@email.com"
git config --global core.autocrlf true   # Windows ke liye
```

**GitHub account:**
1. https://github.com pe account banao (free)
2. New repository banao: `privo-app` (Private)

**Verify:**
```bash
git --version    # git version 2.x.x
```

✅ **Checkpoint:** Git version show kare, GitHub account ready ho.

---

## Step 7 — EAS CLI (Build Tool)

**Kyun:** Production builds aur Play Store upload ke liye.

```bash
npm install -g eas-cli

# Verify:
eas --version    # eas-cli/x.x.x
```

**Expo account banao:**
1. https://expo.dev pe signup karo (free)
2. Login karo:
```bash
eas login
# Email aur password enter karo
```

✅ **Checkpoint:** `eas whoami` tumhara username show kare.

---

## Step 8 — Yarn (Package Manager)

**Kyun:** npm se faster aur React Native community standard.

```bash
npm install -g yarn

# Verify:
yarn --version   # 1.22.x
```

✅ **Checkpoint:** Yarn version show kare.

---

# PART 3 — Project Creation

## Step 9 — React Native Project Banao

```bash
# Jahan project banana hai us folder mein jao:
cd C:\Projects   # ya apni marzi ki jagah

# React Native project create karo (Bare Workflow):
npx react-native@latest init Privo --template react-native-template-typescript

# Project folder mein jao:
cd Privo
```

> ⚠️ Expo Go use nahi kar rahe — Bare Workflow use kar rahe hain kyunki SQLCipher aur Keystore native access chahiye.

**Verify — Android pe run karo:**
```bash
# Emulator already running hona chahiye

yarn android
# Ya:
npx react-native run-android
```

First time 5-10 minute lagenge (Gradle download).

✅ **Checkpoint:** "Welcome to React Native" screen emulator/phone pe dikhe.

---

## Step 10 — TypeScript Strict Mode

`tsconfig.json` open karo aur replace karo:

```json
{
  "extends": "@react-native/typescript-config/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@core/*": ["src/core/*"],
      "@features/*": ["src/features/*"],
      "@ui/*": ["src/ui/*"],
      "@lib/*": ["src/lib/*"],
      "@store/*": ["src/store/*"]
    }
  },
  "include": ["src", "__tests__"]
}
```

---

## Step 11 — Folder Structure Banao

```bash
# src folder structure create karo:
mkdir -p src/app/onboarding
mkdir -p src/app/lock
mkdir -p src/app/documents
mkdir -p src/app/udhaar
mkdir -p src/app/vault
mkdir -p src/features/documents
mkdir -p src/features/udhaar
mkdir -p src/features/vault
mkdir -p src/core/crypto
mkdir -p src/core/db/migrations
mkdir -p src/core/db/dao
mkdir -p src/core/security
mkdir -p src/core/backup
mkdir -p src/ui/components
mkdir -p src/ui/theme
mkdir -p src/ui/i18n
mkdir -p src/lib
mkdir -p src/store
mkdir -p __tests__/unit
mkdir -p __tests__/integration
mkdir -p __tests__/e2e
mkdir -p .vscode
```

---

# PART 4 — Dependencies Installation

## Step 12 — Core Dependencies

**Ek ek karke install karo — error aaye to solve karo phir aage barhao:**

### Navigation:
```bash
yarn add @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
yarn add react-native-screens react-native-safe-area-context
yarn add react-native-gesture-handler react-native-reanimated react-native-worklets
```

> NOTE: Reanimated v4 ko alag `react-native-worklets` package chahiye. Aur babel plugin badal gaya:
> Step 15 mein `react-native-reanimated/plugin` ki jagah `react-native-worklets/plugin` use karna.

### Database (SQLCipher):
```bash
yarn add @op-engineering/op-sqlite
```

> ⚠️ Yeh sabse tricky install hai — alag section mein detail hai (Step 15).
> NOTE: Sahi package naam `@op-engineering/op-sqlite` hai (purana `op-sqlite` registry pe nahi hai).

### Encryption & Security:
```bash
yarn add react-native-aes-crypto
yarn add react-native-keychain
yarn add react-native-biometrics
```

> NOTE: RN 0.86 (bare) Expo modules ke saath compatible nahi, isliye community libs:
> `expo-local-authentication` → `react-native-biometrics`

### File System:
```bash
yarn add react-native-fs react-native-image-picker
yarn add react-native-image-resizer
yarn add react-native-pdf
```

> NOTE: `expo-file-system` → `react-native-fs`, `expo-image-picker` → `react-native-image-picker`

### Notifications:
```bash
yarn add @notifee/react-native react-native-background-fetch
```

> NOTE: `expo-notifications` → `@notifee/react-native`,
> `expo-task-manager` + `expo-background-fetch` → `react-native-background-fetch`

### State Management:
```bash
yarn add zustand @tanstack/react-query
```

### Validation:
```bash
yarn add zod
```

### Utilities:
```bash
yarn add react-native-config
yarn add react-native-mmkv react-native-nitro-modules
yarn add date-fns
yarn add jail-monkey
yarn add zxcvbn-ts
yarn add react-native-uuid
```

> NOTE: `react-native-flag-secure-android` HATA diya — woh purani hai aur `jcenter()` use karti hai
> (Gradle 9 mein removed → build fail). FLAG_SECURE manually native code se Step 21 mein add karenge.
> NOTE: `react-native-mmkv` (v4) ko peer dependency `react-native-nitro-modules` chahiye — isliye saath install kiya.

### Error Tracking:
```bash
yarn add @sentry/react-native
```

### Dev Dependencies:
```bash
yarn add -D jest ts-jest @types/jest
yarn add -D @testing-library/react-native @testing-library/jest-native
yarn add -D fast-check
yarn add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
yarn add -D eslint-plugin-react eslint-plugin-react-native eslint-plugin-react-hooks
yarn add -D prettier
yarn add -D husky lint-staged@^15
yarn add -D babel-plugin-module-resolver
```

> NOTE: `lint-staged@17` ko Node >=22.22.1 chahiye. Node 22.17 pe `lint-staged@^15` use karo.

---

# PART 5 — Configuration Files

## Step 13 — ESLint Setup

`.eslintrc.js` banao project root mein:

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    project: './tsconfig.json',
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-native',
    'react-hooks',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    // Security rules
    'no-console': 'error',              // console.log ban — logger use karo
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',

    // Code quality
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'react-hooks/exhaustive-deps': 'error',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'error',

    // React
    'react/react-in-jsx-scope': 'off',  // RN 0.71+ mein import nahi chahiye
    'react/prop-types': 'off',          // TypeScript use kar rahe hain
  },
  settings: {
    react: { version: 'detect' },
  },
}
```

---

## Step 14 — Prettier Setup

`.prettierrc` banao:
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

`.prettierignore` banao:
```
node_modules
android
ios
.expo
dist
build
```

---

## Step 15 — Babel Config (Path Aliases)

`babel.config.js` update karo:
```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module-resolver', {
      root: ['./src'],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      alias: {
        '@': './src',
        '@core': './src/core',
        '@features': './src/features',
        '@ui': './src/ui',
        '@lib': './src/lib',
        '@store': './src/store',
      },
    }],
    'react-native-reanimated/plugin',  // Reanimated hamesha last
  ],
}
```

---

## Step 16 — Husky (Pre-commit Hooks)

```bash
# Husky initialize karo:
npx husky init

# Pre-commit hook banao:
echo "npx lint-staged" > .husky/pre-commit
```

`package.json` mein add karo:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

**Test karo:**
```bash
git add .
git commit -m "test: husky setup"
# ESLint + Prettier automatic run hona chahiye
```

✅ **Checkpoint:** Commit karo → lint automatic run ho.

---

## Step 17 — Conventional Commits Setup

**Kyun:** Consistent commit messages → clean git history → changelog generate karna easy.

```bash
# Commitlint install karo
yarn add -D @commitlint/cli @commitlint/config-conventional
```

`commitlint.config.js` banao:
```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat',     // Naya feature
      'fix',      // Bug fix
      'chore',    // Build/config change
      'docs',     // Documentation
      'style',    // Formatting
      'refactor', // Code restructure
      'test',     // Tests
      'perf',     // Performance
      'security', // Security fix
    ]],
    'scope-enum': [2, 'always', [
      'documents',
      'udhaar',
      'vault',
      'auth',
      'db',
      'crypto',
      'backup',
      'ui',
      'setup',
    ]],
    'subject-max-length': [2, 'always', 72],
  },
}
```

**Husky hook add karo:**
```bash
echo "npx commitlint --edit \$1" > .husky/commit-msg
```

**Sahi commit message format:**
```bash
# Format: type(scope): description
git commit -m "feat(documents): add document list screen"
git commit -m "fix(vault): handle key invalidation on fingerprint change"
git commit -m "security(auth): add exponential PIN lockout"
git commit -m "test(udhaar): add money calculation property tests"
git commit -m "chore(setup): configure SQLCipher native linking"
```

**Galat format → commit reject hoga:**
```bash
git commit -m "added stuff"      # ❌ Reject
git commit -m "fix: something"   # ❌ Scope missing
git commit -m "feat(documents): add document list screen"  # ✅ Accept
```

✅ **Checkpoint:** Galat format commit karo → error aaye. Sahi format commit karo → pass ho.

---

## Step 17 — VS Code Workspace Settings

`.vscode/settings.json` banao:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "editor.tabSize": 2,
  "files.trimTrailingWhitespace": true,
  "editor.rulers": [100],
  "emmet.includeLanguages": {
    "typescript": "typescriptreact"
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/android/build": true,
    "**/ios/build": true
  }
}
```

`.vscode/extensions.json` banao (team ke liye recommendations):
```json
{
  "recommendations": [
    "msjsdiag.vscode-react-native",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "usernamehako.errorlens",
    "eamodio.gitlens",
    "dsznajder.es7-react-js-snippets"
  ]
}
```

`.vscode/launch.json` banao (debugging):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Android",
      "type": "reactnative",
      "request": "launch",
      "platform": "android",
      "sourceMaps": true
    },
    {
      "name": "Attach to Metro",
      "type": "reactnative",
      "request": "attach",
      "sourceMaps": true
    }
  ]
}
```

---

# PART 6 — SQLCipher Setup (Critical)

## Step 18 — SQLCipher Native Configuration

**Yeh sabse important step hai — carefully karo.**

### android/build.gradle update karo:
```gradle
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 26
        compileSdkVersion = 34
        targetSdkVersion = 34
        ndkVersion = "26.1.10909125"
    }
    // ...
}
```

### android/app/build.gradle update karo:
```gradle
android {
    defaultConfig {
        applicationId "com.privo"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0"
    }
    
    // SQLCipher ke liye:
    packagingOptions {
        pickFirst 'lib/x86/libsqlcipher.so'
        pickFirst 'lib/x86_64/libsqlcipher.so'
        pickFirst 'lib/armeabi-v7a/libsqlcipher.so'
        pickFirst 'lib/arm64-v8a/libsqlcipher.so'
    }
}

dependencies {
    implementation "net.zetetic:android-database-sqlcipher:4.5.4"
    implementation "androidx.sqlite:sqlite:2.3.1"
    // ... baaki dependencies
}
```

### android/app/src/main/AndroidManifest.xml:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- Permissions -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.USE_FINGERPRINT" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <!-- NO INTERNET PERMISSION — v1 offline only -->
    <!-- <uses-permission android:name="android.permission.INTERNET" /> -->

    <application
        android:name=".MainApplication"
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:allowBackup="false"
        android:fullBackupContent="false"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:networkSecurityConfig="@xml/network_security_config"
        android:theme="@style/AppTheme">
        
        <!-- ... activities -->
    </application>
</manifest>
```

### android/app/src/main/res/xml/network_security_config.xml banao:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- v1: No network access at all — safest config -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

### android/app/src/main/res/xml/data_extraction_rules.xml banao:
```xml
<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="database" />
        <exclude domain="file" />
        <exclude domain="sharedpref" />
    </cloud-backup>
    <device-transfer>
        <exclude domain="database" />
        <exclude domain="file" />
        <exclude domain="sharedpref" />
    </device-transfer>
</data-extraction-rules>
```

### android/app/proguard-rules.pro:
```proguard
# SQLCipher
-keep class net.sqlcipher.** { *; }
-keep class net.sqlcipher.database.** { *; }
-dontwarn net.sqlcipher.**

# React Native Keychain
-keep class com.oblador.keychain.** { *; }
-dontwarn com.oblador.keychain.**

# AES Crypto
-keep class com.tectiv3.aes.** { *; }

# Sentry
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.swmansion.** { *; }

# Expo modules
-keep class expo.modules.** { *; }
```

**Build test karo:**
```bash
cd android && ./gradlew clean
cd ..
yarn android
```

✅ **Checkpoint:** App build ho aur SQLCipher error na aaye.

---

# PART 7 — Security Setup

## Step 19 — New Architecture Off (v1 ke liye)

`android/gradle.properties` mein:
```properties
android.useAndroidX=true
android.enableJetifier=true
newArchEnabled=false
hermesEnabled=true
reactNativeArchitectures=arm64-v8a,x86_64
```

---

## Step 20 — Environment Variables

`.env` banao (project root):
```
APP_NAME=Privo
APP_VERSION=1.0.0
SENTRY_DSN=your_sentry_dsn_here
```

`.env.example` banao (Git mein commit karo — real values nahi):
```
APP_NAME=Privo
APP_VERSION=1.0.0
SENTRY_DSN=
```

`.gitignore` mein add karo:
```
.env
.env.local
.env.production
```

---

## Step 21 — FLAG_SECURE Helper

`src/core/security/flagSecure.ts` banao:
```typescript
import { Platform, NativeModules } from 'react-native'

export function enableFlagSecure(): void {
  if (Platform.OS === 'android') {
    NativeModules.RNFlagSecure?.enable?.()
  }
}

export function disableFlagSecure(): void {
  if (Platform.OS === 'android') {
    NativeModules.RNFlagSecure?.disable?.()
  }
}
```

> Note: `react-native-flag-secure-android` library install karo ya native module khud banao.

---

# PART 8 — Testing Setup

## Step 22 — Jest Configuration

`jest.config.js` banao:
```javascript
module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
      },
    }],
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
  },
  setupFilesAfterEach: ['@testing-library/jest-native/extend-expect'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**',         // Screens coverage alag se
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
```

**Test run karo:**
```bash
yarn test                    # Sab tests
yarn test --coverage         # Coverage report
yarn test --watch            # Watch mode
```

✅ **Checkpoint:** `yarn test` run ho aur pass kare.

---

## Step 23 — Maestro E2E Testing Setup

**Kyun:** Critical user flows (unlock → save → reveal) automated test karne ke liye.

**Install (Mac/Linux/Windows WSL):**
```bash
# Maestro install karo
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify
maestro --version
```

**Windows (bina WSL):**
```bash
# Scoop se
scoop install maestro
```

**Pehla E2E test banao** `__tests__/e2e/unlock_flow.yaml`:
```yaml
appId: com.privo
---
- launchApp
- assertVisible: "Privo unlock karo"         # Lock screen
- tapOn: "PIN use karo"
- inputText: "1234"                           # Test PIN
- tapOn: "Unlock"
- assertVisible: "Documents"                  # Main screen visible
- assertVisible: "Udhaar"
- assertVisible: "Passwords"
```

**Run karo:**
```bash
# Emulator/device connected hona chahiye
maestro test __tests__/e2e/unlock_flow.yaml
```

✅ **Checkpoint:** E2E test pass kare — lock screen se main screen tak flow work kare.

`.github/workflows/ci.yml` banao:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    name: Code Quality
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'
      
      - name: Install dependencies
        run: yarn install --frozen-lockfile
      
      - name: TypeScript check
        run: yarn tsc --noEmit
      
      - name: ESLint
        run: yarn eslint src --ext .ts,.tsx
      
      - name: Tests
        run: yarn test --coverage --ci
      
      - name: Coverage check
        run: yarn test --coverage --coverageThreshold='{"global":{"lines":80}}'
```

---

# PART 9 — Git Setup

## Step 24 — .gitignore

`.gitignore` (complete):
```
# Dependencies
node_modules/
.pnp
.pnp.js

# Expo
.expo/
dist/
web-build/

# Native builds
android/build/
android/app/build/
android/.gradle/
ios/build/
ios/Pods/
*.xcworkspace
*.xcuserdata

# Environment
.env
.env.local
.env.production
.env.staging

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V500
.Trashes
ehthumbs.db
Thumbs.db

# IDE
# .vscode/settings.json commit karo (team consistency ke liye)
!.vscode/settings.json
!.vscode/extensions.json
!.vscode/launch.json

# Testing
coverage/

# TypeScript
*.tsbuildinfo

# Keystore (KABHI COMMIT MAT KARO)
*.keystore
*.jks
google-services.json
```

---

## Step 25 — Git Repository Initialize

```bash
# Initialize
git init

# Remote add karo (GitHub pe repo banao pehle)
git remote add origin https://github.com/tumhara-username/privo-app.git

# Initial commit
git add .
git commit -m "chore: initial project setup"
git push -u origin main

# Develop branch banao
git checkout -b develop
git push -u origin develop
```

**Branch strategy:**
```
main      → production only (tagged releases)
develop   → integration branch
feature/* → har feature ka alag branch
  feature/documents-module
  feature/udhaar-module
  feature/vault-module
```

---

# PART 10 — EAS Build Setup

## Step 26 — app.json Configuration

**Yeh EAS build ke liye zaroori hai — pehle yeh set karo:**

`app.json` update karo:
```json
{
  "name": "Privo",
  "displayName": "Privo",
  "expo": {
    "name": "Privo",
    "slug": "privo",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0f172a"
    },
    "android": {
      "package": "com.privo",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0f172a"
      },
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.USE_BIOMETRIC",
        "android.permission.USE_FINGERPRINT",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.READ_MEDIA_IMAGES"
      ]
    },
    "plugins": [
      "expo-local-authentication",
      "expo-notifications",
      [
        "expo-image-picker",
        {
          "photosPermission": "Documents import karne ke liye gallery access chahiye."
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "tumhara-eas-project-id"
      }
    }
  }
}
```

> **Note:** `projectId` EAS login ke baad `eas init` command se automatically set hoga.

```bash
# EAS project initialize karo
eas init
# Yeh app.json mein projectId automatically add kar dega
```

✅ **Checkpoint:** `eas init` success ho, projectId app.json mein aa jaye.

---

## Step 27 — EAS Configuration

`eas.json` banao:
```json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

---

# PART 11 — Final Verification Checklist

## Step 28 — Complete Setup Verify Karo

Har item check karo:

### Software:
- [ ] `node --version` → v20.x.x
- [ ] `java --version` → openjdk 17.x.x
- [ ] `adb --version` → kaam kare
- [ ] `yarn --version` → 1.22.x
- [ ] `eas --version` → kaam kare
- [ ] `git --version` → 2.x.x
- [ ] `maestro --version` → kaam kare
- [ ] VS Code extensions installed

### Project:
- [ ] `yarn android` → app emulator/phone pe chale
- [ ] `yarn tsc --noEmit` → zero TypeScript errors
- [ ] `yarn eslint src` → zero ESLint errors
- [ ] `yarn test` → tests pass
- [ ] `git log` → initial commit dikh raha
- [ ] GitHub repo pe code push ho gaya
- [ ] `eas init` → projectId app.json mein aa gaya

### Android:
- [ ] Emulator start hota hai
- [ ] `adb devices` → device listed
- [ ] SQLCipher build error nahi aaya
- [ ] `allowBackup="false"` manifest mein hai
- [ ] INTERNET permission nahi hai manifest mein
- [ ] `network_security_config.xml` exist karta hai
- [ ] `data_extraction_rules.xml` exist karta hai

### Security:
- [ ] `.env` file `.gitignore` mein hai
- [ ] Koi keystore file commit nahi hua
- [ ] `no-console` ESLint rule active hai
- [ ] `react-native-flag-secure-android` installed hai

### Git:
- [ ] Husky pre-commit hook kaam karta hai
- [ ] Commitlint galat format reject karta hai
- [ ] Conventional commit sahi format accept hota hai
- [ ] `develop` branch bana hua hai

✅ **Sab check ho gaye? Phase 1 (Security Core) start karo.**

---

# PART 12 — Daily Development Workflow

## Roz ka Kaam Kaise Karo

```bash
# 1. Develop branch pe aao
git checkout develop

# 2. Latest pull karo
git pull origin develop

# 3. Feature branch banao
git checkout -b feature/documents-module

# 4. Metro start karo (alag terminal)
yarn start

# 5. Android run karo (doosra terminal)
yarn android

# 6. Kaam karo, save karo → auto format + lint

# 7. Test karo
yarn test --watch

# 8. Commit karo (husky check karega)
git add .
git commit -m "feat(documents): add document list screen"

# 9. Push karo
git push origin feature/documents-module
```

## Terminal Split (VS Code mein):
```
Terminal 1: yarn start        (Metro bundler — hamesha chalta rahe)
Terminal 2: yarn android      (sirf pehli baar ya restart pe)
Terminal 3: git / yarn test   (commands ke liye)
```

---

# Quick Reference — Commands

```bash
# Project start karna
yarn start                           # Metro bundler
yarn android                         # Android pe run

# Code quality
yarn tsc --noEmit                    # TypeScript check
yarn eslint src --ext .ts,.tsx       # Lint check
yarn prettier --check src            # Format check
yarn prettier --write src            # Format fix

# Testing
yarn test                            # Sab tests
yarn test --watch                    # Watch mode
yarn test --coverage                 # Coverage report
maestro test __tests__/e2e/          # E2E tests

# Build
eas build --platform android --profile development   # Dev build (APK)
eas build --platform android --profile preview       # Preview APK
eas build --platform android --profile production    # Production AAB

# Git (Conventional Commits)
git checkout -b feature/naam                              # New branch
git commit -m "feat(scope): description"                  # Feature
git commit -m "fix(scope): description"                   # Bug fix
git commit -m "security(scope): description"              # Security
git push origin feature/naam                              # Push

# Android specific
adb devices                          # Connected devices
adb logcat                           # Device logs
adb logcat | grep -i "privo"         # Filtered logs
cd android && ./gradlew clean        # Gradle clean
cd android && ./gradlew dependencies # Check dependencies
```

---

## Commit Message Quick Reference

```
feat(documents): add document list with pagination
fix(vault): handle keystore invalidation on fingerprint change
security(auth): add exponential PIN lockout after 5 attempts
test(udhaar): add property-based money calculation tests
chore(setup): configure SQLCipher native linking
refactor(db): extract migration runner to separate module
perf(documents): add FlatList virtualization for 1000+ items
docs(readme): add setup instructions
```

---

**Setup complete hone ke baad:** Seedha `Phase 1 — Security Core` shuru karo.
Pehla kaam: `src/core/crypto/keystore.ts` — Android Keystore key generation.