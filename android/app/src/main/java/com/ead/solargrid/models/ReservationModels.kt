package com.ead.solargrid.models

data class ReservationSummaryResponse(
    val message: String?,
    val scope: String?,
    val pendingCount: Long,
    val approvedFutureCount: Long
)

data class ReservationPageResponse(
    val message: String?,
    val items: List<ReservationItem>?,
    val page: Int,
    val pageSize: Int,
    val totalCount: Long,
    val totalPages: Int
)

data class ReservationItem(
    val id: String,
    val prosumerId: String,
    val stationId: String,
    val stationName: String?,
    val slotId: String,
    val status: String,
    val slotStartTimeUtc: String?,
    val slotEndTimeUtc: String?
)

data class SolarStation(
    val id: String,
    val name: String,
    val address: String?,
    val isActive: Boolean
)
