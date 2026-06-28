◊# PRD — Dialbridge: Paid Masked-Call Platform (Fan ↔ Creator)

| Field | Value |
|---|---|
| **Document** | Product Requirements Document (v1 — MVP) |
| **Date** | 2026-06-28 |
| **Status** | Draft for review |
| **Owner** | (Founder) |
| **Working name** | "Dialbridge" (placeholder — rename freely) |
| **Build team** | In-house dev team (Node.js backend, TypeScript) |
| **Primary market** | India first → Global (phase 4) |

> **One-line pitch:** A "Cameo for phone calls" — fans pay to have a real, private phone call with a creator. The creator receives a **normal cellular call** (no app open, no internet needed). Neither party ever sees the other's real number, because the call is bridged through a **telecom operator's own number-masking API**.

> ### ⚠️ MODEL CORRECTION (2026-06-28) — supersedes the B2C framing below
> Dialbridge is a **B2B masked-calling SDK / API**, not its own consumer app. **Integrators** (other businesses/apps) embed our SDK / call our API to add private masked calling to *their* product. Therefore:
> - **Integrators authenticate with an API key** (server-side). The mobile SDK uses a short-lived client token minted by the integrator's backend — never a raw secret in the app.
> - **The integrator supplies the numbers** to bridge (and is responsible for callee consent / their own end-user accounts, wallet, booking UI).
> - **There is NO Dialbridge end-user (fan/creator) login** — no OTP/email signup for end-users. Auth = integrator API key + abuse/consent controls.
> - We provide: the masked-calling **API** (`POST /calls` etc.), **client SDKs** (Android/iOS), webhooks, and recording.
> - Sections below describing fan signup, wallet, booking UI, ratings (§3–§9) are **the integrator's responsibility** in this model; treat them as optional API capabilities we may expose, not screens we build. Auth specifics in those sections are **superseded by this note**.

---

## 1. Background & the core insight

### 1.1 The problem we are solving
Existing creator-call tools use **VoIP (e.g. Agora)**. VoIP requires the recipient to keep the **app open and internet on** during the call. That is fragile and a poor experience for a creator who just wants their phone to ring like a normal call.

### 1.2 The mechanism (how Swiggy/Uber masked calls actually work)
We use **PSTN call masking** (a.k.a. number masking / anonymize), not VoIP:

- A pool of **virtual numbers** sits in the middle.
- When a fan requests a call, the platform asks the **operator's masking API** to bridge two real numbers via a virtual number.
- The operator **rings the creator's normal phone**; the creator sees only the virtual number. They answer like any other call — **no app, no internet required.** ✅
- The operator then rings the fan (fan also sees only the virtual number) and **bridges** the two legs.
- Neither party sees the other's real number → **two-way masking.**

This is exactly what Swiggy/Uber/Ola use for delivery/rider calls — except our product adds **scheduling, paid billing, recording, and ratings** on top.

### 1.3 The hard reality this design is built around (verified)
> **You cannot legally build the "phone-ringing" layer yourself.** In India, only a **DoT-licensed telecom operator** (or a UL-VNO) may originate/terminate PSTN calls and own phone numbers. Running your own softswitch on a raw SIP trunk to **bridge two unrelated consumers** is a **regulated telecom service** (it hits toll-bypass rules and requires a UL/UL-VNO licence). So the licensed telephony layer is **always** rented.

**The strategic decision:** rent only the licensed "dial-tone + masking" layer **directly from a telecom operator** (not from an independent aggregator/reseller like Exotel/Twilio), and **own everything else.**

| Layer | Who owns it |
|---|---|
| Apps, scheduling, wallet/billing, session/mapping logic, recording handling, ratings, matching | **100% us (our IP)** |
| Phone numbers, PSTN bridging, the masked-call API | **Telecom operator's own API** (Tata Communications DIGO) — operator-direct, **not** an aggregator |

---

## 2. Goals & Non-Goals

