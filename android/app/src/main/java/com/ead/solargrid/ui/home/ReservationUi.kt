package com.ead.solargrid.ui.home

import android.view.LayoutInflater
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import com.ead.solargrid.R
import com.ead.solargrid.databinding.ItemPendingBookingCardBinding
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

    /** e.g. "Tue, Sep 29 · 09:30 AM", in the same zone as [formatSlotRange]. */
    fun formatDateTime(instant: Instant): String =
        instant.atZone(ZoneId.of("Asia/Colombo"))
            .format(DateTimeFormatter.ofPattern("EEE, MMM d · hh:mm a", Locale.getDefault()))

    /**
     * @param onClick when set, the row is tappable and shows a "Show QR" hint.
     * @param statusLabel replaces the raw status on the chip, e.g. "In progress".
     */
    fun addBookingRow(
        parent: LinearLayout,
        inflater: LayoutInflater,
        item: ReservationItem,
        onClick: ((ReservationItem) -> Unit)? = null,
        statusLabel: String? = null
    ) {
        val row = inflater.inflate(R.layout.item_upcoming_booking, parent, false)
        row.findViewById<TextView>(R.id.tvBookingStation).text =
            item.stationName ?: item.stationId
        row.findViewById<TextView>(R.id.tvBookingWhen).text =
            formatSlotRange(item.slotStartTimeUtc, item.slotEndTimeUtc)
        row.findViewById<TextView>(R.id.tvBookingStatus).text = statusLabel ?: item.status
        if (onClick != null) {
            row.findViewById<TextView>(R.id.tvBookingAction).visibility = View.VISIBLE
            row.isClickable = true
            row.isFocusable = true
            row.setOnClickListener { onClick(item) }
        }
        parent.addView(row)
    }

    fun addPendingBookingCard(
        parent: LinearLayout,
        inflater: LayoutInflater,
        item: ReservationItem,
        prosumerName: String?,
        onClick: ((ReservationItem) -> Unit)? = null
    ) {
        val card = ItemPendingBookingCardBinding.inflate(inflater, parent, false)
        card.tvCardTitle.text = item.stationName ?: item.stationId
        card.tvCardWhen.text = formatSlotRange(item.slotStartTimeUtc, item.slotEndTimeUtc)
        card.tvCardStatus.text = item.status
        card.tvCardLocation.text = item.stationName ?: item.stationId
        val name = prosumerName?.trim().orEmpty().ifBlank { "Prosumer" }
        card.tvCardProsumer.text = name
        card.tvCardInitials.text = initials(name)
        if (onClick != null) {
            card.root.isClickable = true
            card.root.isFocusable = true
            card.root.setOnClickListener { onClick(item) }
        }
        parent.addView(card.root)
    }

    private fun initials(name: String): String {
        val parts = name.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
        return when {
            parts.size >= 2 -> "${parts[0].first()}${parts[1].first()}".uppercase(Locale.getDefault())
            parts.size == 1 && parts[0].length >= 2 -> parts[0].substring(0, 2).uppercase(Locale.getDefault())
            parts.size == 1 -> parts[0].first().uppercaseChar().toString()
            else -> "P"
        }
    }
}
