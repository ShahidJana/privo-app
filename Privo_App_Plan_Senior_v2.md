# Privo — Personal Vault App
## Production-Grade Engineering Plan v2.0 (Senior Level)

> **Standard:** 5–10 year senior developer level. Har section mein edge cases + concrete solution ya tested alternative. Goal: shippable, secure, maintainable production app — not a demo.

---

# 0. Product Definition

**App Name:** Privo
**Tagline:** Your private life, secured.
**Platform:** Android first (React Native), iOS-ready architecture from day 1
**Core principle:** Zero-knowledge, offline-first. Data kabhi device se bahar nahi jaata (v1).
**Min SDK:** Android 8.0 (API 26) — covers 95%+ devices
**Target SDK:** Android 14 (API 34)

### Non-Negotiable Quality Bars

| Metric | Target |
|--------|--------|
| Crash-free sessions | > 99.5% |
| Cold start time | < 2 seconds |
| App lock response | < 300ms |
| DB query (list) | < 100ms |
| Encryption at rest | AES-256-GCM mandatory |
| Plaintext secrets in DB/logs | Zero tolerance |
| Play Store rating target | > 4.2 |

---

# 1. Architecture Decision Records (ADR)

| # | Decision | Choice | Why | Rejected Alternative + Reason |
|---|----------|--------|-----|-------------------------------|
| ADR-1 | Framework | React Native Bare Workflow | Native module access (Keystore, SQLCipher, BiometricPrompt) | Expo Go — cannot access SQLCipher or hardware Keystore |
| ADR-2 | Language | TypeScript strict mode | Type safety = fewer runtime bugs in crypto/money code | JS — too risky for security-critical data handling |
| ADR-3 | Database | SQLCipher via `op-sqlite` | Full-DB encryption, industry standard, battle-tested | Plain SQLite — unencrypted file on disk = data exposed |
| ADR-4 | Encryption | AES-256-GCM + Android Keystore | Hardware-backed key, authenticated encryption, tamper-evident | CryptoJS (pure JS) — slow, no hardware protection |
| ADR-5 | State mgmt | Zustand + TanStack Query | Lightweight, async-friendly, no boilerplate | Redux Toolkit — overkill for solo/small team |
| ADR-6 | Navigation | React Navigation v6 | Mature, deep-link ready, type-safe with TS | expo-router — file-based routing adds complexity for this app shape |
| ADR-7 | Auth | expo-local-authentication (BiometricPrompt API) | Standard Android biometric stack, PIN fallback built-in | Custom PIN only — worse UX, loses fingerprint advantage |
| ADR-8 | Architecture | Feature-based modules + Repository pattern | Testable, swappable data layer, each feature independent | Flat structure — becomes unmaintainable after 3 modules |
| ADR-9 | Error tracking | Sentry (self-hosted or free tier) | Production crash visibility without sending user data | Firebase Crashlytics — requires Google services, more data sharing |
| ADR-10 | Build/CI | EAS Build + GitHub Actions | Automated signed builds, PR checks | Manual local builds — not reproducible, error-prone |

### Layered Architecture (strict)

```
┌─────────────────────────────────────────┐
│  UI Layer (screens, components)         │  ← Only renders, no business logic
├─────────────────────────────────────────┤
│  Hook Layer (useDocuments, useVault..)  │  ← Orchestrates, handles loading/error
├─────────────────────────────────────────┤
│  Repository Layer (business logic)      │  ← Validation, rules, transactions
├─────────────────────────────────────────┤
│  Data Layer (SQLCipher DAO, FileSystem) │  ← Pure data access, no logic
├─────────────────────────────────────────┤
│  Core (Crypto, Security, Backup)        │  ← Foundational, no feature deps
└─────────────────────────────────────────┘
```

**Rule:** Dependencies go downward only. UI never touches DAO directly.

---

# 2. Threat Model (Full)

