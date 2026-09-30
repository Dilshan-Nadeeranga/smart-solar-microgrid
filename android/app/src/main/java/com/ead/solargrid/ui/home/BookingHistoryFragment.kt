package com.ead.solargrid.ui.home

import android.app.Dialog
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.ead.solargrid.R
import com.ead.solargrid.api.ApiClient
import com.ead.solargrid.database.SessionManager
import com.ead.solargrid.databinding.DialogHistoryFilterBinding
import com.ead.solargrid.databinding.FragmentProsumerHistoryBinding
import com.ead.solargrid.models.ReservationItem
import com.ead.solargrid.ui.home.booking.BookingRules
import com.google.android.material.card.MaterialCardView
import kotlinx.coroutines.launch

class BookingHistoryFragment : Fragment() {

    private enum class HistoryFilter { ALL, COMPLETED, CANCELLED, REJECTED }

    private var _binding: FragmentProsumerHistoryBinding? = null
    private val binding get() = _binding!!

    private val historyStatuses = setOf("Completed", "Cancelled", "Rejected")
    private var historyItems: List<ReservationItem> = emptyList()
    private var listFilter = HistoryFilter.ALL

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentProsumerHistoryBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.btnHistoryFilter.setOnClickListener { showHistoryFilter() }
    }

    override fun onResume() {
        super.onResume()
        loadHistory()
    }

    private fun showHistoryFilter() {
        val dialogBinding = DialogHistoryFilterBinding.inflate(layoutInflater)
        val dialog = Dialog(requireContext())
        dialog.setContentView(dialogBinding.root)
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        dialog.window?.setLayout(
            (resources.displayMetrics.widthPixels * 0.88f).toInt(),
            ViewGroup.LayoutParams.WRAP_CONTENT
        )
        var selected = listFilter
        fun paint() {
            val density = resources.displayMetrics.density
            listOf(
                dialogBinding.optionAll to HistoryFilter.ALL,
                dialogBinding.optionCompleted to HistoryFilter.COMPLETED,
                dialogBinding.optionCancelled to HistoryFilter.CANCELLED,
                dialogBinding.optionRejected to HistoryFilter.REJECTED
            ).forEach { (card, filter) ->
                styleOption(card, filter == selected, density)
            }
        }
        paint()
        dialogBinding.optionAll.setOnClickListener { selected = HistoryFilter.ALL; paint() }
        dialogBinding.optionCompleted.setOnClickListener { selected = HistoryFilter.COMPLETED; paint() }
        dialogBinding.optionCancelled.setOnClickListener { selected = HistoryFilter.CANCELLED; paint() }
        dialogBinding.optionRejected.setOnClickListener { selected = HistoryFilter.REJECTED; paint() }
        dialogBinding.btnApplyFilter.setOnClickListener {
            listFilter = selected
            renderHistory()
            dialog.dismiss()
        }
        dialog.show()
    }

    private fun styleOption(card: MaterialCardView, selected: Boolean, density: Float) {
        card.strokeWidth = ((if (selected) 2.5f else 1f) * density).toInt()
        card.strokeColor = ContextCompat.getColor(
            requireContext(),
            if (selected) R.color.booking_card_selected_stroke else R.color.booking_search_stroke
        )
    }

    private fun loadHistory() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val api = ApiClient.getApiService(requireContext())
                val all = api.getMyReservations(pageSize = 50).body()?.items.orEmpty()
                historyItems = all.filter { item ->
                    historyStatuses.any { it.equals(item.status, ignoreCase = true) }
                }
                if (_binding == null) return@launch
                renderHistory()
            } catch (_: Exception) {
                if (_binding == null) return@launch
                binding.tvHistoryEmpty.isVisible = true
                binding.tvHistoryEmpty.text = getString(R.string.dashboard_load_error)
            }
        }
    }

    private fun renderHistory() {
        val userName = SessionManager(requireContext()).getUserSession()?.name
        val shown = historyItems
            .filter { item ->
                when (listFilter) {
                    HistoryFilter.COMPLETED -> item.status.equals("Completed", ignoreCase = true)
                    HistoryFilter.CANCELLED -> item.status.equals("Cancelled", ignoreCase = true)
                    HistoryFilter.REJECTED -> item.status.equals("Rejected", ignoreCase = true)
                    HistoryFilter.ALL -> true
                }
            }
            .sortedByDescending { item ->
                BookingRules.parseInstant(item.slotStartTimeUtc)?.toEpochMilli() ?: 0L
            }
        binding.tvHistoryCount.text = shown.size.toString()
        binding.tvHistoryHeading.setText(
            when (listFilter) {
                HistoryFilter.COMPLETED -> R.string.history_filter_completed
                HistoryFilter.CANCELLED -> R.string.history_filter_cancelled
                HistoryFilter.REJECTED -> R.string.history_filter_rejected
                HistoryFilter.ALL -> R.string.history_heading
            }
        )
        binding.historyList.removeAllViews()
        if (shown.isEmpty()) {
            binding.tvHistoryEmpty.isVisible = true
            binding.tvHistoryEmpty.setText(
                if (listFilter == HistoryFilter.ALL) R.string.history_empty else R.string.history_empty_filtered
            )
        } else {
            binding.tvHistoryEmpty.isVisible = false
            shown.forEach { item ->
                ReservationUi.addPendingBookingCard(
                    binding.historyList,
                    layoutInflater,
                    item,
                    userName
                )
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
