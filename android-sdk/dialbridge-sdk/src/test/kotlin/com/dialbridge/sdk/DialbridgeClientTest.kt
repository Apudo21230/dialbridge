package com.dialbridge.sdk

import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

private class FakeTransport(private val status: Int, private val payload: String) : HttpTransport {
    var lastMethod: String? = null
    var lastUrl: String? = null
    var lastToken: String? = null

    override suspend fun send(method: String, url: String, token: String, body: String?): HttpResponse {
        lastMethod = method
        lastUrl = url
        lastToken = token
        return HttpResponse(status, payload)
    }
}

class DialbridgeClientTest {
    @Test
    fun createCallParsesSessionAndSendsAuth() = runTest {
        val fake = FakeTransport(201, """{"sessionId":"s1","status":"ringing","virtualNumber":"+910000000000"}""")
        val client = DialbridgeClient("https://api.example.com/", "tok", fake)

        val session = client.createCall("+919800000001", "+919800000002")

        assertEquals("s1", session.sessionId)
        assertEquals("ringing", session.status)
        assertEquals("+910000000000", session.virtualNumber)
        assertEquals("POST", fake.lastMethod)
        assertEquals("https://api.example.com/calls", fake.lastUrl)
        assertEquals("tok", fake.lastToken)
    }

    @Test
    fun non2xxThrowsDialbridgeException() = runTest {
        val fake = FakeTransport(403, """{"error":"integrator suspended"}""")
        val client = DialbridgeClient("https://api.example.com", "tok", fake)

        val ex = assertFailsWith<DialbridgeException> {
            client.createCall("+919800000001", "+919800000002")
        }
        assertEquals(403, ex.status)
        assertEquals("integrator suspended", ex.message)
    }
}