| # | Threat | Attack Vector | Mitigation | Fallback if mitigation fails |
|---|--------|--------------|------------|------------------------------|
| T1 | Phone stolen, unlocked | Physical access | App lock (biometric+PIN), auto-lock on background | Screen lock at OS level (user education) |
| T2 | Phone stolen, locked | ADB/file extraction | SQLCipher + `allowBackup=false` | DB file unreadable without Keystore key |
| T3 | Rooted device, memory dump | Root access | Decrypt on-demand only, clear after use, root warning | Warn user, optional block |
| T4 | ADB backup extraction | USB | `android:allowBackup="false"` in manifest | Auto-backup rules XML excludes DB |
| T5 | Screenshot/screen recording | Malware or shoulder-surfing | `FLAG_SECURE` on all sensitive screens | — |
| T6 | Clipboard sniffing | Malware reads clipboard | Auto-clear clipboard after 30 seconds | Warn user to clear manually |
| T7 | Brute force PIN | Physical access to unlocked app | Exponential lockout, optional data wipe | Device-level lock triggers first |
| T8 | Master key extraction | App reverse engineering | Key in hardware Keystore (non-exportable) | Key never in APK or SharedPreferences |
| T9 | Pattern leak (ciphertext) | Cryptanalysis | Per-record random IV (AES-GCM) | Same password → different ciphertext |
| T10 | Logs leaking secrets | Debug/crash logs | Never log sensitive fields, Sentry scrubbing rules | Code review checklist item |
| T11 | Fake/tampered import file | Malicious .privo file | HMAC verification on import, version check | Reject with clear error |
| T12 | Overlay attack (tapjacking) | Malicious app overlay | `filterTouchesWhenObscured=true` on auth screens | OS-level mitigation (Android 9+) |

---

# 3. Data Models (Complete Schema)

```sql
-- ============================================================
-- CORE
-- ============================================================

CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- seed: schema_version=1, app_lock_enabled=true,
--       lock_timeout_seconds=30, wipe_after_attempts=0 (0=disabled)

-- ============================================================
-- MODULE 1: DOCUMENTS
-- ============================================================

CREATE TABLE documents (
  id            TEXT PRIMARY KEY,         -- UUIDv4
  title         TEXT NOT NULL,
  category      TEXT NOT NULL             -- 'educational' | 'personal'
                CHECK(category IN ('educational','personal')),
  doc_type      TEXT,                     -- 'cnic','degree','passport','license','birth_cert','other'
  file_uri      TEXT,                     -- path in app sandbox (nullable)
  file_hash     TEXT,                     -- SHA-256 of original file (integrity check)
  file_size_kb  INTEGER,
  expiry_date   INTEGER,                  -- UTC epoch ms, nullable
  notes         TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER                   -- NULL = active, timestamp = soft-deleted
);

CREATE INDEX idx_documents_category ON documents(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_expiry ON documents(expiry_date) WHERE deleted_at IS NULL;

-- ============================================================
-- MODULE 2: UDHAAR (LENA-DENA)
-- ============================================================

CREATE TABLE persons (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT,
  created_at INTEGER NOT NULL
);
-- Normalizing person prevents duplicate names, enables person-level net balance

CREATE TABLE udhaar (
  id          TEXT PRIMARY KEY,
  person_id   TEXT NOT NULL REFERENCES persons(id),
  amount      INTEGER NOT NULL             -- PAISA (integer). Never float.
              CHECK(amount > 0),
  direction   TEXT NOT NULL
              CHECK(direction IN ('lena','dena')),
  currency    TEXT NOT NULL DEFAULT 'PKR',
  date        INTEGER NOT NULL,            -- UTC epoch ms
  return_date INTEGER,                     -- nullable
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK(status IN ('pending','partial','settled')),
  note        TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER
);

CREATE TABLE udhaar_payments (
  id         TEXT PRIMARY KEY,
  udhaar_id  TEXT NOT NULL REFERENCES udhaar(id),
  amount     INTEGER NOT NULL CHECK(amount > 0),  -- PAISA
  date       INTEGER NOT NULL,
  note       TEXT,
  created_at INTEGER NOT NULL
);
-- Status auto-recomputed: sum(payments)==0 → pending, <amount → partial, >=amount → settled

CREATE INDEX idx_udhaar_person ON udhaar(person_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_udhaar_status ON udhaar(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_udhaar_return ON udhaar(return_date) WHERE deleted_at IS NULL AND status != 'settled';

-- ============================================================
-- MODULE 3: VAULT (PASSWORDS)
-- ============================================================

CREATE TABLE vault (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  username    TEXT,
  secret_enc  TEXT NOT NULL,   -- AES-256-GCM ciphertext (base64)
  iv          TEXT NOT NULL,   -- per-record random IV (base64) — NEVER reuse
  tag         TEXT NOT NULL,   -- GCM auth tag — tamper detection
  category    TEXT,            -- 'bank','social','email','app','other'
  url         TEXT,
  notes_enc   TEXT,            -- encrypted notes (nullable)
  enc_version INTEGER NOT NULL DEFAULT 1,  -- for future re-encryption migrations
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER
);

CREATE INDEX idx_vault_category ON vault(category) WHERE deleted_at IS NULL;
```

