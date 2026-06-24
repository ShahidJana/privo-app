# Privo — Development Challenges & Solutions
## Senior-Level Risk Guide (React Native + TypeScript + SQLCipher)

> Har mushkil ke saath: **kab aayegi**, **exact error**, **solution**, aur **alternative** — tumhare exact plan ke hisaab se.

---

# TIER 1 — Critical (App ruk jaayegi agar handle na karo)

---

## C1. SQLCipher Native Linking

**Kab aayegi:** Phase 1, Day 1 — sabse pehli aur badi mushkil
**Kyun hoti hai:** SQLCipher C++ library hai jo React Native ke saath native linking chahti hai. Gradle, CMake, aur RN build system teeno saath kaam karne chahiye.

**Exact errors jo aayengi:**
```
undefined is not an object (evaluating 'op-sqlite.open')
CMake Error: SQLCipher not found
Duplicate class kotlin.collections.jdk8
FAILURE: Build failed with an exception — Task :op-sqlite:buildCMakeDebug
```

**Solution (step by step):**
1. `op-sqlite` ki exact version pin karo — latest hamesha stable nahi hoti
2. `android/build.gradle` mein SQLCipher dependency manually add karo:
```gradle
dependencies {
    implementation "net.zetetic:android-database-sqlcipher:4.5.4"
    implementation "androidx.sqlite:sqlite:2.3.1"
}
```
3. CMakeLists.txt mein SQLCipher include path set karo
4. Clean build karo: `cd android && ./gradlew clean`
5. Pehle sirf native Android build karo (Android Studio se) — RN baad mein

**Alternative agar 3 din baad bhi na chole:**
- `react-native-mmkv` (encrypted key-value) + field-level AES encryption apni taraf se
- Weaker solution hai par production-ready hai
- SQLCipher baad mein properly set up kar sakte ho

**Prevention:** Phase 1 mein sirf yeh ek kaam karo — koi feature mat banao jab tak SQLCipher prove na ho jaye.

---

## C2. Android Keystore Key Invalidation

**Kab aayegi:** Phase 1 testing ya production mein user fingerprint change kare tab
**Kyun hoti hai:** Android security policy — biometric change hone pe Keystore keys automatically invalidate ho jaati hain

**Exact error:**
```
javax.crypto.IllegalBlockSizeException: Key permanently invalidated
android.security.keystore.KeyPermanentlyInvalidatedException
```

**Agar handle na karo:** Decrypt fail → app crash → user ka saara data unreadable → 1-star reviews

**Solution:**
```typescript
// core/crypto/keystore.ts
async function decryptWithKeystore(encryptedData: string): Promise<string> {
  try {
    return await performDecryption(encryptedData)
  } catch (error) {
    if (isKeyInvalidatedError(error)) {
      // Step 1: Force PIN re-authentication
      await requirePinAuth()
      // Step 2: Generate new Keystore key
      await generateNewKeystoreKey()
      // Step 3: Re-encrypt ALL vault records with new key
      await reEncryptAllVaultRecords()
      // Step 4: Retry decrypt
      return await performDecryption(encryptedData)
    }
    throw error
  }
}

function isKeyInvalidatedError(error: unknown): boolean {
  return String(error).includes('permanently invalidated') ||
         String(error).includes('KeyPermanentlyInvalidatedException')
}
```

**Test kaise karo:**
- Emulator pe fingerprint enroll karo
- App use karo, data save karo
- Emulator settings mein fingerprint remove/re-add karo
- App wapas kholo — key invalidation flow trigger hona chahiye

---

## C3. React Native New Architecture Incompatibility

**Kab aayegi:** Phase 0-1 — project setup ke waqt
**Kyun hoti hai:** RN 0.74+ mein New Architecture (Fabric + JSI) default on hai. Kuch native libs abhi compatible nahi.

**Problematic libraries tumhare plan mein:**
- `react-native-aes-crypto` — JSI compatible nahi (older versions)
- `jail-monkey` — Fabric issues report hue hain
- `react-native-pdf` — partial support
- Older versions of `react-native-keychain`

