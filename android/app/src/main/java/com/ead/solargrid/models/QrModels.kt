package com.ead.solargrid.models

/** GET /api/reservations/{id}/qr. */
data class QrCodeResponse(
    val message: String?,
    val reservationId: String?,
    val qr: QrCodeDto?
)

/**
 * The signed QR string plus its validity window. [payload] is a secret while it is valid:
 * keep it in memory only, never log or persist it.
 */
data class QrCodeDto(
    val payload: String?,
    val issuedAtUtc: String?,
    val validFromUtc: String?,
    val expiresAtUtc: String?
) {
    override fun toString() = "QrCodeDto(payload=<redacted>, issuedAtUtc=$issuedAtUtc, expiresAtUtc=$expiresAtUtc)"
}

/** POST /api/reservations/verify-qr body. */
data class VerifyQrRequest(val payload: String) {
    override fun toString() = "VerifyQrRequest(payload=<redacted>)"
}

/** POST /api/reservations/verify-qr success. */
data class QrVerificationResponse(
    val message: String?,
    val reservationId: String?,
    val reservation: ReservationDetails?,
    val prosumer: QrProsumer?,
    val qrIssuedAtUtc: String?,
    val qrExpiresAtUtc: String?
)

data class QrProsumer(
    val nic: String?,
    val name: String?
)

/** Reservation as returned by verify-qr and the approve/reject/complete actions. */
data class ReservationDetails(
    val id: String,
    val prosumerId: String?,
    val stationId: String?,
    val stationName: String?,
    val slotId: String?,
    val status: String?,
    val slotStartTimeUtc: String?,
    val slotEndTimeUtc: String?,
    val completedAtUtc: String?,
    val version: Long?
)

/**
 * Optional body for PATCH /api/reservations/{id}/complete. Sent without a version so a repeat
 * call is answered with the server's "already completed" error rather than a version conflict.
 */
data class ReservationActionRequest(val version: Long? = null)

/** PATCH /api/reservations/{id}/complete success. */
data class ReservationActionResponse(
    val message: String?,
    val reservationId: String?,
    val reservation: ReservationDetails?
)