**Schema decisions explained:**
- `persons` table normalized → net balance per person computed cleanly via JOIN, no string matching
- `CHECK` constraints → invalid data rejected at DB layer, not just UI
- `enc_version` → re-encryption migration is resumable (skip already-migrated records)
- `tag` stored separately → GCM auth tag tamper check on decrypt
- All money `INTEGER` paisa → zero float precision bugs
- All timestamps `INTEGER` UTC epoch ms → timezone-safe

---

# 4. Edge Cases — Complete (with solutions)

## 4.0 Onboarding / First Launch

| Edge Case | Solution | Alternative |
|-----------|----------|-------------|
| First launch — no encryption key | Generate key in Android Keystore during onboarding, never leaves hardware | PBKDF2 from PIN (weaker, only if Keystore unavailable) |
| User skips PIN setup | Block — PIN is mandatory. No skip option. Show why (security explanation) | — |
| Biometric not enrolled on device | Skip biometric step, PIN-only mode | — |
| Keystore unavailable (old/custom ROM) | Detect → fallback to PBKDF2 key from PIN → warn user security is software-level | — |
| User closes app during onboarding | Re-show onboarding on next launch; detect incomplete state via `meta.onboarding_complete` flag | — |
| Device has no secure hardware | Show warning banner; still allow use | Block entirely — too harsh |

## 4.1 App Lock / Authentication

| Edge Case | Solution | Alternative |
|-----------|----------|-------------|
| Biometric hardware changes (fingerprint re-enrolled) | Keystore key invalidated by OS → detect `KeyPermanentlyInvalidatedException` → force PIN re-auth + re-generate key | — |
| Wrong PIN entered repeatedly | 5 attempts → 30s lockout → 10 attempts → 5min → 15 attempts → optional wipe (user-configured) | Log attempts only (weaker) |
| App sent to background mid-edit | Save draft to temp (non-sensitive only), lock app, restore draft after unlock | Discard draft — bad UX |
| Lock screen appears over system dialog | Use `AppState` listener + `useEffect` cleanup — don't double-show lock | — |
| Auto-lock timeout while charging/screen on | Still lock — security > convenience | — |
| App lock screen itself crashes | Error boundary wrapping lock screen → fallback to black screen + restart prompt | — |
| Biometric prompt canceled by user | Return to lock screen, offer PIN option | — |
| `KeyguardManager` not available | Fallback to PIN only | — |

## 4.2 Database / Storage

