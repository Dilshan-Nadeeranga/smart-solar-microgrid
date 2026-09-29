package com.ead.solargrid.qr

import java.util.Locale

/**
 * Why a QR call failed, in terms the screens can show a friendly line for.
 * The API only sends `{ "message" }`, so failures are told apart by status and message text.
 */
enum class QrFailure {
    /** Damaged, tampered, or no longer matching the booking: the prosumer should refresh their QR. */
    INVALID,
    EXPIRED,
    ALREADY_COMPLETED,
    /** Cancelled, rejected, not approved, or not found. */
    NO_LONGER_VALID,
    /** Scanned before the slot's scan window opens. The server message says when it opens. */
    NOT_YET_VALID,
    NETWORK,
    /** 403: signed in with the wrong role, or not the reservation's owner. */
    FORBIDDEN,
    SESSION_EXPIRED,
    /** Anything else. Show the server message if there is one. */
    OTHER;

    companion object {

        /** Classifies a verify-qr or complete failure. */
        fun from(result: QrResult<*>): QrFailure = when (result) {
            is QrResult.Success -> OTHER
            QrResult.NetworkError -> NETWORK
            is QrResult.HttpError -> fromHttp(result.code, result.serverMessage)
        }

        private fun fromHttp(code: Int, serverMessage: String?): QrFailure {
            if (code == 401) return SESSION_EXPIRED
            if (code == 403) return FORBIDDEN

            val message = serverMessage.orEmpty().lowercase(Locale.ROOT)
            return when {
                "already completed" in message -> ALREADY_COMPLETED
                "expired" in message -> EXPIRED
                "not valid yet" in message -> NOT_YET_VALID
                "tampered" in message || "invalid qr" in message ||
                    "no longer matches" in message || "payload is required" in message -> INVALID
                "cancelled" in message || "rejected" in message || "not approved" in message ||
                    "not found" in message || "cannot complete" in message ||
                    "still pending" in message -> NO_LONGER_VALID
                code == 404 -> NO_LONGER_VALID
                else -> OTHER
            }
        }
    }
}
