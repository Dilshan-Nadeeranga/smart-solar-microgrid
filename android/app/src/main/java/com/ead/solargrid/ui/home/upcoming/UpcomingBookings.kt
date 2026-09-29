package com.ead.solargrid.ui.home.upcoming

import com.ead.solargrid.api.ApiService
import com.ead.solargrid.models.ReservationItem
import com.ead.solargrid.qr.QrValidity
import java.io.IOException

/**
 * The prosumer's Approved bookings whose slot has not ended yet, soonest first.
 * In-progress bookings stay listed because their QR code is still needed at the station.
 */
object UpcomingBookings {

    const val STATUS_APPROVED = "Approved"

    /** The API caps pageSize at 100; five pages is far beyond any realistic prosumer. */
    private const val PAGE_SIZE = 100
    private const val MAX_PAGES = 5

    /** Pure: filters and sorts one prosumer's reservations as of [nowMs]. */
    fun select(items: List<ReservationItem>, nowMs: Long): List<ReservationItem> =
        items
            .filter { it.status.equals(STATUS_APPROVED, ignoreCase = true) }
            .filter { item ->
                // No end time: fall back to the start, so it drops off once the slot begins.
                val until = endMs(item) ?: startMs(item) ?: return@filter false
                until > nowMs
            }
            .sortedWith(compareBy<ReservationItem> { startMs(it) ?: Long.MAX_VALUE }.thenBy { it.id })

    /** True while the slot is running: started, not yet ended. */
    fun isInProgress(item: ReservationItem, nowMs: Long): Boolean {
        val start = startMs(item) ?: return false
        val end = endMs(item) ?: return false
        return nowMs in start until end
    }

    /**
     * Loads every Approved booking of the signed-in prosumer and applies [select].
     * @throws IOException on a network failure or a non-2xx response.
     */
    suspend fun load(api: ApiService, nowMs: Long = System.currentTimeMillis()): List<ReservationItem> {
        val all = mutableListOf<ReservationItem>()
        var page = 1
        while (page <= MAX_PAGES) {
            val response = api.getMyReservations(status = STATUS_APPROVED, pageSize = PAGE_SIZE, page = page)
            if (!response.isSuccessful) throw IOException("HTTP ${response.code()}")
            val body = response.body() ?: break
            all += body.items.orEmpty()
            if (page >= body.totalPages) break
            page++
        }
        return select(all, nowMs)
    }

    private fun startMs(item: ReservationItem) = QrValidity.parseUtc(item.slotStartTimeUtc)?.toEpochMilli()
    private fun endMs(item: ReservationItem) = QrValidity.parseUtc(item.slotEndTimeUtc)?.toEpochMilli()
}