| Edge Case | Solution | Alternative |
|-----------|----------|-------------|
| App killed mid-transaction | SQLite WAL mode + atomic transactions → rollback on restart | — |
| DB migration fails midway | Migration wrapped in transaction; on fail → rollback → show "update failed" screen with export option | Silent fail → corruption |
| Schema version mismatch (downgrade) | Detect `db_version > app_version` → block with "please update app" | Silent load → crash |
| Storage full during write | Catch `SQLITE_FULL` error → show actionable message "free X MB to continue" | Crash |
| DB file corrupted (bit rot) | On open fail → offer restore from backup export | — |
| Very old DB schema (2+ versions behind) | Chain migrations: v1→v2→v3 tested individually and combined | Jump migrations — risky |

## 4.3 Documents Module

| Edge Case | Solution | Alternative |
|-----------|----------|-------------|
| File > 15MB | Reject with size shown: "File is 22MB, max 15MB" | Silently fail |
| Unsupported file type | Whitelist: `.jpg .jpeg .png .pdf` only. Show supported formats | Allow all → preview chaos |
| File picked, then moved/deleted by user | Copy to app private sandbox (`/data/data/...`) immediately on pick | Reference external URI → breaks |
| File write succeeds, DB insert fails | Transaction: atomic. File written inside transaction; rollback deletes file | Orphaned file on disk |
| Image corrupt / unreadable | Try-decode on import; flag `file_corrupt=true` in DB; show broken-image placeholder | Crash on open |
| PDF preview not supported natively | Use `react-native-pdf` lib; fallback: show metadata + "open externally" button | Crash |
| Expiry date reminder while app closed | Scheduled local notification (expo-notifications) | — |
| Notification permission denied | In-app badge "3 documents expiring soon" as fallback | — |
| User deletes file from Files app directly | `file_hash` mismatch detected on open → show "file missing, re-import?" | Silent broken state |
| 1000+ documents performance | `FlatList` with `windowSize=5`, `maxToRenderPerBatch=10`, thumbnail cache | — |
| Document preview leaks in app switcher | `FLAG_SECURE` on preview screen | — |
| Duplicate title | Warn only ("Similar document exists"), allow save | Silent duplicate |
| Re-import same file | Hash comparison → "Document already exists. Replace or keep both?" | — |

## 4.4 Udhaar Module

| Edge Case | Solution | Alternative |
|-----------|----------|-------------|
| Float money | Integer paisa throughout. Format `amount / 100` at display only | Any float → bugs |
| Zero or negative amount | `CHECK(amount > 0)` in DB + UI validation | Silent save |
| Return date before lend date | Validation error, block save with message | — |
| Partial repayment > total owed | Warn: "Amount exceeds remaining balance. Save anyway?" | Silent overpayment |
| Multiple debts, same person | Normalized `persons` table → group by `person_id` → show net balance + drill-down | String match → "Ali" vs "ali" treated as different |
| Net balance both directions same person | `SUM(lena) - SUM(dena)` per person; show "net owed to you: PKR X" | Show raw list only |
| Settled debt re-opened | Allow (circumstances change); `updated_at` audit trail; recompute status | — |
| Reminder for already-settled debt | Cancel scheduled notification on settle/delete | Stale reminders annoying user |
| Reminder after phone restart | `expo-notifications` reschedule on boot via background task | Lost reminders |
| Person name typo (duplicate persons) | Warn if similar name exists; merge person feature in v2 | — |
| Delete person with active debts | Block delete: "Ali has 2 pending debts. Settle them first." | Cascade delete — data loss |
| Very large amounts (lakhs, crores) | Integer paisa handles up to PKR 90 trillion — no overflow | — |

## 4.5 Password Vault

