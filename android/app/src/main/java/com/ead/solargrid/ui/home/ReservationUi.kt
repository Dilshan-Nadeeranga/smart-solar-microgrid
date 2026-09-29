package com.ead.solargrid.ui.home

import android.view.LayoutInflater
import android.widget.LinearLayout
import android.widget.TextView
import com.ead.solargrid.R
import com.ead.solargrid.models.ReservationItem
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

object ReservationUi {

    fun formatSlotRange(startUtc: String?, endUtc: String?): String {
        if (startUtc.isNullOrBlank()) return "Slot time unavailable"
        return try {
            val zone = ZoneId.of("Asia/Colombo")
            val start = Instant.parse(startUtc).atZone(zone)
            val end = endUtc?.let { Instant.parse(it).atZone(zone) }
            val day = start.format(DateTimeFormatter.ofPattern("EEE, MMM d", Locale.getDefault()))
            val time = if (end != null) {
                val from = start.format(DateTimeFormatter.ofPattern("hh:mm a", Locale.getDefault()))
                val to = end.format(DateTimeFormatter.ofPattern("hh:mm a", Locale.getDefault()))
                "$day · $from – $to"
            } else {
                day
            }
            time
        } catch (_: Exception) {
            startUtc
        }
    }

    fun addBookingRow(parent: LinearLayout, inflater: LayoutInflater, item: ReservationItem) {
        val row = inflater.inflate(R.layout.item_upcoming_booking, parent, false)
        row.findViewById<TextView>(R.id.tvBookingStation).text =
            item.stationName ?: item.stationId
        row.findViewById<TextView>(R.id.tvBookingWhen).text =
            formatSlotRange(item.slotStartTimeUtc, item.slotEndTimeUtc)
        row.findViewById<TextView>(R.id.tvBookingStatus).text = item.status
        parent.addView(row)
    }
}
