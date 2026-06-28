# FanCall — Plan 01: Project Foundations + Telephony Core (Mock) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the simple, standard monorepo (backend = npm, android-sdk = Gradle, ios-sdk = SPM) and build the backend's first runnable, testable vertical slice: start a two-way masked call through a swappable `TelephonyAdapter`, using a `MockTelephonyDriver`, and process normalized call events via webhook — all without any telecom-operator credentials.

**Architecture:** A monorepo with three independently-installable subsystems. The backend (Node.js + TypeScript + Express) owns all logic. Telephony is hidden behind a `TelephonyAdapter` interface; Plan 01 ships a `MockTelephonyDriver` so the whole flow runs locally. The real `OperatorDirectDriver_TataDIGO` slots in later (separate plan) once DIGO sandbox credentials exist. Mobile SDKs are scaffolded as clean, empty, standard packages now and fleshed out in their own plans.

**Tech Stack:** Node.js 20+, TypeScript (ESM), Express 4, Vitest + Supertest (tests), tsx (dev run); Android: Gradle (Kotlin DSL) library module; iOS: Swift Package Manager.

## Global Constraints
- Backend language: **Node.js + TypeScript (ESM, `"type": "module"`)** — exact, no Python.
- Package manager (backend): **npm**.
- Test runner (backend): **Vitest**; HTTP tests use **Supertest**.
- Keep it **simple / standard / not congested** — no extra frameworks, no DI containers, no ORM yet (in-memory stores in Plan 01).
- **No VoIP/media** anywhere — the SDKs and backend never carry audio; the operator places the PSTN call.
- All phone numbers in **E.164** format (e.g. `+9198XXXXXXXX`).
- Telephony only ever via `TelephonyAdapter` — no provider call may bypass the interface.
- Node version pinned via `"engines": { "node": ">=20" }`.

---

### Task 1: Repo root + backend scaffold + health endpoint

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/src/app.ts`
- Create: `backend/src/server.ts`
- Test: `backend/test/health.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `createApp(): import('express').Express` from `backend/src/app.ts` — an Express app (no listener) that later tasks mount routes onto and tests drive with Supertest. `GET /health` → `200 { status: 'ok' }`.

- [ ] **Step 1: Create repo root files**

`README.md`:
```markdown
# FanCall

Paid masked-call platform (fan ↔ creator). Monorepo:

- `backend/` — Node.js + TypeScript API (npm)
- `android-sdk/` — Android client SDK (Gradle)
- `ios-sdk/` — iOS client SDK (SPM)

See `docs/specs/` for the PRD and `docs/superpowers/plans/` for implementation plans.
```

`.gitignore`:
```gitignore
# Node
node_modules/
dist/
*.log
.env

# Build
build/
.gradle/
*.xcodeproj/xcuserdata/
.build/
DerivedData/

# OS
.DS_Store
```

- [ ] **Step 2: Create backend project files**

`backend/package.json`:
```json
{
  "name": "@fancall/backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "express": "^4.19.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.0",
    "@types/supertest": "^6.0.2",
    "supertest": "^7.0.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

`backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

`backend/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Install dependencies**

Run: `cd backend && npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 4: Write the failing test**

