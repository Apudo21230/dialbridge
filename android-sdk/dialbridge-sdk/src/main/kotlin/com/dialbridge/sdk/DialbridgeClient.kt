package com.dialbridge.sdk

/**
 * Thin client to the Dialbridge backend. No VoIP/media — the actual call is a
 * normal PSTN call placed by the telecom operator. Fleshed out in the
 * Android SDK plan.
 */
class DialbridgeClient(private val baseUrl: String) {
    fun version(): String = "0.1.0"
}