**Exact error:**
```
TurboModuleRegistry.get(...) returned null
Invariant Violation: "RNAesCrypto" was not found in the UIManager
```

**Solution A (Recommended — New Architecture off karo v1 ke liye):**
```properties
# android/gradle.properties
newArchEnabled=false
hermesEnabled=true   # Hermes ON rakhna — performance ke liye
```

**Solution B (Better long-term — compatible versions use karo):**
- Har library ka changelog check karo: "New Architecture support" ya "Fabric compatible"
- `react-native-aes-crypto` alternative: `react-native-quick-crypto` (JSI-based, New Arch ready)
- Upgrade path: v1 New Arch off, v2 mein migrate

**Prevention:** Phase 0 mein ek empty app banao aur saari libraries install karke test build karo — features likhne se pehle.

---

## C4. Data Loss — PIN Forgotten

**Kab aayegi:** Production mein, koi bhi waqt
**Kyun critical hai:** Zero-knowledge app mein no backdoor = forgotten PIN = permanent data loss

**Agar handle na karo:** User 1-star review: "App ne mera saara data delete kar diya"

**Solution — Mandatory Recovery Export (Onboarding mein):**
```typescript
// onboarding/BackupSetupScreen.tsx
// Yeh screen skip nahi ho sakti — "Later" button nahi hoga

async function createRecoveryExport(userPassword: string): Promise<void> {
  // PBKDF2 se export key derive karo (600,000 iterations)
  const exportKey = await deriveKeyFromPassword(userPassword, {
    iterations: 600_000,
    algorithm: 'SHA-512'
  })
  // Poora DB encrypt karke .privo file banao
  const exportData = await exportEncryptedBackup(exportKey)
  // Android Share Sheet se user apni marzi ki jagah save kare
  await Share.share({ url: exportData.fileUri })
}
```

**User ko onboarding mein clearly batao:**
> "Privo mein koi backdoor nahi hai. Agar PIN bhool gaye to data wapas nahi aayega. Abhi backup banao — Google Drive, email, ya koi bhi jagah save karo."

**Alternative agar user phir bhi skip kare:**
- Weekly reminder show karo: "Aapka backup 7 din se nahi hua"
- App lock screen pe "Backup" shortcut

---

# TIER 2 — High (Feature toot jaayegi)

---

## H1. Android Scoped Storage (File System)

**Kab aayegi:** Phase 3 — Documents module
**Kyun hoti hai:** Android 10+ (API 29+) mein external storage access restricted. Old paths kaam nahi karte.

**Exact error:**
```
EACCES: Permission denied, open '/storage/emulated/0/Download/doc.pdf'
```

**Galat tarika (kabhi mat karo):**
```typescript
// WRONG — Android 10+ pe crash
const path = '/storage/emulated/0/Download/' + filename
```

**Sahi tarika:**
```typescript
// CORRECT — hamesha app sandbox use karo
import * as FileSystem from 'expo-file-system'

const DOCS_DIR = `${FileSystem.documentDirectory}privo/documents/`

async function importDocument(pickedUri: string): Promise<string> {
  // Directory ensure karo
  await FileSystem.makeDirectoryAsync(DOCS_DIR, { intermediates: true })
  
  // App sandbox mein copy karo — TURANT, picker se milte hi
  const destPath = `${DOCS_DIR}${uuid()}.${getExtension(pickedUri)}`
  await FileSystem.copyAsync({ from: pickedUri, to: destPath })
  
  return destPath  // Yeh path DB mein save karo
}
```

**File + DB atomic save (orphan prevention):**
```typescript
async function saveDocument(input: DocumentInput): Promise<void> {
  let copiedFilePath: string | null = null
  
  try {
    // Step 1: File copy karo
    copiedFilePath = await importDocument(input.pickedUri)
    const hash = await computeSHA256(copiedFilePath)
    
    // Step 2: DB mein insert karo (transaction)
    await db.transaction(async (tx) => {
      await tx.execute(
        'INSERT INTO documents (id, title, file_uri, file_hash...) VALUES (?,?,?,?...)',
        [uuid(), input.title, copiedFilePath, hash]
      )
    })
  } catch (error) {
    // DB fail hua to orphan file delete karo
    if (copiedFilePath) {
      await FileSystem.deleteAsync(copiedFilePath, { idempotent: true })
    }
    throw error
  }
}
```