### 2.1 Goals (MVP)
1. A fan can discover a creator, **book a paid time slot**, and have a **masked phone call** with them at that time.
2. Creator receives a **normal cellular call** — no app/internet needed during the call.
3. **Two-way number masking** — neither party sees the other's real number.
4. **Prepaid wallet** + **per-minute billing**, with creator earnings & payout.
5. **Call recording** (with consent announcement) for disputes/quality.
6. **Ratings/reviews** after the call.
7. Telephony via a **direct telecom-operator masking API** (Tata Communications DIGO primary), behind a **swappable `TelephonyAdapter`**.

### 2.2 Non-Goals (explicitly out of scope for MVP)
- ❌ Building our own telecom/softswitch/SIP infrastructure (illegal/unrealistic without a licence).
- ❌ Becoming a licensed telecom operator (UL-VNO).
- ❌ Video calls (voice only for MVP).
- ❌ Instant/"call me now" calls (MVP = **scheduled slots** only).
- ❌ Global markets at launch (India first).
- ❌ Group/conference fan calls (1:1 only for MVP).

---

## 3. Personas
1. **Fan** — wants a private paid call with their favourite creator. Uses the app/web to discover, book, pay, join, and rate. Tech-comfortable, mobile-first.
2. **Creator** — monetises 1:1 time. Uses the app/web only for **setup** (profile, rate, availability, payouts) and to see earnings. **During the actual call, uses nothing but their normal phone.**
3. **Admin/Ops** — handles KYC verification, disputes/refunds, fraud, number-pool/session health, recording-access controls, payouts.

---

## 4. Telephony decision (the heart of the product)

### 4.1 Provider strategy
- **Primary (MVP):** **Tata Communications DIGO** — operator-owned (Tata Communications is a Tier-1 licensed carrier with NLD/ILD authorisations). DIGO offers a **direct REST masking API** ("Anonymize" / Virtual Calling Number), modelled as **"contexts" (masking sessions)**, with a **developer portal + sandbox + free test credits**. Best-documented operator-direct masking API of the options reviewed.
- **Secondary / alternate driver:** **Airtel IQ Voice** — also operator-owned ("network-embedded CPaaS"); REST API (`initiateCall → vmSessionId → webhooks`), official GitHub samples; claims both legs in-network (avoids aggregator double-leg billing). Onboarding is fully sales-led (no sandbox).
- **Explicitly avoided:** Exotel, Twilio, Plivo, Knowlarity/Gupshup, Ozonetel, MSG91, Servetel/Acefone — these are **independent aggregators/VNOs** that ride on operators. (Note: a VNO licence ≠ owning the network.)

### 4.2 Abstraction: `TelephonyAdapter`
All telephony goes through a single interface so the provider is swappable:

```
interface TelephonyAdapter {
  startMaskedCall(params): MaskedCallSession      // create masking session, ring both legs, bridge
  endCall(sessionId): void
  getCallStatus(sessionId): CallStatus
  // webhook normaliser: provider events → our canonical events
  parseWebhook(payload): NormalizedCallEvent
}
```

- `OperatorDirectDriver_TataDIGO` — implements the above against DIGO's "contexts"/Anonymize API.
- `OperatorDirectDriver_AirtelIQ` — alternate implementation (`initiateCall`/callflow APIs).
- Region router (phase 4) picks the driver by creator/fan region.

### 4.3 What the operator handles vs what we handle
| Concern | Operator (DIGO) | Us |
|---|---|---|
| Virtual/proxy numbers (DIDs) | Provisions & owns | Reference by ID |
| PSTN bridging of the two legs | Yes (their licensed network) | Trigger via API |
| Masking session / "context" lifecycle | API to create/destroy | Orchestrate per booking |
| In-call recording | Provides (capture/announce) | Pull & store on our storage; consent UX |
| Webhooks (ringing/answered/ended/failed) | Emits | Receive, normalise, reconcile |
| Number-pool sizing/collision | **DECIDED — per-session pool model.** A free virtual number is allocated from a rented pool per active session and released on call end. Hard rule: a creator's two *concurrent* calls never share a number (Redis lock). Pool size = peak concurrent calls. | Manage allocation/mapping/release |