`backend/test/health.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `cd backend && npm test`
Expected: FAIL — cannot find module `../src/app.js`.

- [ ] **Step 6: Write minimal implementation**

`backend/src/app.ts`:
```ts
import express, { type Express } from 'express';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  return app;
}
```

`backend/src/server.ts`:
```ts
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
createApp().listen(port, () => {
  console.log(`FanCall backend listening on :${port}`);
});
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd backend && npm test`
Expected: PASS (1 test).

- [ ] **Step 8: Commit**

```bash
git add README.md .gitignore backend/
git commit -m "feat(backend): scaffold Node+TS project with health endpoint"
```

---

### Task 2: Android SDK Gradle scaffold

**Files:**
- Create: `android-sdk/settings.gradle.kts`
- Create: `android-sdk/build.gradle.kts`
- Create: `android-sdk/gradle.properties`
- Create: `android-sdk/fancall-sdk/build.gradle.kts`
- Create: `android-sdk/fancall-sdk/src/main/AndroidManifest.xml`
- Create: `android-sdk/fancall-sdk/src/main/kotlin/com/fancall/sdk/FanCallClient.kt`

**Interfaces:**
- Consumes: nothing.
- Produces: a Gradle library module `:fancall-sdk` exposing `com.fancall.sdk.FanCallClient(baseUrl: String)` — a placeholder client host apps will later use. Host apps add this as a **Gradle** dependency.

- [ ] **Step 1: Create Gradle project files**

`android-sdk/settings.gradle.kts`:
```kotlin
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "fancall-android"
include(":fancall-sdk")
```

`android-sdk/build.gradle.kts`:
```kotlin
plugins {
    id("com.android.library") version "8.5.0" apply false
    id("org.jetbrains.kotlin.android") version "2.0.0" apply false
}
```

`android-sdk/gradle.properties`:
```properties
android.useAndroidX=true
org.gradle.jvmargs=-Xmx2048m
kotlin.code.style=official
```

- [ ] **Step 2: Create the library module**

`android-sdk/fancall-sdk/build.gradle.kts`:
```kotlin
plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.fancall.sdk"
    compileSdk = 34

    defaultConfig {
        minSdk = 24
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // Host apps install transitive deps via Gradle. Kept minimal on purpose.
}
```

`android-sdk/fancall-sdk/src/main/AndroidManifest.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest />
```

`android-sdk/fancall-sdk/src/main/kotlin/com/fancall/sdk/FanCallClient.kt`:
```kotlin
package com.fancall.sdk

/**
 * Thin client to the FanCall backend. No VoIP/media — the actual call is a
 * normal PSTN call placed by the telecom operator. Fleshed out in the
 * Android SDK plan.
 */
class FanCallClient(private val baseUrl: String) {
    fun version(): String = "0.1.0"
}
```

- [ ] **Step 3: Verify the module builds**

Run: `cd android-sdk && ./gradlew :fancall-sdk:assemble` (or open in Android Studio and sync)
Expected: BUILD SUCCESSFUL. (If no local Gradle wrapper, run `gradle wrapper` first, or sync in Android Studio.)

- [ ] **Step 4: Commit**

```bash
git add android-sdk/
git commit -m "feat(android-sdk): scaffold Gradle library module"
```

---

### Task 3: iOS SDK SPM scaffold

**Files:**
- Create: `ios-sdk/Package.swift`
- Create: `ios-sdk/Sources/FanCallSDK/FanCallClient.swift`
- Create: `ios-sdk/Tests/FanCallSDKTests/FanCallClientTests.swift`

**Interfaces:**
- Consumes: nothing.
- Produces: a Swift package `FanCallSDK` exposing `FanCallClient(baseURL: String)` with `version() -> String`. Host apps add it via **SPM**.

- [ ] **Step 1: Create the Swift package manifest**

`ios-sdk/Package.swift`:
```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "FanCallSDK",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "FanCallSDK", targets: ["FanCallSDK"])
    ],
    targets: [
        .target(name: "FanCallSDK"),
        .testTarget(name: "FanCallSDKTests", dependencies: ["FanCallSDK"])
    ]
)
```

- [ ] **Step 2: Write the failing test**

`ios-sdk/Tests/FanCallSDKTests/FanCallClientTests.swift`:
```swift
import XCTest
@testable import FanCallSDK

final class FanCallClientTests: XCTestCase {
    func testVersion() {
        let client = FanCallClient(baseURL: "https://api.example.com")
        XCTAssertEqual(client.version(), "0.1.0")
    }
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd ios-sdk && swift test`
Expected: FAIL — `FanCallClient` not found.

- [ ] **Step 4: Write minimal implementation**

`ios-sdk/Sources/FanCallSDK/FanCallClient.swift`:
```swift
import Foundation

/// Thin client to the FanCall backend. No VoIP/media — the actual call is a
/// normal PSTN call placed by the telecom operator. Fleshed out in the iOS SDK plan.
public struct FanCallClient {
    private let baseURL: String

