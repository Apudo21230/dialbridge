package com.dialbridge.sdk

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Thin client to the Dialbridge backend. Authenticates with a short-lived
 * **client token** minted by the integrator's backend — no API secret in the app.
 * No VoIP/media: the actual call is a normal PSTN call the operator places.
 */
class DialbridgeClient(
    baseUrl: String,
    private val clientToken: String,
    private val transport: HttpTransport = OkHttpTransport(),
) {
    private val baseUrl: String = baseUrl.trimEnd('/')
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    @Serializable
    private data class CreateCallRequest(
        val creatorNumber: String,
        val fanNumber: String,
        val bookingId: String? = null,
    )

    @Serializable
    private data class ErrorResponse(val error: String? = null)

    /** Start a masked call between two numbers. Neither party sees the other's real number. */
    suspend fun createCall(creatorNumber: String, fanNumber: String, bookingId: String? = null): CallSession {
        val body = json.encodeToString(
            CreateCallRequest.serializer(),
            CreateCallRequest(creatorNumber, fanNumber, bookingId),
        )
        return request("POST", "/calls", body)
    }

    /** Fetch the latest status of a call. */
    suspend fun getCall(sessionId: String): CallSession = request("GET", "/calls/$sessionId", null)

    private suspend fun request(method: String, path: String, body: String?): CallSession {
        val response = transport.send(method, baseUrl + path, clientToken, body)
        if (response.status !in 200..299) {
            val message = runCatching {
                json.decodeFromString(ErrorResponse.serializer(), response.body).error
            }.getOrNull() ?: "HTTP ${response.status}"
            throw DialbridgeException(response.status, message)
        }
        return json.decodeFromString(CallSession.serializer(), response.body)
    }
}
