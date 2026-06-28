package com.dialbridge.sdk

import kotlinx.serialization.Serializable

/** A masked-call session as returned by the Dialbridge API. */
@Serializable
data class CallSession(
    val sessionId: String,
    val status: String,
    val virtualNumber: String? = null,
)

/** Thrown when the API returns a non-2xx response. */
class DialbridgeException(val status: Int, message: String) : Exception(message)
