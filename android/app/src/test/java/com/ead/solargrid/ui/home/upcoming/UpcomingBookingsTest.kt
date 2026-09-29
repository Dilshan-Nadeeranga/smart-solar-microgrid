package com.ead.solargrid.ui.home.upcoming

import com.ead.solargrid.api.ApiService
import com.ead.solargrid.models.ReservationItem
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.IOException
import java.time.Instant

class UpcomingBookingsTest {

    private val now = Instant.parse("2026-09-30T05:00:00Z").toEpochMilli()

    private fun item(id: String, start: String?, end: String?, status: String = "Approved") =
        ReservationItem(
            id = id, prosumerId = "200012345678", stationId = "st", stationName = "Colombo Solar Hub",
            slotId = "slot-$id", status = status, slotStartTimeUtc = start, slotEndTimeUtc = end
        )

    @Test
    fun `keeps future and in-progress Approved slots, soonest first`() {
        val items = listOf(
            item("later", "2026-10-02T04:30:00Z", "2026-10-02T05:30:00Z"),
            item("ended", "2026-09-29T04:30:00Z", "2026-09-29T05:30:00Z"),
            item("inProgress", "2026-09-30T04:30:00Z", "2026-09-30T05:30:00Z"),
            item("soon", "2026-09-30T06:00:00Z", "2026-09-30T07:00:00Z"),
            item("completed", "2026-10-01T04:30:00Z", "2026-10-01T05:30:00Z", status = "Completed"),
            item("pending", "2026-10-01T04:30:00Z", "2026-10-01T05:30:00Z", status = "Pending"),
            item("noTimes", null, null)
        )

        val result = UpcomingBookings.select(items, now).map { it.id }

        assertEquals(listOf("inProgress", "soon", "later"), result)
    }

    @Test
    fun `slot that ends exactly now is gone, one without an end drops at its start`() {
        val endsNow = item("endsNow", "2026-09-30T04:00:00Z", "2026-09-30T05:00:00Z")
        val noEndStarted = item("noEndStarted", "2026-09-30T04:00:00Z", null)
        val noEndFuture = item("noEndFuture", "2026-09-30T06:00:00Z", null)

        val result = UpcomingBookings.select(listOf(endsNow, noEndStarted, noEndFuture), now).map { it.id }

        assertEquals(listOf("noEndFuture"), result)
    }

    @Test
    fun `in progress only between start and end`() {
        assertTrue(UpcomingBookings.isInProgress(item("a", "2026-09-30T04:30:00Z", "2026-09-30T05:30:00Z"), now))
        assertTrue(UpcomingBookings.isInProgress(item("b", "2026-09-30T05:00:00Z", "2026-09-30T06:00:00Z"), now))
        assertFalse(UpcomingBookings.isInProgress(item("c", "2026-09-30T06:00:00Z", "2026-09-30T07:00:00Z"), now))
        assertFalse(UpcomingBookings.isInProgress(item("d", "2026-09-30T04:30:00Z", null), now))
    }

    @Test
    fun `load follows every page and asks only for Approved`() = runTest {
        val server = MockWebServer()
        server.start()
        try {
            server.enqueue(page(1, 2, item("p1", "2026-10-01T04:30:00Z", "2026-10-01T05:30:00Z")))
            server.enqueue(page(2, 2, item("p2", "2026-09-30T06:00:00Z", "2026-09-30T07:00:00Z")))

            val result = UpcomingBookings.load(api(server), now).map { it.id }

            assertEquals(listOf("p2", "p1"), result)
            assertEquals("/api/reservations/mine?status=Approved&pageSize=100&page=1", server.takeRequest().path)
            assertEquals("/api/reservations/mine?status=Approved&pageSize=100&page=2", server.takeRequest().path)
            assertEquals(2, server.requestCount)
        } finally {
            server.shutdown()
        }
    }

    @Test(expected = IOException::class)
    fun `server error is reported, not shown as an empty list`() = runTest {
        val server = MockWebServer()
        server.start()
        try {
            server.enqueue(MockResponse().setResponseCode(500).setBody("""{"message":"boom"}"""))
            UpcomingBookings.load(api(server), now)
        } finally {
            server.shutdown()
        }
    }

    private fun api(server: MockWebServer): ApiService = Retrofit.Builder()
        .baseUrl(server.url("/"))
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(ApiService::class.java)

    private fun page(page: Int, totalPages: Int, vararg items: ReservationItem): MockResponse {
        val json = items.joinToString(",") {
            """{"id":"${it.id}","prosumerId":"${it.prosumerId}","stationId":"${it.stationId}",
               "stationName":"${it.stationName}","slotId":"${it.slotId}","status":"${it.status}",
               "slotStartTimeUtc":"${it.slotStartTimeUtc}","slotEndTimeUtc":"${it.slotEndTimeUtc}"}"""
        }
        return MockResponse().setHeader("Content-Type", "application/json").setBody(
            """{"message":null,"items":[$json],"page":$page,"pageSize":100,
               "totalCount":${totalPages * items.size},"totalPages":$totalPages}"""
        )
    }
}