| Edge Case | Solution | Alternative |
|-----------|----------|-------------|
| Keystore key invalidated (biometric change) | Detect on decrypt → force PIN re-auth → re-generate key → re-encrypt all records | Permanent data loss |
| Decrypt fails on single record | Catch per-item; show "cannot decrypt" placeholder; rest of vault still works | Full vault crash |
| PIN forgotten | No backdoor (zero-knowledge). Onboarding: mandatory "set up recovery export" step. Clear warning: "Forgotten PIN = data unrecoverable" | Secret question — security hole |
| Same password saved twice → same ciphertext | Per-record random IV → same plaintext → different ciphertext every time | Pattern leak |
| GCM tag mismatch (tampered record) | Decrypt throws → show "record tampered or corrupt" → offer delete | Silent load |
| Password revealed too long | Auto-hide after 15 seconds (configurable) | — |
| Copy password → clipboard sniffing | `Clipboard.setString()` → schedule clear after 30s | Manual clear |
| Screenshot of revealed password | `FLAG_SECURE` on vault screens → blank in screenshots/recents | — |
| Re-encryption migration interrupted | `enc_version` per record → batch re-encrypt; skip already-migrated; resumable | Full re-encrypt every restart |
| Memory dump while password revealed | Decrypt on-demand into local variable; `null` after hide; never store in Zustand | — |
| Overlay/tapjacking on vault entry | `filterTouchesWhenObscured=true` on input fields | — |
| Brute force via USB (after jailbreak) | Keystore key hardware-bound; exponential lockout + optional wipe | — |

## 4.6 Backup / Export-Import

| Edge Case | Solution | Alternative |
|-----------|----------|-------------|
| Export file password weak | Enforce minimum strength; PBKDF2 with 600,000 iterations | Weak password → brute-forceable export |
| Import file tampered | HMAC-SHA256 of entire payload verified before any data written | Silent corrupt import |
| Import conflicts (record exists) | Show conflict resolution UI: "Keep existing / Replace / Keep both" | Silent overwrite |
| Import from future app version | Detect version mismatch → show "update app to import this file" | Silent parse fail |
| Partial import (app killed mid-import) | Entire import in one transaction; rollback on any failure | Half-imported state |
| Export file stored insecurely | Write to app temp dir, share via Android Share Sheet → user controls destination | Writing to Downloads (accessible to other apps) |
| Very large backup (1000+ records) | Stream write in chunks; progress indicator | Memory crash on large JSON |

---

# 5. Engineering Phases (Definition of Done per phase)

### Phase 0 — Foundation (Week 1)
**Build:**
- Bare React Native + TypeScript strict
- ESLint (airbnb-typescript) + Prettier + Husky pre-commit
- Feature-based folder structure
- GitHub Actions CI: lint → typecheck → test on every PR
- Sentry crash reporting wired up
- `.env` setup, `react-native-config`

**DoD:** `yarn android` builds clean. CI runs green. Force a JS crash → Sentry receives it. Zero lint errors.

---

### Phase 1 — Security Core (Week 2) ⚠️ NEVER SKIP THIS
**Build:**
- Android Keystore key generation + AES-256-GCM encrypt/decrypt (unit tested, round-trip verified)
- SQLCipher DB initialization with Keystore-derived key
- App lock screen: biometric + PIN, auto-lock on background, lockout logic
- `FLAG_SECURE` on all sensitive screens
- `android:allowBackup="false"` + Auto Backup exclusion rules

**DoD (measurable):**
- `adb pull` the DB file → `sqlite3 db.sqlite` fails with "not a database" (encrypted)
- Encrypt "hello" → decrypt → "hello" (100 round-trip unit tests pass)
- App goes background → returns → lock screen shown
- Wrong PIN x 5 → lockout fires
- Sentry receives no plaintext secrets in any event

---

### Phase 2 — Data Layer (Week 2–3)
**Build:**
- Full schema creation + seed
- Migration framework (`PRAGMA user_version` + versioned migration files)
- Repository classes: `DocumentRepo`, `UdhaarRepo`, `VaultRepo`
- Validation layer (Zod schemas)
- Unit tests for all repos

**DoD:** > 80% repo test coverage. Migration v1→v2 (simulated) passes. Zod rejects invalid data with typed errors.

---