    public init(baseURL: String) {
        self.baseURL = baseURL
    }

    public func version() -> String { "0.1.0" }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd ios-sdk && swift test`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add ios-sdk/
git commit -m "feat(ios-sdk): scaffold SwiftPM package with client stub"
```

---

### Task 4: Telephony domain types + `TelephonyAdapter` interface

**Files:**
- Create: `backend/src/telephony/types.ts`
- Test: `backend/test/telephony/types.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (used by Tasks 5–8 verbatim):
  - `type CallStatus = 'created' | 'ringing' | 'in_progress' | 'completed' | 'failed'`
  - `type NormalizedCallEventType = 'ringing' | 'answered' | 'completed' | 'failed'`
  - `interface StartMaskedCallParams { bookingId: string; creatorNumber: string; fanNumber: string; record: boolean }`
  - `interface MaskedCallSession { providerSessionId: string; virtualNumber: string; status: CallStatus }`
  - `interface NormalizedCallEvent { providerSessionId: string; type: NormalizedCallEventType; billableSeconds?: number; recordingUrl?: string; at: string }`
  - `interface TelephonyAdapter { startMaskedCall(p: StartMaskedCallParams): Promise<MaskedCallSession>; endCall(providerSessionId: string): Promise<void>; parseWebhook(payload: unknown): NormalizedCallEvent }`

- [ ] **Step 1: Write the failing test**

`backend/test/telephony/types.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { isCallStatus } from '../../src/telephony/types.js';

describe('isCallStatus', () => {
  it('accepts valid statuses and rejects others', () => {
    expect(isCallStatus('ringing')).toBe(true);
    expect(isCallStatus('in_progress')).toBe(true);
    expect(isCallStatus('banana')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- telephony/types`
Expected: FAIL — cannot find module `../../src/telephony/types.js`.

- [ ] **Step 3: Write minimal implementation**

`backend/src/telephony/types.ts`:
```ts
export type CallStatus =
  | 'created'
  | 'ringing'
  | 'in_progress'
  | 'completed'
  | 'failed';

export type NormalizedCallEventType =
  | 'ringing'
  | 'answered'
  | 'completed'
  | 'failed';

export interface StartMaskedCallParams {
  bookingId: string;
  creatorNumber: string; // E.164
  fanNumber: string; // E.164
  record: boolean;
}

export interface MaskedCallSession {
  providerSessionId: string;
  virtualNumber: string;
  status: CallStatus;
}

export interface NormalizedCallEvent {
  providerSessionId: string;
  type: NormalizedCallEventType;
  billableSeconds?: number;
  recordingUrl?: string;
  at: string; // ISO-8601
}

export interface TelephonyAdapter {
  startMaskedCall(params: StartMaskedCallParams): Promise<MaskedCallSession>;
  endCall(providerSessionId: string): Promise<void>;
  parseWebhook(payload: unknown): NormalizedCallEvent;
}

const CALL_STATUSES: readonly CallStatus[] = [
  'created',
  'ringing',
  'in_progress',
  'completed',
  'failed',
];

export function isCallStatus(value: unknown): value is CallStatus {
  return typeof value === 'string' && (CALL_STATUSES as readonly string[]).includes(value);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- telephony/types`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/telephony/types.ts backend/test/telephony/types.test.ts
git commit -m "feat(telephony): add domain types and TelephonyAdapter interface"
```

---

### Task 5: `MockTelephonyDriver`

**Files:**
- Create: `backend/src/telephony/mockDriver.ts`
- Test: `backend/test/telephony/mockDriver.test.ts`

**Interfaces:**
- Consumes: all types from `backend/src/telephony/types.ts` (Task 4).
- Produces:
  - `class MockTelephonyDriver implements TelephonyAdapter`
  - constructor `new MockTelephonyDriver()`
  - `startMaskedCall(params)` → resolves a `MaskedCallSession` with a generated `providerSessionId` (uuid), `virtualNumber` `'+910000000000'`, `status: 'ringing'`.
  - `parseWebhook(payload)` → maps `{ providerSessionId, type, billableSeconds?, recordingUrl?, at? }` to a `NormalizedCallEvent` (defaults `at` to now if missing); throws `Error('invalid webhook payload')` if `providerSessionId` or `type` missing/invalid.
  - `endCall(providerSessionId)` → resolves void.

- [ ] **Step 1: Write the failing test**

`backend/test/telephony/mockDriver.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { MockTelephonyDriver } from '../../src/telephony/mockDriver.js';

describe('MockTelephonyDriver', () => {
  it('starts a masked call and returns a ringing session', async () => {
    const driver = new MockTelephonyDriver();
    const session = await driver.startMaskedCall({
      bookingId: 'b1',
      creatorNumber: '+919800000001',
      fanNumber: '+919800000002',
      record: true,
    });
    expect(session.providerSessionId).toBeTruthy();
    expect(session.virtualNumber).toBe('+910000000000');
    expect(session.status).toBe('ringing');
  });

  it('parses a valid webhook payload into a normalized event', () => {
    const driver = new MockTelephonyDriver();
    const event = driver.parseWebhook({
      providerSessionId: 'sess-1',
      type: 'completed',
      billableSeconds: 90,
      recordingUrl: 'https://rec/1.mp3',
      at: '2026-06-28T10:00:00.000Z',
    });
    expect(event).toEqual({
      providerSessionId: 'sess-1',
      type: 'completed',
      billableSeconds: 90,
      recordingUrl: 'https://rec/1.mp3',
      at: '2026-06-28T10:00:00.000Z',
    });
  });

  it('throws on an invalid webhook payload', () => {
    const driver = new MockTelephonyDriver();
    expect(() => driver.parseWebhook({ type: 'completed' })).toThrow('invalid webhook payload');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- telephony/mockDriver`
Expected: FAIL — cannot find module `mockDriver.js`.

- [ ] **Step 3: Write minimal implementation**

`backend/src/telephony/mockDriver.ts`:
```ts
import { randomUUID } from 'node:crypto';
import type {
  MaskedCallSession,
  NormalizedCallEvent,
  NormalizedCallEventType,
  StartMaskedCallParams,
  TelephonyAdapter,
} from './types.js';

const EVENT_TYPES: readonly NormalizedCallEventType[] = [
  'ringing',
  'answered',
  'completed',
  'failed',
];

function isEventType(value: unknown): value is NormalizedCallEventType {
  return typeof value === 'string' && (EVENT_TYPES as readonly string[]).includes(value);
}

export class MockTelephonyDriver implements TelephonyAdapter {
  async startMaskedCall(_params: StartMaskedCallParams): Promise<MaskedCallSession> {
    return {
      providerSessionId: randomUUID(),
      virtualNumber: '+910000000000',
      status: 'ringing',
    };
  }

  async endCall(_providerSessionId: string): Promise<void> {
    // No-op for the mock.
  }

  parseWebhook(payload: unknown): NormalizedCallEvent {
    const p = payload as Record<string, unknown>;
    if (!p || typeof p.providerSessionId !== 'string' || !isEventType(p.type)) {
      throw new Error('invalid webhook payload');
    }
    return {
      providerSessionId: p.providerSessionId,
      type: p.type,
      billableSeconds: typeof p.billableSeconds === 'number' ? p.billableSeconds : undefined,
      recordingUrl: typeof p.recordingUrl === 'string' ? p.recordingUrl : undefined,
      at: typeof p.at === 'string' ? p.at : new Date().toISOString(),
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- telephony/mockDriver`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/telephony/mockDriver.ts backend/test/telephony/mockDriver.test.ts
git commit -m "feat(telephony): add MockTelephonyDriver"
```

---

### Task 6: `CallService` orchestration (in-memory store)

**Files:**
- Create: `backend/src/calls/callService.ts`
- Test: `backend/test/calls/callService.test.ts`

**Interfaces:**
- Consumes: `TelephonyAdapter`, `StartMaskedCallParams`, `NormalizedCallEvent`, `CallStatus` from Task 4.
- Produces:
  - `interface CallRecord { sessionId: string; bookingId: string; providerSessionId: string; virtualNumber: string; status: CallStatus; billableSeconds: number; recordingUrl?: string }`
  - `class CallService` with `constructor(adapter: TelephonyAdapter)`
  - `startCall(params: StartMaskedCallParams): Promise<CallRecord>` — calls `adapter.startMaskedCall`, stores a `CallRecord` (status from session), returns it.
  - `handleEvent(event: NormalizedCallEvent): CallRecord | undefined` — finds the record by `providerSessionId`, maps event → status (`ringing`→`ringing`, `answered`→`in_progress`, `completed`→`completed`, `failed`→`failed`), updates `billableSeconds`/`recordingUrl` when present. Returns the updated record, or `undefined` if no match.
  - `getBySessionId(sessionId: string): CallRecord | undefined`

- [ ] **Step 1: Write the failing test**

`backend/test/calls/callService.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { CallService } from '../../src/calls/callService.js';
import { MockTelephonyDriver } from '../../src/telephony/mockDriver.js';

const params = {
  bookingId: 'b1',
  creatorNumber: '+919800000001',
  fanNumber: '+919800000002',
  record: true,
};

describe('CallService', () => {
  it('starts a call and stores a retrievable record', async () => {
    const svc = new CallService(new MockTelephonyDriver());
    const rec = await svc.startCall(params);
    expect(rec.sessionId).toBeTruthy();
    expect(rec.bookingId).toBe('b1');
    expect(rec.status).toBe('ringing');
    expect(svc.getBySessionId(rec.sessionId)).toEqual(rec);
  });

  it('updates status and billing on a completed event', async () => {
    const svc = new CallService(new MockTelephonyDriver());
    const rec = await svc.startCall(params);
    const updated = svc.handleEvent({
      providerSessionId: rec.providerSessionId,
      type: 'completed',
      billableSeconds: 120,
      recordingUrl: 'https://rec/1.mp3',
      at: '2026-06-28T10:00:00.000Z',
    });
    expect(updated?.status).toBe('completed');
    expect(updated?.billableSeconds).toBe(120);
    expect(updated?.recordingUrl).toBe('https://rec/1.mp3');
  });

  it('returns undefined for an event with no matching session', async () => {
    const svc = new CallService(new MockTelephonyDriver());
    const result = svc.handleEvent({
      providerSessionId: 'does-not-exist',
      type: 'ringing',
      at: '2026-06-28T10:00:00.000Z',
    });
    expect(result).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- calls/callService`
Expected: FAIL — cannot find module `callService.js`.

- [ ] **Step 3: Write minimal implementation**

`backend/src/calls/callService.ts`:
```ts
import { randomUUID } from 'node:crypto';
import type {
  CallStatus,
  NormalizedCallEvent,
  NormalizedCallEventType,
  StartMaskedCallParams,
  TelephonyAdapter,
} from '../telephony/types.js';

export interface CallRecord {
  sessionId: string;
  bookingId: string;
  providerSessionId: string;
  virtualNumber: string;
  status: CallStatus;
  billableSeconds: number;
  recordingUrl?: string;
}

const EVENT_TO_STATUS: Record<NormalizedCallEventType, CallStatus> = {
  ringing: 'ringing',
  answered: 'in_progress',
  completed: 'completed',
  failed: 'failed',
};

export class CallService {
  private readonly bySessionId = new Map<string, CallRecord>();
  private readonly byProviderId = new Map<string, CallRecord>();

  constructor(private readonly adapter: TelephonyAdapter) {}

  async startCall(params: StartMaskedCallParams): Promise<CallRecord> {
    const session = await this.adapter.startMaskedCall(params);
    const record: CallRecord = {
      sessionId: randomUUID(),
      bookingId: params.bookingId,
      providerSessionId: session.providerSessionId,
      virtualNumber: session.virtualNumber,
      status: session.status,
      billableSeconds: 0,
    };
    this.bySessionId.set(record.sessionId, record);
    this.byProviderId.set(record.providerSessionId, record);
    return record;
  }

  handleEvent(event: NormalizedCallEvent): CallRecord | undefined {
    const record = this.byProviderId.get(event.providerSessionId);
    if (!record) return undefined;

    record.status = EVENT_TO_STATUS[event.type];
    if (typeof event.billableSeconds === 'number') {
      record.billableSeconds = event.billableSeconds;
    }
    if (event.recordingUrl) {
      record.recordingUrl = event.recordingUrl;
    }
    return record;
  }

  getBySessionId(sessionId: string): CallRecord | undefined {
    return this.bySessionId.get(sessionId);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- calls/callService`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/calls/callService.ts backend/test/calls/callService.test.ts
git commit -m "feat(calls): add CallService orchestration with in-memory store"
```

---

### Task 7: `POST /calls` endpoint (start a masked call)

**Files:**
- Create: `backend/src/calls/callRoutes.ts`
- Modify: `backend/src/app.ts` (mount the router + share a `CallService` instance)
- Test: `backend/test/calls/callRoutes.test.ts`

**Interfaces:**
- Consumes: `CallService` (Task 6), `createApp` (Task 1), `MockTelephonyDriver` (Task 5).
- Produces:
  - `createCallRouter(service: CallService): import('express').Router`
  - `createApp` updated to `createApp(service?: CallService): Express` — defaults to `new CallService(new MockTelephonyDriver())`, exposes the same instance to all routers, and returns the app. (Tests pass their own service.)
  - `POST /calls` body `{ bookingId, creatorNumber, fanNumber, record }` → `201 { sessionId, virtualNumber, status }`; missing/invalid field → `400 { error }`.

- [ ] **Step 1: Write the failing test**

`backend/test/calls/callRoutes.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('POST /calls', () => {
  it('starts a masked call and returns 201 with session info', async () => {
    const res = await request(createApp()).post('/calls').send({
      bookingId: 'b1',
      creatorNumber: '+919800000001',
      fanNumber: '+919800000002',
      record: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.sessionId).toBeTruthy();
    expect(res.body.virtualNumber).toBe('+910000000000');
    expect(res.body.status).toBe('ringing');
  });

  it('rejects a request missing required fields with 400', async () => {
    const res = await request(createApp()).post('/calls').send({ bookingId: 'b1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- calls/callRoutes`
Expected: FAIL — `POST /calls` returns 404 (route not mounted).

- [ ] **Step 3: Write the router**

`backend/src/calls/callRoutes.ts`:
```ts
import { Router } from 'express';
import type { CallService } from './callService.js';

function isE164(value: unknown): value is string {
  return typeof value === 'string' && /^\+[1-9]\d{6,14}$/.test(value);
}

export function createCallRouter(service: CallService): Router {
  const router = Router();

  router.post('/calls', async (req, res) => {
    const { bookingId, creatorNumber, fanNumber, record } = req.body ?? {};
    if (typeof bookingId !== 'string' || !isE164(creatorNumber) || !isE164(fanNumber)) {
      res.status(400).json({ error: 'bookingId and E.164 creatorNumber/fanNumber are required' });
      return;
    }
    const rec = await service.startCall({
      bookingId,
      creatorNumber,
      fanNumber,
      record: Boolean(record),
    });
    res.status(201).json({
      sessionId: rec.sessionId,
      virtualNumber: rec.virtualNumber,
      status: rec.status,
    });
  });

  return router;
}
```

- [ ] **Step 4: Wire it into the app**

Replace the contents of `backend/src/app.ts` with:
```ts
import express, { type Express } from 'express';
import { CallService } from './calls/callService.js';
import { MockTelephonyDriver } from './telephony/mockDriver.js';
import { createCallRouter } from './calls/callRoutes.js';

export function createApp(service: CallService = new CallService(new MockTelephonyDriver())): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use(createCallRouter(service));

  // Expose for routers added in later tasks (e.g. webhook handler).
  app.locals.callService = service;

  return app;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npm test -- calls/callRoutes`
Expected: PASS (2 tests).

- [ ] **Step 6: Run the full suite**

Run: `cd backend && npm test`
Expected: PASS (all tests from Tasks 1,4,5,6,7).

- [ ] **Step 7: Commit**

```bash
git add backend/src/calls/callRoutes.ts backend/src/app.ts backend/test/calls/callRoutes.test.ts
git commit -m "feat(calls): add POST /calls endpoint to start a masked call"
```

---

### Task 8: Telephony webhook endpoint (normalize + apply events)

**Files:**
- Create: `backend/src/telephony/webhookRoutes.ts`
- Modify: `backend/src/app.ts` (mount the webhook router, pass the adapter + service)
- Test: `backend/test/telephony/webhookRoutes.test.ts`

**Interfaces:**
- Consumes: `CallService` (Task 6), `MockTelephonyDriver`/`TelephonyAdapter` (Tasks 4–5), `createApp` (Task 7).
- Produces:
  - `createWebhookRouter(adapter: TelephonyAdapter, service: CallService): import('express').Router`
  - `POST /telephony/webhook` → parses the body via `adapter.parseWebhook`, applies it via `service.handleEvent`; returns `200 { applied: boolean }` (`applied=false` when no matching session); malformed payload → `400 { error }`.
  - `createApp` updated to build one shared `MockTelephonyDriver`, pass it to both the `CallService` and the webhook router.

- [ ] **Step 1: Write the failing test**

`backend/test/telephony/webhookRoutes.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { CallService } from '../../src/calls/callService.js';
import { MockTelephonyDriver } from '../../src/telephony/mockDriver.js';

describe('POST /telephony/webhook', () => {
  it('applies a completed event to an existing call (end-to-end)', async () => {
    // Inject a shared adapter + service so the test can read back the
    // provider session id the API does not expose.
    const adapter = new MockTelephonyDriver();
    const service = new CallService(adapter);
    const app = createApp(adapter, service);

    const start = await request(app).post('/calls').send({
      bookingId: 'b1',
      creatorNumber: '+919800000001',
      fanNumber: '+919800000002',
      record: true,
    });
    expect(start.status).toBe(201);

    const rec = service.getBySessionId(start.body.sessionId);
    expect(rec).toBeTruthy();

    const applied = await request(app).post('/telephony/webhook').send({
      providerSessionId: rec!.providerSessionId,
      type: 'completed',
      billableSeconds: 60,
      at: '2026-06-28T10:00:00.000Z',
    });
    expect(applied.status).toBe(200);
    expect(applied.body.applied).toBe(true);
  });

  it('reports applied=false for an unknown session', async () => {
    const res = await request(createApp()).post('/telephony/webhook').send({
      providerSessionId: 'unknown-provider-id',
      type: 'completed',
      at: '2026-06-28T10:00:00.000Z',
    });
    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(false);
  });

  it('returns 400 on a malformed payload', async () => {
    const res = await request(createApp())
      .post('/telephony/webhook')
      .send({ type: 'completed' }); // missing providerSessionId
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- telephony/webhookRoutes`
Expected: FAIL — `POST /telephony/webhook` returns 404.

- [ ] **Step 3: Write the webhook router**

`backend/src/telephony/webhookRoutes.ts`:
```ts
import { Router } from 'express';
import type { TelephonyAdapter } from './types.js';
import type { CallService } from '../calls/callService.js';

export function createWebhookRouter(adapter: TelephonyAdapter, service: CallService): Router {
  const router = Router();

  router.post('/telephony/webhook', (req, res) => {
    let event;
    try {
      event = adapter.parseWebhook(req.body);
    } catch {
      res.status(400).json({ error: 'invalid webhook payload' });
      return;
    }
    const updated = service.handleEvent(event);
    res.status(200).json({ applied: updated !== undefined });
  });

  return router;
}
```

- [ ] **Step 4: Wire it into the app (share one adapter instance)**

Replace the contents of `backend/src/app.ts` with:
```ts
import express, { type Express } from 'express';
import { CallService } from './calls/callService.js';
import { MockTelephonyDriver } from './telephony/mockDriver.js';
import { createCallRouter } from './calls/callRoutes.js';
import { createWebhookRouter } from './telephony/webhookRoutes.js';
import type { TelephonyAdapter } from './telephony/types.js';

export function createApp(
  adapter: TelephonyAdapter = new MockTelephonyDriver(),
  service: CallService = new CallService(adapter),
): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use(createCallRouter(service));
  app.use(createWebhookRouter(adapter, service));

  app.locals.callService = service;

  return app;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npm test -- telephony/webhookRoutes`
Expected: PASS (2 tests).

- [ ] **Step 6: Run the full suite + typecheck**

Run: `cd backend && npm test && npm run build`
Expected: All tests PASS; `tsc` build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add backend/src/telephony/webhookRoutes.ts backend/src/app.ts backend/test/telephony/webhookRoutes.test.ts
git commit -m "feat(telephony): add webhook endpoint to normalize and apply call events"
```

---

## What Plan 01 delivers
- A clean, standard monorepo: `backend/` (npm), `android-sdk/` (Gradle), `ios-sdk/` (SPM) — each installs/builds on its own.
- A runnable backend where you can `POST /calls` to start a (mock) two-way masked call and `POST /telephony/webhook` to drive its lifecycle — fully tested, **no operator credentials required**.
- The `TelephonyAdapter` seam so the real `OperatorDirectDriver_TataDIGO` drops in next with zero changes to `CallService`/routes.

## Next plans (one per subsystem, in order)
- **Plan 02 — Backend: persistence + auth + creator/fan profiles** (Postgres, replace in-memory stores).
- **Plan 03 — Backend: scheduling + bookings**.
- **Plan 04 — Backend: wallet + billing (holds/capture/release) + payments (Razorpay)**.
- **Plan 05 — Telephony: `OperatorDirectDriver_TataDIGO`** (once DIGO sandbox credentials exist).
- **Plan 06 — Android SDK** features; **Plan 07 — iOS SDK** features.

## Self-Review
- **Spec coverage (Plan 01 scope):** monorepo/packaging (§19) → Tasks 1–3 ✅; `TelephonyAdapter` swappable seam (§4.2) → Tasks 4,7,8 ✅; two-way masked-call start + event lifecycle (§5.3, §4.3) → Tasks 5–8 ✅; "no VoIP/media" constraint honored (SDK stubs + mock only) ✅. Wallet/scheduling/persistence are intentionally deferred to Plans 02–04 (noted above), not gaps.
- **Placeholder scan:** no TBD/TODO; every code step shows complete code; commands have expected output. ✅
- **Type consistency:** `MaskedCallSession`, `NormalizedCallEvent`, `CallStatus`, `StartMaskedCallParams`, `TelephonyAdapter` defined once in Task 4 and referenced verbatim in Tasks 5–8; `createApp` signature evolves coherently (Task 1 → 7 → 8, final form is `createApp(adapter?, service?)`); `CallService` methods (`startCall`, `handleEvent`, `getBySessionId`) consistent across Tasks 6–8. ✅
