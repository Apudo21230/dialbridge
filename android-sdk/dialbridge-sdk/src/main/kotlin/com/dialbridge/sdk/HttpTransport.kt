package com.dialbridge.sdk

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

data class HttpResponse(val status: Int, val body: String)

/** Pluggable HTTP layer so the client can be unit-tested without a network. */
interface HttpTransport {
    suspend fun send(method: String, url: String, token: String, body: String?): HttpResponse
}

class OkHttpTransport(private val client: OkHttpClient = defaultClient()) : HttpTransport {
    private val jsonMedia = "application/json".toMediaType()

    companion object {
        /** Do not auto-follow redirects: the bearer token must never be replayed to a redirect target. */
        private fun defaultClient(): OkHttpClient =
            OkHttpClient.Builder()
                .followRedirects(false)
                .followSslRedirects(false)
                .build()
    }

    override suspend fun send(method: String, url: String, token: String, body: String?): HttpResponse =
        withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url(url)
                .header("Authorization", "Bearer $token")
                .header("Content-Type", "application/json")
                .method(method, body?.toRequestBody(jsonMedia))
                .build()
            client.newCall(request).execute().use { response ->
                HttpResponse(response.code, response.body?.string() ?: "")
            }
        }
}