### Phase 3 — Documents Module (Week 3–4)
**Build:**
- Add / List / View / Edit / Soft-delete
- File picker → copy to sandbox → compress → hash → save
- Paginated list (FlatList virtualized)
- Expiry notifications (with permission denial fallback)
- FLAG_SECURE on preview

**DoD:** 1000-document list renders at 60fps (Flipper profiler). Orphaned file test verified. Notification fires on schedule.

---

### Phase 4 — Udhaar Module (Week 4–5)
**Build:**
- Persons + Udhaar + Payments CRUD
- Net balance engine (per-person computation)
- Status auto-engine (pending/partial/settled)
- Return date reminders

**DoD:** Property-based tests (fast-check): 10,000 random paisa amounts → zero rounding errors. Net balance correct for 50 mixed lena/dena test cases.

---

### Phase 5 — Vault Module (Week 5–6)
**Build:**
- Encrypted CRUD with per-record IV
- Reveal / auto-hide (15s)
- Clipboard copy + auto-clear (30s)
- Brute-force lockout
- GCM tag tamper detection

**DoD:** `adb pull` DB → grep for any plaintext password → zero results. Clipboard cleared after 30s. Tamper test: flip one byte in `secret_enc` → error shown, rest of vault unaffected.

---

### Phase 6 — Backup / Portability (Week 6–7)
**Build:**
- Encrypted export (`.privo` file, PBKDF2 600k iterations, HMAC)
- Import with validation + conflict UI
- Onboarding: mandatory "set up backup" prompt

**DoD:** Export → factory reset → import → 100% data restored. Wrong password → clean rejection. Tampered file → HMAC fail → rejection.

---

### Phase 7 — Polish + Hardening (Week 7–8)
**Build:**
- Onboarding flow (5 screens max)
- Empty states (every list)
- Error states with recovery action (every async operation)
- Dark mode (token-based, no hardcoded colors)
- RTL support (`I18nManager`)
- Urdu language option (i18n)
- Root detection warning (jail-monkey)
- Performance profiling + fixes
- Accessibility audit (TalkBack pass)
- `filterTouchesWhenObscured` on auth inputs

**DoD:** Zero UI dead-ends. TalkBack navigates all screens. Cold start < 2s on mid-range device. Root detected on rooted emulator.

---

### Phase 8 — Release (Week 8–9)
**Build:**
- Final app icon + splash (all densities)
- Play Store listing, screenshots, description
- Privacy policy (hosted URL — mandatory, declare "no data collected, no internet access")
- ProGuard/R8 rules
- Hermes engine enabled
- Signed AAB via EAS Build
- Internal track → closed test (10 users) → production

**DoD:** Play Console pre-launch report: zero crashes, zero ANRs. AAB size < 30MB. Privacy policy URL resolves.

---

# 6. Testing Strategy (Full)

| Layer | Tool | Coverage Target | What |
|-------|------|-----------------|------|
| Unit | Jest + ts-jest | > 80% (repos, crypto, validation, money) | Pure functions, repos |
| Property-based | fast-check | Money math, status transitions | 10,000+ generated cases |
| Component | React Native Testing Library | Key screens | Forms, error states, empty states |
| Integration | Jest + SQLCipher in-memory | Full repo flows | Save → retrieve → delete |
| E2E | Maestro | Critical paths only | Unlock → add → reveal → delete |
| Manual device | Physical + emulator matrix | — | See below |

### Manual Test Matrix

| Scenario | Why |
|----------|-----|
| Android 8.0 (API 26) min SDK device | Oldest supported |
| Android 14 latest | Newest |
| Device with no biometric sensor | PIN-only path |
| Device with biometric (re-enroll mid-test) | Key invalidation path |
| Fill storage to < 10MB free | Storage full path |
| Kill app mid-write (force stop) | Transaction rollback |
| Deny all permissions | Permission denial paths |
| Import corrupt .privo file | HMAC rejection |
| Wrong PIN x 15 | Full lockout path |
| Dark mode toggle mid-session | Theme switch |