---

## H2. Notifications — MIUI/Samsung Kill

**Kab aayegi:** Phase 4 — Udhaar reminders
**Kyun hoti hai:** Chinese OEM (Xiaomi, Oppo, Vivo) aur Samsung background apps aggressively kill karte hain. Scheduled notifications fire nahi hoti.

**Real impact:** Udhaar return date aaya, reminder nahi aaya, user ka paisa gaya — app blame hoga.

**Solution Layer 1 — Background task:**
```typescript
import * as TaskManager from 'expo-task-manager'
import * as BackgroundFetch from 'expo-background-fetch'

const REMINDER_CHECK_TASK = 'privo-reminder-check'

TaskManager.defineTask(REMINDER_CHECK_TASK, async () => {
  await rescheduleUpcomingReminders()
  return BackgroundFetch.BackgroundFetchResult.NewData
})

// Register karo app start pe
await BackgroundFetch.registerTaskAsync(REMINDER_CHECK_TASK, {
  minimumInterval: 60 * 60, // 1 hour
  stopOnTerminate: false,
  startOnBoot: true,       // Phone restart ke baad bhi kaam kare
})
```

**Solution Layer 2 — In-app fallback:**
```typescript
// App foreground mein aaye to overdue check karo
useEffect(() => {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') checkOverdueUdhaar()
  })
  return () => subscription.remove()
}, [])
```

**Solution Layer 3 — User education (Onboarding mein):**
```
"Reminders ke liye:
Settings → Apps → Privo → Battery → 
'Unrestricted' select karo"
```

**Test:** Xiaomi ya Samsung emulator/device pe specifically test karo.

---

## H3. Biometric Edge Cases

**Kab aayegi:** Phase 1 — App lock
**Multiple scenarios:**

**Scenario A — Device mein biometric nahi:**
```typescript
const hasHardware = await LocalAuthentication.hasHardwareAsync()
const isEnrolled = await LocalAuthentication.isEnrolledAsync()

if (!hasHardware || !isEnrolled) {
  // PIN-only mode — biometric option hide karo
  setAuthMode('pin-only')
}
```

**Scenario B — User cancel kare:**
```typescript
const result = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Privo unlock karo',
  cancelLabel: 'PIN use karo',
  fallbackLabel: 'PIN use karo',
})

switch (result.error) {
  case 'user_cancel':    showPinInput(); break
  case 'lockout':        showLockoutTimer(); break
  case 'lockout_permanent': showPermanentLockout(); break
  case 'not_enrolled':   forcePinMode(); break
  case 'not_available':  forcePinMode(); break
  default:
    if (!result.success) showPinInput()
}
```

**Scenario C — App background mein jaaye mid-authentication:**
```typescript
// Lock screen component mein
useEffect(() => {
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'background') {
      // Biometric prompt cancel karo, wapas aane pe re-show
      cancelBiometricPrompt()
    }
    if (state === 'active' && isLocked) {
      // Auto-trigger biometric again
      triggerBiometric()
    }
  })
  return () => sub.remove()
}, [isLocked])
```

---

## H4. Money Calculation Bugs

**Kab aayegi:** Phase 4 — Udhaar module
**Classic senior-level bug:** Float precision

**Exact problem:**
```typescript
// YEH BILKUL MAT KARO
const total = 100.10 + 200.20  // = 300.3000000000000...4 ← WRONG
const remaining = 500.00 - 166.67 - 166.67 - 166.67  // = -0.01 ← WRONG
```

