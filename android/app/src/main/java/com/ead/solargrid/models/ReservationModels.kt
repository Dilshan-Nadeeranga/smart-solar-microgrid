package com.ead.solargrid.models

/**
 * GET /api/reservations/summary.
 * Scope is "All" for staff (operational counts) and "Own" for a prosumer.
 */
data class ReservationSummaryResponse(
    val message: String?,
    val scope: String?,
    val pendingCount: Long,
    val approvedFutureCount: Long
)

/**
 * GET /api/reservations page metadata. The home screen only needs the counts,
 * so the items are not mapped here.
 */
data class ReservationPageResponse(
    val message: String?,
    val page: Int,
    val pageSize: Int,
    val totalCount: Long,
    val totalPages: Int
)
