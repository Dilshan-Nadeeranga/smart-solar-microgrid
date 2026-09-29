package com.ead.solargrid.qr

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class QrValidityTest {

    @Test
    fun `counts down from the server lifetime, ignoring the device wall clock`() {
        // Server: issued 09:00, expires 09:18:42. The device clock is a year off; it must not matter.
        val validity = QrValidity.from(
            issuedAtUtc = "2026-09-29T09:00:00Z",
            expiresAtUtc = "2026-09-29T09:18:42Z",
            receivedAtElapsedMs = 5_000L,
            deviceNowMs = 0L
        )!!

        assertEquals("Valid for 18:42", "Valid for " + QrValidity.format(validity.remainingMs(5_000L)))
        assertEquals("18:41", QrValidity.format(validity.remainingMs(6_000L)))
        assertFalse(validity.isExpired(5_000L + 1_121_999L))
        assertTrue(validity.isExpired(5_000L + 1_122_000L))
        assertEquals(0L, validity.remainingMs(10_000_000L))
    }

    @Test
    fun `formats long and short durations`() {
        assertEquals("00:00", QrValidity.format(0))
        assertEquals("00:01", QrValidity.format(1)) // rounds up: never shows 00:00 while still valid
        assertEquals("59:59", QrValidity.format(3_599_000))
        assertEquals("1:00:00", QrValidity.format(3_600_000))
        assertEquals("2:05:09", QrValidity.format((2 * 3600 + 5 * 60 + 9) * 1000L))
        assertEquals("3d 04h", QrValidity.format((3 * 86_400 + 4 * 3600) * 1000L))
    }

    @Test
    fun `parses UTC timestamps with and without a zone`() {
        assertEquals(
            QrValidity.parseUtc("2026-09-29T10:00:00Z"),
            QrValidity.parseUtc("2026-09-29T10:00:00")
        )
        assertEquals(
            QrValidity.parseUtc("2026-09-29T10:00:00.1234567Z")?.epochSecond,
            QrValidity.parseUtc("2026-09-29T10:00:00Z")?.epochSecond
        )
        assertNull(QrValidity.parseUtc("not a date"))
        assertNull(QrValidity.from(null, "garbage", 0L, 0L))
    }
}
