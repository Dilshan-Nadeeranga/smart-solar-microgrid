package com.ead.solargrid.ui.home.booking

import com.ead.solargrid.models.EnergyBookingSlotDto
import com.ead.solargrid.models.SolarStation
import java.time.Instant

object BookingRules {
    private const val HOUR_MS = 60L * 60L * 1000L
    private const val TWELVE_HOURS_MS = 12L * HOUR_MS
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

    /**
     * Pending and Approved can be edited or cancelled only when more than 12 hours remain.
     * Returns a user-facing reason when the action must be rejected.
     */
    fun changeBlockedReason(status: String?, slotStartUtc: String?, nowMs: Long = System.currentTimeMillis()): String? {
        val normalized = status?.trim()?.lowercase().orEmpty()
        if (normalized != "pending" && normalized != "approved") {
            return "This booking can no longer be changed."
        }
        val start = parseInstant(slotStartUtc)?.toEpochMilli()
            ?: return "This booking can no longer be changed."
        if (start - nowMs <= TWELVE_HOURS_MS) {
            return "Changes require at least 12 hours' notice."
        }
        return null
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
