package com.ead.solargrid.ui.home.booking

import com.ead.solargrid.models.EnergyBookingSlotDto
import com.ead.solargrid.models.SolarStation
import java.time.Instant

object BookingRules {
    private const val HOUR_MS = 60L * 60L * 1000L
    private const val SEVEN_DAYS_MS = 7L * 24L * HOUR_MS

    data class SlotAvailability(val bookable: Boolean, val reason: String?)

    fun slotAvailability(slot: EnergyBookingSlotDto, station: SolarStation, nowMs: Long): SlotAvailability {
        val start = parseInstant(slot.startTimeUtc)?.toEpochMilli() ?: return SlotAvailability(false, "Invalid slot")
        if (!station.isActive) return SlotAvailability(false, "Station inactive")
        if (!slot.isActive) return SlotAvailability(false, "Slot inactive")
        if (start <= nowMs) return SlotAvailability(false, "Already started")
        if (start > nowMs + SEVEN_DAYS_MS) return SlotAvailability(false, "Beyond 7-day window")
        if (slot.reservedBookings >= slot.maximumBookings) return SlotAvailability(false, "Full")
        return SlotAvailability(true, null)
    }

    fun parseInstant(value: String?): Instant? {
        if (value.isNullOrBlank()) return null
        return try {
            Instant.parse(value)
        } catch (_: Exception) {
            null
        }
    }
}