---

# 7. Performance Budget

| Item | Target | How |
|------|--------|-----|
| Cold start | < 2s | Hermes + lazy-load non-critical modules |
| List scroll (1000 items) | 60fps constant | FlatList virtualised, `windowSize=5` |
| DB query (list with filter) | < 100ms | Indexes on all filter/sort columns |
| Encrypt/decrypt single record | < 50ms | AES-GCM is fast; Keystore call is sync |
| File import (5MB PDF) | < 3s | Background thread via `runAsync` |
| App lock screen appear | < 300ms | Pre-render lock screen in background |
| APK/AAB size | < 30MB | ProGuard + Hermes bytecode |
| Memory (idle) | < 80MB | No large in-memory caches |

---

# 8. Project Structure

```
privo/
├── android/
├── ios/                          # Scaffold ready for v2
├── src/
│   ├── app/                      # Screen components (thin, no logic)
│   │   ├── onboarding/
│   │   ├── lock/
│   │   ├── documents/
│   │   ├── udhaar/
│   │   └── vault/
│   ├── features/
│   │   ├── documents/
│   │   │   ├── DocumentRepo.ts
│   │   │   ├── useDocuments.ts
│   │   │   ├── documents.types.ts
│   │   │   └── documents.validation.ts
│   │   ├── udhaar/
│   │   │   ├── UdhaarRepo.ts
│   │   │   ├── useUdhaar.ts
│   │   │   ├── udhaar.types.ts
│   │   │   └── udhaar.validation.ts
│   │   └── vault/
│   │       ├── VaultRepo.ts
│   │       ├── useVault.ts
│   │       ├── vault.types.ts
│   │       └── vault.validation.ts
│   ├── core/
│   │   ├── crypto/
│   │   │   ├── keystore.ts         # Android Keystore wrapper
│   │   │   ├── aes.ts              # AES-256-GCM encrypt/decrypt
│   │   │   └── pbkdf2.ts           # PIN-derived key fallback
│   │   ├── db/
│   │   │   ├── database.ts         # SQLCipher init
│   │   │   ├── migrations/
│   │   │   │   ├── index.ts        # Migration runner
│   │   │   │   └── v1_initial.ts
│   │   │   └── dao/                # Raw SQL queries per table
│   │   ├── security/
│   │   │   ├── appLock.ts          # Biometric + PIN logic
│   │   │   ├── flagSecure.ts
│   │   │   └── rootDetection.ts
│   │   └── backup/
│   │       ├── export.ts
│   │       └── import.ts
│   ├── ui/
│   │   ├── components/             # Shared components
│   │   ├── theme/                  # Color tokens, typography
│   │   └── i18n/                   # en.json, ur.json
│   ├── lib/
│   │   ├── money.ts                # Paisa formatting, validation
│   │   ├── date.ts                 # UTC epoch helpers
│   │   ├── uuid.ts
│   │   └── logger.ts               # Sentry wrapper — never logs secrets
│   └── store/                      # Zustand stores (non-sensitive only)
├── __tests__/
│   ├── unit/
│   ├── integration/
│   └── e2e/                        # Maestro flows
├── .github/
│   └── workflows/
│       └── ci.yml
├── .env.example
├── app.json
└── package.json
```

---

# 9. Full Dependency List