**Sahi approach — Integer Paisa throughout:**
```typescript
// lib/money.ts

// Display ke liye (sirf UI mein)
export function paisaToDisplay(paisa: number): string {
  return (paisa / 100).toFixed(2)  // "300.30"
}

// User input se paisa (sirf entry point)
export function inputToPaisa(input: string): number {
  const clean = input.replace(/[^0-9.]/g, '')
  return Math.round(parseFloat(clean) * 100)  // Math.round mandatory
}

// Net balance calculate karna
export function calculateNetBalance(entries: UdhaarEntry[]): number {
  return entries.reduce((net, entry) => {
    const paid = entry.payments.reduce((sum, p) => sum + p.amount, 0)
    const remaining = entry.amount - paid
    return entry.direction === 'lena'
      ? net + remaining
      : net - remaining
  }, 0)  // Sab INTEGER paisa — zero float
}

// Status auto-compute
export function computeStatus(amount: number, totalPaid: number): UdhaarStatus {
  if (totalPaid <= 0) return 'pending'
  if (totalPaid >= amount) return 'settled'
  return 'partial'
}
```

**Property-based test (fast-check se):**
```typescript
import fc from 'fast-check'

test('net balance — no float errors', () => {
  fc.assert(fc.property(
    fc.array(fc.record({
      amount: fc.integer({ min: 1, max: 10_000_000 }),
      direction: fc.constantFrom('lena', 'dena'),
      paid: fc.integer({ min: 0, max: 10_000_000 })
    })),
    (entries) => {
      const result = calculateNetBalance(entries)
      // Result must be integer (no decimals)
      expect(result % 1).toBe(0)
      expect(Number.isFinite(result)).toBe(true)
    }
  ))
})
```

---

## H5. EAS Build — Release Mode Crashes

**Kab aayegi:** Phase 8 — Release build
**Kyun hoti hai:** ProGuard/R8 production build mein code obfuscate karta hai. Native library class names change ho jaati hain → runtime crash. Debug mein bilkul theek tha.

**Exact error (release build mein):**
```
ClassNotFoundException: net.sqlcipher.database.SQLiteDatabase
NullPointerException at com.oblador.keychain.a.b(Unknown Source)
```

**Solution — ProGuard rules (`android/app/proguard-rules.pro`):**
```proguard
# SQLCipher
-keep class net.sqlcipher.** { *; }
-keep class net.sqlcipher.database.** { *; }
-dontwarn net.sqlcipher.**

# React Native Keychain
-keep class com.oblador.keychain.** { *; }

# AES Crypto
-keep class com.tectiv3.aes.** { *; }

# Sentry
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# React Native core
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
```

**Prevention:** Phase 7 mein release build test karo production se pehle:
```bash
npx react-native run-android --mode=release
# Ya
eas build --profile preview --platform android
```

---

# TIER 3 — Medium (UX toot jaayegi)

---

## M1. TypeScript Strict Mode — Initial Friction

**Kab aayegi:** Phase 0 se throughout
**Common stumbling blocks:**

```typescript
// Problem 1: Null checks
const doc = await DocumentRepo.findById(id)
doc.title  // Error: doc is possibly null/undefined

// Fix:
if (!doc) throw new DocumentNotFoundError(id)
doc.title  // Now safe

// Problem 2: SQLite results typing
const rows = await db.execute('SELECT * FROM documents')
rows[0].title  // Error: Property 'title' does not exist on type '{}'

// Fix — typed query helper:
interface DocumentRow {
  id: string; title: string; category: string
  file_uri: string | null; expiry_date: number | null
}
const rows = await db.execute<DocumentRow>('SELECT * FROM documents')
rows[0].title  // Type-safe

// Problem 3: Zustand store
const store = useAppStore()
store.nonExistentProp  // Error caught at compile time — YEH ACHHA HAI
```

**Tip:** Pehle hafte mein `// @ts-ignore` use karne ka mann karega — mat karo. Har ignore ek future bug hai.

---

## M2. DB Migration — Version Mismatch

**Kab aayegi:** Jab app update aaye aur naya schema ho
**Agar handle na karo:** Old app ka data naya schema se crash kare

