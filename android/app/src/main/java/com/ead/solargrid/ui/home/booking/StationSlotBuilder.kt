package com.ead.solargrid.ui.home.booking

import com.ead.solargrid.api.ApiService
import com.ead.solargrid.models.CreateSlotRequest
import com.ead.solargrid.models.EnergyBookingSlotDto
import com.ead.solargrid.models.StationSchedule
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.TextStyle
import java.util.Locale
import kotlin.math.abs

object StationSlotBuilder {

    private const val BOOKING_DAY_COUNT = 8
    private const val HOUR_MS = 60L * 60L * 1000L

    data class SlotLoadResult(
        val slots: List<EnergyBookingSlotDto>,
        val schedules: List<StationSchedule>
    )

    suspend fun loadSelectableSlots(api: ApiService, stationId: String): SlotLoadResult {
        val stationResp = api.getStation(stationId)
        val station = stationResp.body() ?: throw IllegalStateException("Station not found")
        val schedules = api.getStationSchedules(stationId).body().orEmpty()

        val days = localDays(BOOKING_DAY_COUNT)
        val utcDates = utcDatesCovering(days)
        val groups = utcDates.map { date ->
            api.getStationSlots(stationId, date).body().orEmpty()
        }

        val byId = linkedMapOf<String, EnergyBookingSlotDto>()
        groups.flatten().forEach { slot -> byId[slot.id] = slot }

        val visible = days.map { dayKey(it) }.toSet()
        val stored = byId.values.filter { visible.contains(dayKey(it.startTimeUtc)) }
        val slots = mutableListOf<EnergyBookingSlotDto>()
        val capacity = if (station.batteryStorageSlots > 0) station.batteryStorageSlots else 1

        for (day in days) {
            val key = dayKey(day)
            val schedule = schedules.find { it.day.equals(weekdayName(day), ignoreCase = true) }
            val daySlots = stored.filter { dayKey(it.startTimeUtc) == key }
            val hours = if (schedule?.isAvailable == true) {
                hourlyWindows(
                    localDateTime(day, schedule.openingTime),
                    localDateTime(day, schedule.closingTime)
                )
            } else {
                emptyList()
            }
            val used = mutableSetOf<String>()

            for ((index, window) in hours.withIndex()) {
                val (start, end) = window
                val match = daySlots.find { slot ->
                    val slotStart = BookingRules.parseInstant(slot.startTimeUtc)?.toEpochMilli() ?: 0L
                    val slotEnd = BookingRules.parseInstant(slot.endTimeUtc)?.toEpochMilli() ?: 0L
                    abs(slotStart - start.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()) < 60_000 &&
                        abs(slotEnd - end.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()) < 60_000
                }
                if (match != null) {
                    used.add(match.id)
                    slots.add(match)
                } else {
                    slots.add(
                        EnergyBookingSlotDto(
                            id = "${schedule?.id ?: "sched"}:$key:$index",
                            stationId = stationId,
                            startTimeUtc = start.atZone(ZoneId.systemDefault()).toInstant().toString(),
                            endTimeUtc = end.atZone(ZoneId.systemDefault()).toInstant().toString(),
                            maximumBookings = capacity,
                            reservedBookings = 0,
                            isActive = true
                        )
                    )
                }
            }

            for (slot in daySlots) {
                if (used.contains(slot.id)) continue
                val start = BookingRules.parseInstant(slot.startTimeUtc)?.let {
                    LocalDateTime.ofInstant(it, ZoneId.systemDefault())
                } ?: continue
                val end = BookingRules.parseInstant(slot.endTimeUtc)?.let {
                    LocalDateTime.ofInstant(it, ZoneId.systemDefault())
                } ?: continue
                val windows = hourlyWindows(start, end)
                val pieces = if (windows.isNotEmpty()) windows else listOf(start to end)
                pieces.forEachIndexed { index, piece ->
                    val (pieceStart, pieceEnd) = piece
                    val exactHour = pieces.size == 1 &&
                        (pieceEnd.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() -
                            pieceStart.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()) == HOUR_MS
                    slots.add(
                        slot.copy(
                            id = if (exactHour) slot.id else "${slot.id}:$index",
                            startTimeUtc = pieceStart.atZone(ZoneId.systemDefault()).toInstant().toString(),
                            endTimeUtc = pieceEnd.atZone(ZoneId.systemDefault()).toInstant().toString()
                        )
                    )
                }
            }
        }

        slots.sortBy { BookingRules.parseInstant(it.startTimeUtc)?.toEpochMilli() ?: Long.MAX_VALUE }
        return SlotLoadResult(slots, schedules)
    }