```
// PRODUCTION
react-native 0.74.x
typescript 5.x
@react-navigation/native 6.x
@react-navigation/bottom-tabs 6.x
@react-navigation/stack 6.x
op-sqlite                          // SQLCipher for React Native
react-native-aes-crypto            // AES-256-GCM
react-native-keychain 8.x          // Android Keystore wrapper
expo-local-authentication 14.x     // BiometricPrompt
expo-notifications 0.28.x          // Local notifications
expo-image-picker 15.x
expo-file-system 17.x
react-native-image-resizer 3.x     // File compression
react-native-pdf 6.x               // PDF preview
zustand 4.x
@tanstack/react-query 5.x
zod 3.x                            // Schema validation
react-native-config 1.x            // .env
@sentry/react-native 5.x
jail-monkey 2.x                    // Root detection
zxcvbn-ts 3.x                      // Password strength meter
date-fns 3.x                       // Date formatting (UTC-safe)
react-native-mmkv 2.x              // Fast non-sensitive storage

// DEV ONLY
jest 29.x
ts-jest 29.x
fast-check 3.x
@testing-library/react-native 12.x
eslint 8.x
prettier 3.x
husky 9.x
lint-staged 15.x
```

---

# 10. Risk Register (Complete)

| Risk | Probability | Impact | Mitigation | Early Warning Signal |
|------|------------|--------|------------|---------------------|
| SQLCipher RN setup fails (linking error) | Medium | High | Spike in Phase 1 before any feature work | Build fails during Phase 1 |
| Android Keystore unavailable on device | Low | High | PBKDF2 fallback + user warning in onboarding | Keystore API throws on first launch |
| User forgets PIN → data loss | High | High | Mandatory backup during onboarding; clear "no backdoor" warning | Support requests after launch |
| Crypto bug (silent encrypt/decrypt mismatch) | Low | Critical | Extensive unit + round-trip tests; never custom crypto | Test failure |
| Play Store rejection (data safety form) | Medium | Medium | Accurate declaration: no network, no collection; privacy policy ready | Pre-launch checklist |
| Scope creep (adding features mid-build) | High | Medium | Strict v1 scope lock; backlog all extras; DoD gates | Phase timelines slipping |
| Third-party lib abandoned | Low | Medium | Prefer libs with > 1000 stars + recent commits; abstract behind interface | Lib last commit > 1 year |
| Re-encryption migration data loss | Low | Critical | Migration in transaction + `enc_version` per record + export before migration | Migration test failure |
| Performance regression (slow list) | Medium | Low | Performance budget enforced; Flipper profiling in DoD | > 16ms frame time in profiler |

---

# 11. v1 vs v2 Scope (Strict Boundary)

### v1 — This Plan
- Documents vault (local, no cloud)
- Udhaar tracker
- Password vault
- Encrypted backup/restore
- App lock (biometric + PIN)
- Android only

### v2 Backlog — Do NOT touch in v1
- Encrypted cloud sync (E2E — only user can decrypt)
- iOS support
- Biometric per-item unlock
- Audit log (who viewed what, when)
- Person merge (udhaar)
- Udhaar ledger PDF export
- Home screen widget (upcoming return dates)
- Android Autofill Framework integration (passwords)
- Multi-profile / family mode

---

# 12. Golden Rules (Non-negotiable)

1. **Security core first.** Not a single feature screen before crypto + DB + lock is proven.
2. **Every DB write is a transaction.** No exceptions. Ever.
3. **Money is integer paisa.** `amount / 100` only at display. Never float in logic.
4. **Zero plaintext secrets.** DB, logs, Sentry events, navigation state — none.
5. **Soft delete everything.** `deleted_at` timestamp. Real delete only on explicit "permanently delete."
6. **DoD is law.** "Feels done" is not done. Measure, verify, then move on.
7. **Zero-knowledge means zero backdoors.** Tell users clearly in onboarding.
8. **Abstract your data layer.** UI never touches DAO. Future you will thank present you.
9. **Never log sensitive input.** Logger wrapper enforces this — no raw `console.log` of secrets.
10. **One module at a time.** Documents → Udhaar → Vault. Complete DoD before next.

---

**App:** Privo
**v1 Scope:** Documents + Udhaar + Vault, offline, Android
**Timeline:** ~9 weeks (part-time, 2–3 hrs/day)
**Start:** Phase 0 (foundation) → Phase 1 (security spike). Build nothing else until Phase 1 DoD passes.
