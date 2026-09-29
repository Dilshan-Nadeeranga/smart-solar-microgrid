package com.ead.solargrid.qr

import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.util.Locale

/**
 * Countdown to a QR code's server-provided expiry that does not trust the device's wall clock.
 *
 * The server stamps both issuedAtUtc and expiresAtUtc, so their difference is the true lifetime.
 * That lifetime is counted down on the monotonic clock (elapsedRealtime) from the moment the
 * response arrived, so a phone set to the wrong time or zone still shows the right countdown.
 */
class QrValidity(
    private val lifetimeMs: Long,
    private val receivedAtElapsedMs: Long
) {
    fun remainingMs(nowElapsedMs: Long): Long =
        (lifetimeMs - (nowElapsedMs - receivedAtElapsedMs)).coerceAtLeast(0L)

    fun isExpired(nowElapsedMs: Long): Boolean = remainingMs(nowElapsedMs) == 0L

    companion object {
        /**
         * @param deviceNowMs only used when the server omitted issuedAtUtc.
         * @return null if expiresAtUtc cannot be parsed.
         */
        fun from(
            issuedAtUtc: String?,
            expiresAtUtc: String?,
            receivedAtElapsedMs: Long,
            deviceNowMs: Long
        ): QrValidity? {
            val expires = parseUtc(expiresAtUtc) ?: return null
            val issuedMs = parseUtc(issuedAtUtc)?.toEpochMilli() ?: deviceNowMs
            return QrValidity(expires.toEpochMilli() - issuedMs, receivedAtElapsedMs)
        }

        /** Accepts `2026-09-29T10:00:00Z` and the zone-less `2026-09-29T10:00:00` (read as UTC). */
        fun parseUtc(value: String?): Instant? {
            if (value.isNullOrBlank()) return null
            return try {
                Instant.parse(value)
            } catch (_: Exception) {
                try {
                    LocalDateTime.parse(value).toInstant(ZoneOffset.UTC)
                } catch (_: Exception) {
                    null
                }
            }
        }

        /** `18:42` under an hour, `2:05:09` under a day, `3d 04h` beyond. Rounds up so 0 means expired. */
        fun format(remainingMs: Long): String {
            val totalSeconds = (remainingMs + 999) / 1000
            val days = totalSeconds / 86_400
            val hours = (totalSeconds % 86_400) / 3_600
            val minutes = (totalSeconds % 3_600) / 60
            val seconds = totalSeconds % 60
            return when {
                days > 0 -> String.format(Locale.US, "%dd %02dh", days, hours)
                hours > 0 -> String.format(Locale.US, "%d:%02d:%02d", hours, minutes, seconds)
                else -> String.format(Locale.US, "%02d:%02d", minutes, seconds)
            }
        }
    }
}