    suspend fun ensureStoredSlotId(api: ApiService, stationId: String, slot: EnergyBookingSlotDto): String {
        if (slot.id.matches(Regex("^[a-fA-F\\d]{24}$"))) return slot.id
        val created = api.createBookingSlot(
            stationId,
            CreateSlotRequest(
                startTimeUtc = slot.startTimeUtc,
                endTimeUtc = slot.endTimeUtc,
                maximumBookings = slot.maximumBookings
            )
        )
        if (!created.isSuccessful) {
            throw IllegalStateException(created.errorBody()?.string() ?: "Could not create slot")
        }
        return created.body()?.id ?: throw IllegalStateException("Slot created without id")
    }

    private fun localDays(count: Int): List<LocalDate> {
        val start = LocalDate.now()
        return (0 until count).map { start.plusDays(it.toLong()) }
    }

    private fun utcDatesCovering(days: List<LocalDate>): List<String> {
        if (days.isEmpty()) return emptyList()
        val zone = ZoneId.systemDefault()
        val start = days.first().atStartOfDay(zone).toInstant()
        val end = days.last().plusDays(1).atStartOfDay(zone).toInstant().minusMillis(1)
        val dates = mutableListOf<String>()
        var cursor = Instant.ofEpochMilli(start.toEpochMilli())
            .atZone(ZoneId.of("UTC"))
            .toLocalDate()
        val last = Instant.ofEpochMilli(end.toEpochMilli()).atZone(ZoneId.of("UTC")).toLocalDate()
        while (!cursor.isAfter(last)) {
            dates.add(String.format(Locale.US, "%04d-%02d-%02d", cursor.year, cursor.monthValue, cursor.dayOfMonth))
            cursor = cursor.plusDays(1)
        }
        return dates.distinct()
    }

    fun dayKey(isoUtc: String): String {
        val instant = BookingRules.parseInstant(isoUtc) ?: return ""
        val local = instant.atZone(ZoneId.systemDefault()).toLocalDate()
        return local.toString()
    }

    fun dayKey(date: LocalDate): String = date.toString()

    fun weekdayName(date: LocalDate): String =
        date.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.US)

    private fun localDateTime(day: LocalDate, timeText: String): LocalDateTime {
        val parts = timeText.split(":").map { it.toIntOrNull() ?: 0 }
        val hour = parts.getOrElse(0) { 0 }
        val minute = parts.getOrElse(1) { 0 }
        val second = parts.getOrElse(2) { 0 }
        return day.atTime(hour, minute, second)
    }

    private fun hourlyWindows(start: LocalDateTime, end: LocalDateTime): List<Pair<LocalDateTime, LocalDateTime>> {
        val windows = mutableListOf<Pair<LocalDateTime, LocalDateTime>>()
        var cursor = start.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
        val endMs = end.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
        while (cursor + HOUR_MS <= endMs) {
            val windowStart = LocalDateTime.ofInstant(Instant.ofEpochMilli(cursor), ZoneId.systemDefault())
            val windowEnd = LocalDateTime.ofInstant(Instant.ofEpochMilli(cursor + HOUR_MS), ZoneId.systemDefault())
            windows.add(windowStart to windowEnd)
            cursor += HOUR_MS
        }
        return windows
    }
}