**Solution — Migration Runner:**
```typescript
// core/db/migrations/index.ts

interface Migration {
  version: number
  up: (db: Database) => Promise<void>
  down: (db: Database) => Promise<void>  // Rollback mandatory
}

const migrations: Migration[] = [
  {
    version: 1,
    up: async (db) => {
      await db.execute(`CREATE TABLE documents (...)`)
      await db.execute(`CREATE TABLE udhaar (...)`)
      await db.execute(`CREATE TABLE vault (...)`)
      await db.execute(`CREATE TABLE meta (...)`)
    },
    down: async (db) => {
      await db.execute('DROP TABLE IF EXISTS documents')
      // ... etc
    }
  },
  {
    version: 2,  // Future: tags feature add karna
    up: async (db) => {
      await db.execute('ALTER TABLE documents ADD COLUMN tags TEXT')
    },
    down: async (db) => {
      // SQLite ALTER DROP not supported — recreate table
      await db.execute('CREATE TABLE documents_backup AS SELECT * FROM documents')
      // ... etc
    }
  }
]

export async function runMigrations(db: Database): Promise<void> {
  const current = await getSchemaVersion(db)  // PRAGMA user_version
  const pending = migrations.filter(m => m.version > current)
  
  for (const migration of pending) {
    await db.transaction(async (tx) => {
      await migration.up(tx)
      await setSchemaVersion(tx, migration.version)
    })
    // Transaction fail → rollback → safe state
  }
}
```

---

## M3. Large File Import — Memory Crash

**Kab aayegi:** Phase 3 — Documents module
**Scenario:** User 20MB PDF import karna chahay

**Agar handle na karo:**
```
JavaScript heap out of memory
Fatal signal 11 (SIGSEGV) — app crash
```

**Solution:**
```typescript
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  // 15MB

async function validateAndImportFile(uri: string): Promise<ImportResult> {
  // Step 1: Size check karo PEHLE — file load karne se pehle
  const info = await FileSystem.getInfoAsync(uri, { size: true })
  
  if (!info.exists) {
    return { success: false, error: 'FILE_NOT_FOUND' }
  }
  
  if (info.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (info.size / (1024 * 1024)).toFixed(1)
    return {
      success: false,
      error: 'FILE_TOO_LARGE',
      message: `File ${sizeMB}MB hai. Maximum 15MB allowed hai.`
    }
  }
  
  // Step 2: Image hai to compress karo
  if (isImage(uri)) {
    return await compressAndImport(uri)  // react-native-image-resizer
  }
  
  // Step 3: PDF directly copy karo (compress nahi hoti)
  return await copyToSandbox(uri)
}
```

---

## M4. Clipboard Auto-Clear Failure

**Kab aayegi:** Phase 5 — Vault module
**Scenario:** Password copy karo, 30s baad clear nahi hua

**Reason:** `setTimeout` background mein reliable nahi — app suspend ho jaye to timer pause ho jaata hai.

**Solution:**
```typescript
// vault/useVaultClipboard.ts
const CLIPBOARD_TIMEOUT_MS = 30_000

export function useCopyPassword() {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const copyTimeRef = useRef<number>()

  const copyPassword = useCallback(async (id: string, plaintext: string) => {
    await Clipboard.setStringAsync(plaintext)
    setCopiedId(id)
    copyTimeRef.current = Date.now()
    
    // Timer set karo
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(clearClipboard, CLIPBOARD_TIMEOUT_MS)
  }, [])

  // App foreground mein aaye to check karo — timer miss hua to?
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && copyTimeRef.current) {
        const elapsed = Date.now() - copyTimeRef.current
        if (elapsed >= CLIPBOARD_TIMEOUT_MS) {
          clearClipboard()  // Timer miss hua tha — abhi clear karo
        }
      }
    })
    return () => sub.remove()
  }, [])

  const clearClipboard = useCallback(async () => {
    await Clipboard.setStringAsync('')  // Clipboard clear
    setCopiedId(null)
    copyTimeRef.current = undefined
  }, [])

  return { copyPassword, copiedId, clearClipboard }
}
```

---

## M5. Play Store — Data Safety Form Rejection

**Kab aayegi:** Phase 8 — Release
**Common mistake:** Sentry use karo aur data safety mein "no data collected" declare karo → Google reject kare

**Correct declarations tumhare app ke liye:**