> **Masking-number model (DECIDED):** per-session pool number — receiver sees "a Dialbridge virtual number" (may repeat across non-overlapping calls, always distinct for a creator's concurrent calls). Real numbers are never shown to either party.
>
> **Open item (confirm with DIGO before build):** exact masking-session ("context") API — whether DIGO auto-allocates the proxy or draws from a pool we rent, per-minute vs per-leg billing, and per-session concurrency limits. See §15.

---

## 5. Core user flows

### 5.1 Creator onboarding
1. Sign up → KYC (PAN, ID, optional GST), set **display profile**, **rate per minute**, **languages**, **slot durations** (e.g. 5/10/15 min).
2. Enter **payout details** (bank/UPI) — verified for payouts.
3. Store the creator's **real phone number encrypted** (used only to ring them; never shown to fans).
4. Set **availability** (recurring weekly slots + ad-hoc).

### 5.2 Fan booking & payment
1. Discover creator → see rate, languages, available slots, rating.
2. Select a slot → system computes **price = slot_minutes × rate** → fan **tops up wallet** (Razorpay/UPI) if needed.
3. On booking confirm, place a **wallet HOLD** = price (authorisation, not yet captured).
4. Both parties get a **confirmation + reminders** (see §8).

### 5.3 The masked call (happy path)
```
At slot time, fan taps "Join Call" (or auto-trigger window opens):
1. Backend re-checks wallet HOLD is valid.
2. Backend → TelephonyAdapter.startMaskedCall(fan#, creator#, {record:true, announce:true})
3. DIGO creates a masking session → allocates virtual number V.
4. DIGO rings CREATOR first → creator's phone shows V (not fan#) → creator answers (normal call). ✅
5. DIGO rings FAN → fan's phone shows V (not creator#).
6. DIGO bridges the two legs → consent announcement plays → conversation starts.
7. Meter starts at "answered" event; runs per-minute (or per-second) against the HOLD.
8. On hangup → DIGO webhook (duration, recording URL, status).
9. Backend: actual_cost = billable_duration × rate
      → capture actual_cost from HOLD, release remainder
      → creator_earning = actual_cost × (1 − platform_fee) → credit creator balance
      → store recording → request fan rating.
```

### 5.4 Post-call
- Fan rates (1–5) + optional review.
- Receipt to fan; earnings entry to creator.
- Recording retained per policy (§7); accessible to ops for disputes.

---

## 6. System architecture

### 6.1 Components
- **Fan app/web** — discovery, booking, wallet/top-up, "Join Call", rating.
- **Creator app/web** — profile, rate, availability, earnings, payout. (Setup only; not needed during the call.)
- **Backend API** (Node.js + TypeScript) — auth, profiles, scheduling, wallet, call orchestration.
- **`TelephonyAdapter` + `OperatorDirectDriver_TataDIGO`** — masked-call integration.
- **Session/Mapping Manager** — owns the `CallSession` ↔ booking ↔ (fan, creator, virtual number) mapping & lifecycle; idempotent against provider events.
- **Scheduling Service** — slots, availability, bookings, reminder triggers.
- **Wallet/Billing Service** — balance, holds, metering, capture, refunds, creator earnings, payouts.
- **Payments integration** — Razorpay/UPI (India); Stripe later (global).
- **Webhook Handler** — receives & normalises DIGO call events; drives the billing state machine; idempotent on provider session/call id.
- **Recording Service** — pulls recording from provider, stores in our object storage, enforces consent + retention + access control.
- **Notification Service** — SMS/WhatsApp/push reminders & receipts (DLT-registered templates).
- **Admin/Ops Dashboard** — KYC review, disputes/refunds, fraud, session health, recording access.
- **Datastores** — PostgreSQL (core), Redis (active-call state + locks + idempotency keys), Object storage/S3 (recordings).

### 6.2 Data flow (text)
```
Fan app ──book/pay──> Backend ──hold──> Wallet
Fan app ──join──────> Backend ──startMaskedCall──> TelephonyAdapter ──> Tata DIGO
                                                                          │ rings creator (PSTN)
                                                                          │ rings fan (PSTN)
                                                                          │ bridges + records
Tata DIGO ──webhooks (ringing/answered/ended)──> Webhook Handler ──> Billing state machine
Billing ──capture/release──> Wallet ; ──credit──> Creator earnings ; ──pull──> Recording store
Backend ──rating request / receipts / reminders──> Notification Service
```

---

## 7. Data model (key entities)

- **User** `{id, role: fan|creator|admin, name, email, phone_encrypted, kyc_status, created_at}`
- **CreatorProfile** `{user_id, display_name, bio, languages[], rate_per_min, slot_durations[], payout_method, payout_kyc_status, is_active}`
- **AvailabilitySlot** `{id, creator_id, start_at, end_at, status: open|booked|blocked}`
- **Booking** `{id, fan_id, creator_id, slot_id, minutes, price_quote, status: pending|confirmed|completed|cancelled|no_show, hold_id, created_at}`
- **CallSession** `{id, booking_id, provider, provider_session_id, virtual_number, status: created|ringing|in_progress|completed|failed, started_at, answered_at, ended_at, billable_seconds, recording_url, cost}`
- **WalletAccount** `{user_id, balance, currency}`
- **WalletTransaction** `{id, wallet_id, type: credit|debit|hold|capture|release|refund, amount, ref_booking_id, ref_session_id, status, created_at}`
- **CreatorEarning** `{id, creator_id, session_id, gross, platform_fee, net, payout_id, status}`
- **Payout** `{id, creator_id, amount, method, status, processed_at}`
- **Rating** `{id, booking_id, fan_id, creator_id, stars, review, created_at}`
- **NumberPoolEntry** *(only if DIGO requires us to manage a VCN pool — TBD)* `{virtual_number, provider, region, status: free|in_use, current_session_id}`
- **AuditLog / ConsentRecord** `{id, session_id, party, consent_type, captured_at, method}`

---

## 8. Billing & wallet (prepaid model)

- **Top-up:** fan adds funds via Razorpay/UPI → `WalletAccount.balance`.
- **Hold:** at booking, `hold = slot_minutes × rate` (a `hold` transaction; funds reserved, not captured).
- **Meter:** from provider "answered" to "ended"; per-minute (configurable per-second) against the hold.
- **Capture/Release:** on call end, `actual = billable_seconds × rate` → `capture(actual)`, `release(hold − actual)`.
- **Creator earning:** `net = actual × (1 − platform_fee)` → credited to creator balance.
- **Payouts:** scheduled (e.g. weekly) **after a refund/dispute window**; requires creator payout-KYC.
- **Refunds:** creator no-show / failed connect → **full release of hold** (no charge). Disputes → ops review.
- **GST/taxes:** telecom + platform services attract GST (India) — invoicing must be GST-compliant. (Finance/CA input needed.)

---

## 9. Recording & consent
- **Consent announcement** plays at call start ("This call is being recorded…") — satisfies India DPDP + (later) GDPR/US two-party-consent states.
- Recording **pulled to our own object storage** (encrypted at rest); access restricted to ops + the involved parties per policy.
- **Retention policy** (e.g. 90 days default) + deletion on request (DPDP data-subject rights).
- Consent + record metadata stored in `ConsentRecord`/`AuditLog`.

---

## 10. Notifications & reminders
- **Channels:** push (in-app), SMS, WhatsApp.
- **Triggers:** booking confirmation, T-24h reminder, T-15min reminder, "join now" nudge, receipt, rating request.
- **India compliance:** SMS/WhatsApp require **DLT-registered headers & templates**; WhatsApp via an approved BSP.
- *(Note: reminders were not originally selected but are strongly recommended — scheduled calls fail silently without them. Flagged for founder decision.)*

---

## 11. Failure handling & edge cases
| Case | Handling |
|---|---|
| Creator doesn't answer / busy | Mark `no_show`/missed; **release hold** (no charge); notify both; offer reschedule. |
| Fan doesn't answer | Same; short retry window; then release hold. |
| Call drops mid-way | Bill only `billable_seconds` actually connected; allow quick reconnect within slot using the same session if possible. |
| Virtual-number/session exhaustion | Queue + auto-provision/raise concurrency; ops alert. (Depends on §4.3 pool model.) |
| Provider webhook missing/late | **Reconciliation job** polls provider call status; all updates **idempotent** keyed on `provider_session_id`. |
| Duplicate webhook | Idempotency key (Redis) ensures exactly-once billing transitions. |
| Wallet insufficient at start | Block call start; prompt top-up; auto-cancel if not topped up by slot end. |
| Race: same number to two sessions | Redis lock on session/number allocation; release on end + safety timeout. |
| Recording fetch fails | Retry queue; call still billed; flag for ops. |

---

## 12. Non-functional requirements
- **Reliability:** call-orchestration path must be idempotent & reconcilable; no double-charge, no lost charge.
- **Latency:** "Join Call" → both phones ringing within a few seconds.
- **Scale (MVP target):** design for low hundreds of concurrent calls; horizontal-scalable stateless API + Redis for call state.
- **Security:** real phone numbers encrypted at rest; secrets in a vault; least-privilege access to recordings/PII.
- **Privacy:** DPDP Act 2023 compliance — purpose limitation, consent, retention, data-subject rights.
- **Observability:** structured logs, call-session traces, billing audit trail, provider-webhook dead-letter queue.

---

## 13. Compliance & legal checklist (one-by-one, India MVP)
1. ✅ **Company incorporation** (Pvt Ltd) — for KYC/agreements/payouts.
2. ✅ **GST registration** — telecom/platform services.
3. ✅ **Operator account + KYC** with **Tata Communications DIGO** (CoI, PAN, GST, address, director ID).
4. ✅ **Virtual/masking numbers** provisioned via DIGO (region-bound; KYC-gated).
5. ✅ **DLT registration** (Principal Entity + headers/templates) — for SMS/WhatsApp/OTP/reminders (~₹5,900 order-of-magnitude).
6. ✅ **Recording consent** announcement + retention policy (DPDP / future GDPR / US two-party).
7. ✅ **Payment-gateway KYC** (Razorpay) for wallet + payouts; never store card data (PCI handled by gateway).
8. ❌ **No DoT telecom licence needed** — we are an operator's customer, not a carrier.
9. ❌ **No OSP registration needed** — abolished in 2020/2021.
10. ⚠️ **Telecom counsel review (one-time):** confirm our specific fan-initiated masked-connect flow's status under TCCCPR-2018/DLT, recording-consent specifics, and CLI rules **before launch.** *(Verified caveat: this area is genuinely fact-specific.)*

---

## 14. Build phases / roadmap

**Phase 0 — Foundations**
- Incorporate; GST; open **Tata DIGO** account + KYC; get sandbox + test credits.
- Stand up backend skeleton (Node.js + TypeScript), PostgreSQL, Redis, object storage.
- Define `TelephonyAdapter` interface.

**Phase 1 — Core masked call (no money)**
- Creator & fan profiles; availability/slot booking.
- `OperatorDirectDriver_TataDIGO`: click-to-call + two-way masking + webhook handling + basic recording.
- **Goal: prove a fan can have a masked call with a creator at a booked time.** (Use DIGO sandbox.)

**Phase 2 — Wallet & billing**
- Razorpay integration; wallet top-up; holds; per-minute metering; capture/release; creator earnings + payout.

**Phase 3 — Trust & polish**
- Ratings/reviews; DLT reminders (SMS/WhatsApp); disputes/refunds; admin dashboard; recording consent + retention; reconciliation jobs.

**Phase 4 — Scale & Global**
- Add `OperatorDirectDriver_AirtelIQ` and/or region routing; global provider for non-India; number-pool/concurrency autoscale; fraud controls; observability hardening.

---

## 15. Open questions (confirm before/at build)
1. **Tata DIGO masking model:** exact "contexts"/Anonymize session API; does it auto-allocate the proxy number per session or do we rent & manage a VCN pool? Per-session concurrency limits?
2. **DIGO pricing:** per-minute vs per-leg billing; number rental; minimum commitment for a startup (no public rate card — get a written quote).
3. **Startup onboarding terms:** any minimum spend / committed volume for masked voice on DIGO.
4. **Production credentials timeline:** sandbox is open; production token needs a form/email + KYC — confirm lead time.
5. **TCCCPR/DLT applicability** to our connect flow — telecom counsel (§13.10).
6. **Recording legal specifics** for India consumer calls (+ later global).
7. **Reminders inclusion** (founder decision — recommended in).

---

## 16. Risks & mitigations
| Risk | Mitigation |
|---|---|
| Operator onboarding is slow/sales-led (no instant signup) | Start DIGO KYC + sandbox in Phase 0; keep adapter swappable (Airtel IQ fallback). |
| Pricing/minimums unfavourable for early stage | Get written quotes from **both** Tata DIGO and Airtel IQ before committing; adapter lets you switch. |
| Regulatory misclassification (DLT/TCCCPR) | One-time telecom-counsel review before launch; treat DLT as required for messaging. |
| Provider lock-in | `TelephonyAdapter` isolates provider; canonical webhook/event model. |
| Billing disputes / double-charge | Idempotent state machine + reconciliation + audit trail. |
| Abuse/harassment on calls | Recording + reporting + block; ops review. |
| Vi/secondary provider continuity risk | Not chosen as primary; Tata is Tier-1 + stable. |

---

## 17. Success metrics (MVP)
- **Connect rate:** % booked calls that successfully connect (target > 90%).
- **Billing accuracy:** 0 double-charges; < 0.5% disputes.
- **Creator earnings paid out** on schedule.
- **Fan rating** average + repeat-booking rate.
- **Time-to-connect** after "Join Call".

---

## 18. Testing strategy
- **Unit:** billing math (hold/capture/release), session/number locking, webhook normalisation.
- **Integration:** DIGO **sandbox** masked calls; webhook idempotency; reconciliation.
- **E2E:** book → pay → masked call → bill → payout → rate (with test numbers).
- **Load:** concurrent sessions, pool/concurrency limits.
- **Chaos:** dropped/duplicate webhooks, provider downtime → reconciliation recovers state.

---

## 19. Deliverable structure & packaging
Keep the structure **simple and standard (not congested)** — a monorepo with three independently-installable subsystems:

```
dialbridge/
  backend/      Node.js + TypeScript; deps via npm        (the core IP + orchestration)
  android-sdk/  Android library; consumed via Gradle      (thin client SDK)
  ios-sdk/      Swift package; consumed via SPM            (thin client SDK)
  docs/
```

- **Backend** — Node.js + TypeScript, third-party packages via **npm**. Houses all business logic, the `TelephonyAdapter`, billing, scheduling, webhooks.
- **Android SDK** — standard Gradle library module (Kotlin); host apps add it as a **Gradle** dependency.
- **iOS SDK** — standard Swift Package (`Package.swift`); host apps add it via **SPM**.
- The mobile SDKs are **thin**: REST client to the backend + booking/"Join Call" hooks + optional native CallKit/ConnectionService polish. **No VoIP/media stack** — the actual call is a normal PSTN call placed by the operator, so the SDKs never carry audio. This keeps them small and uncongested.
- Each subsystem builds/installs **on its own** (`npm install`, `gradle build`, `swift build`) and gets its **own implementation plan**.

---

### Appendix A — Glossary
- **PSTN** — the normal public phone (cellular/landline) network.
- **Masking / Anonymize / VCN** — bridging two real numbers via a virtual number so neither party sees the other's.
- **CPaaS** — Communications-Platform-as-a-Service (voice/SMS APIs).
- **Operator-direct vs aggregator** — operator-direct = the licensed carrier's own API (Tata DIGO, Airtel IQ); aggregator = a reseller (Exotel/Twilio) riding on operators.
- **DLT** — TRAI's Distributed-Ledger registration for commercial SMS/voice headers & templates.
- **UL / UL-VNO** — DoT telecom licences; required to *be* the carrier (we are not pursuing this).
