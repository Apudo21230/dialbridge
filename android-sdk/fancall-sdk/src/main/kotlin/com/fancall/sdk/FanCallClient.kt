package com.fancall.sdk

/**
 * Thin client to the FanCall backend. No VoIP/media — the actual call is a
 * normal PSTN call placed by the telecom operator. Fleshed out in the
 * Android SDK plan.
 */
class FanCallClient(private val baseUrl: String) {
    fun version(): String = "0.1.0"
}