| Data Type | Collected? | Reason |
|-----------|-----------|--------|
| Crash logs | Yes | Sentry (diagnostic) |
| Personal data | No | Sab local |
| Location | No | — |
| Financial info | No | Local only, encrypted |
| App interactions | No | — |

**Privacy Policy (mandatory — GitHub Pages pe free host karo):**
```
Privo Privacy Policy

Privo stores all data locally on your device only.
No data is transmitted to any server.
No data is collected, shared, or sold.

Crash reports: Anonymous crash data may be collected
via Sentry to improve app stability. No personal
information is included in crash reports.

Contact: your@email.com
```

**`AndroidManifest.xml` mein INTERNET permission mat dalo** (v1 mein network nahi chahiye):
```xml
<!-- Yeh LINE NAHI HONI CHAHIYE v1 mein -->
<!-- <uses-permission android:name="android.permission.INTERNET" /> -->
```
Yeh trust signal hai — Google aur users dono ke liye.

---

# TIER 4 — Small (Manageable)

---

## S1. TypeScript Path Aliases

**Kab aayegi:** Phase 0 — Setup
**Problem:** `../../../core/crypto/aes` → ugly aur brittle

**Fix — ek baar setup, poori life easy:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@core/*": ["src/core/*"],
      "@features/*": ["src/features/*"],
      "@ui/*": ["src/ui/*"],
      "@lib/*": ["src/lib/*"]
    }
  }
}
```
```javascript
// babel.config.js
module.exports = {
  plugins: [
    ['module-resolver', {
      alias: {
        '@': './src',
        '@core': './src/core',
        '@features': './src/features',
        '@ui': './src/ui',
        '@lib': './src/lib',
      }
    }]
  ]
}
```

**Pehle din setup karo** — baad mein 200 files mein paths change karna bahut painful hai.

---

## S2. Urdu / RTL Layout Breaking

**Kab aayegi:** Phase 7 — Polish
**Problem:** RTL on karo to English layout toot jaata hai

**Prevention from day 1:**
```typescript
// Galat — RTL mein ulta ho jaayega
<View style={{ flexDirection: 'row' }}>

// Sahi — RTL aware
<View style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }}>

// Ya RTL-aware component use karo
import { Row } from '@ui/components/Row'  // internally handles RTL
```

**Agar Urdu v1 mein complex lage:** English first launch karo, Urdu v2 mein properly add karo. Yeh valid decision hai.

---

## S3. Zod Validation Gap

**Kab aayegi:** Phase 2 onwards
**Problem:** UI validation pass kare, DB reject kare → unhandled error → crash

**Fix — Repository mein hamesha Zod:**
```typescript
// features/udhaar/UdhaarRepo.ts
import { z } from 'zod'

const CreateUdhaarSchema = z.object({
  personId: z.string().uuid(),
  amount: z.number().int().positive(),  // Integer paisa, positive
  direction: z.enum(['lena', 'dena']),
  date: z.number().int().positive(),
  returnDate: z.number().int().positive().optional(),
  note: z.string().max(500).optional(),
})

async create(input: unknown): Promise<Udhaar> {
  // Parse throws ZodError if invalid — never reaches DB
  const validated = CreateUdhaarSchema.parse(input)
  // ... DB insert
}
```

---

## S4. Logger — Accidental Secret Logging

**Kab aayegi:** Development mein — Sentry event mein password dikh jaaye
**Problem:** `console.log('Saving vault entry:', entry)` → `entry.secret_enc` Sentry mein

**Fix — Wrapper logger:**
```typescript
// lib/logger.ts
const SENSITIVE_KEYS = ['secret_enc', 'iv', 'tag', 'password', 'pin', 'key']

function sanitize(data: unknown): unknown {
  if (typeof data !== 'object' || !data) return data
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.some(s => k.toLowerCase().includes(s)) ? '[REDACTED]' : v
    ])
  )
}

export const logger = {
  info: (msg: string, data?: unknown) => {
    if (__DEV__) console.log(msg, sanitize(data))
    // Production: Sentry breadcrumb (sanitized)
  },
  error: (msg: string, error: unknown) => {
    Sentry.captureException(error, { extra: { msg } })
  }
}

// Rule: Raw console.log BANNED in production code
// ESLint rule add karo: 'no-console': 'error'
```

---

# VS Code Specific Issues

## V1. Extensions Setup

**Mandatory extensions — pehle din install karo:**

| Extension | ID |
|-----------|-----|
| React Native Tools | `msjsdiag.vscode-react-native` |
| ESLint | `dbaeumer.vscode-eslint` |
| Prettier | `esbenp.prettier-vscode` |
| Error Lens | `usernamehako.errorlens` |
| GitLens | `eamodio.gitlens` |
| ES7+ Snippets | `dsznajder.es7-react-js-snippets` |

**`.vscode/settings.json` (project mein commit karo):**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.tabSize": 2,
  "files.trimTrailingWhitespace": true
}
```

## V2. Android Studio Still Needed

VS Code sab kuch handle nahi karta:

| Kaam | VS Code | Android Studio |
|------|---------|----------------|
| Code likhna | ✅ | — |
| TypeScript debugging | ✅ | — |
| SQLCipher native errors | ❌ | ✅ (Gradle output) |
| Emulator | ❌ | ✅ (AVD Manager) |
| Logcat (native logs) | ❌ | ✅ |
| ProGuard issues | ❌ | ✅ |
| RAM usage | ~400MB | ~1.5GB |

**Workflow:**
```
VS Code → daily coding
Android Studio → sirf jab native error aaye ya emulator chahiye
```

---

# Quick Reference — Mushkilon ki Priority

| # | Mushkil | Tier | Kab | Time Cost |
|---|---------|------|-----|-----------|
| C1 | SQLCipher native linking | 🔴 Critical | Phase 1 | 1–3 din |
| C2 | Keystore key invalidation | 🔴 Critical | Phase 1 | 1 din |
| C3 | New Architecture compat | 🔴 Critical | Phase 0 | 1–2 din |
| C4 | PIN forgotten — data loss | 🔴 Critical | Production | 2 din (onboarding) |
| H1 | Scoped Storage (files) | 🟠 High | Phase 3 | 1 din |
| H2 | Notifications — OEM kill | 🟠 High | Phase 4 | 1–2 din |
| H3 | Biometric edge cases | 🟠 High | Phase 1 | 1 din |
| H4 | Money float bugs | 🟠 High | Phase 4 | Half din |
| H5 | EAS ProGuard crash | 🟠 High | Phase 8 | Half din |
| M1 | TypeScript strict friction | 🟡 Medium | Throughout | Ongoing |
| M2 | DB migration mismatch | 🟡 Medium | Updates | 1 din |
| M3 | Large file memory crash | 🟡 Medium | Phase 3 | Half din |
| M4 | Clipboard clear failure | 🟡 Medium | Phase 5 | Half din |
| M5 | Play Store rejection | 🟡 Medium | Phase 8 | Half din |
| S1 | TS path aliases | 🟢 Small | Phase 0 | 1 ghanta |
| S2 | Urdu RTL breaking | 🟢 Small | Phase 7 | 1 din |
| S3 | Zod validation gap | 🟢 Small | Phase 2 | Half din |
| S4 | Secret logging | 🟢 Small | Phase 0 | 1 ghanta |
| V1 | VS Code setup | 🟢 Small | Phase 0 | 1 ghanta |

---

# Golden Rules — Mushkilon ke liye

1. **C1 (SQLCipher) Phase 1 mein prove karo** — features baad mein
2. **C2 (Key invalidation) test karo** — emulator pe fingerprint change karke
3. **C3 (New Arch) Phase 0 mein check karo** — saari libs ek saath install karke test build
4. **C4 (PIN forgotten) onboarding mein mandatory** — skip button nahi
5. **H4 (Float money) property-based test** — 10,000 cases se prove karo
6. **H5 (ProGuard) release build Phase 7 mein** — production se pehle

**Total extra time in-budget rakhna: ~2 weeks buffer** har 8-week plan ke upar.

---

**App:** Privo | **Plan version:** v2 | **Challenges doc version:** v1
**Last updated:** Phase 0 shuru karne se pehle review karo
ENDOFFILE