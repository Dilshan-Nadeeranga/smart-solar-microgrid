package com.ead.solargrid.ui.home

import android.graphics.Typeface
import android.os.Bundle
import androidx.core.content.ContextCompat
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.ead.solargrid.R
import com.ead.solargrid.api.ApiClient
import com.ead.solargrid.database.SessionManager
import com.ead.solargrid.databinding.FragmentProsumerBookingsBinding
import com.ead.solargrid.databinding.ItemBookingSlotRowBinding
import com.ead.solargrid.databinding.ItemBookingStationCardBinding
import com.ead.solargrid.models.CreateReservationRequest
import com.ead.solargrid.models.EnergyBookingSlotDto
import com.ead.solargrid.models.ReservationItem
import com.ead.solargrid.models.SolarStation
import com.ead.solargrid.ui.home.booking.BookingRules
import com.ead.solargrid.ui.home.booking.StationSlotBuilder
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

class MyReservationsFragment : Fragment() {

    private var _binding: FragmentProsumerBookingsBinding? = null
    private val binding get() = _binding!!

    private enum class Step { LIST, STATION, SLOT, SUMMARY }

    private var step = Step.LIST
    private var stations: List<SolarStation> = emptyList()
    private var pendingItems: List<ReservationItem> = emptyList()
    private var pendingSortNewestFirst = true
    private var selectedStation: SolarStation? = null
    private var loadedSlots: List<EnergyBookingSlotDto> = emptyList()
    private var selectedSlot: EnergyBookingSlotDto? = null
    private var selectedDayKey: String? = null
    private var submitting = false
    private var stationsFetchJob: Job? = null
    private var stationSearchDebounceJob: Job? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentProsumerBookingsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupStepHeaders()

        binding.btnCreateBooking.setOnClickListener { startCreateBooking() }
        binding.btnPendingFilter.setOnClickListener {
            pendingSortNewestFirst = !pendingSortNewestFirst
            renderPendingBookings()
        }
        binding.btnBookingBack.setOnClickListener { onBackPressed() }
        binding.btnBookingContinue.setOnClickListener { onContinue() }
        binding.btnConfirmBooking.setOnClickListener { confirmBooking() }

        binding.etStationSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
            override fun afterTextChanged(s: Editable?) {
                stationSearchDebounceJob?.cancel()
                stationSearchDebounceJob = viewLifecycleOwner.lifecycleScope.launch {
                    delay(200)
                    updateStationCountLabel()
                    renderStationCards()
                }
            }
        })
        binding.etStationSearch.setOnFocusChangeListener { _, hasFocus ->
            applyStationSearchStroke(hasFocus)
        }

        showStep(Step.LIST)
        prefetchStationsQuietly()
    }

    override fun onHiddenChanged(hidden: Boolean) {
        super.onHiddenChanged(hidden)
        if (!hidden) {
            onBookingsTabSelected()
        }
    }

    override fun onResume() {
        super.onResume()
        if (!isHidden && step == Step.LIST) {
            loadPendingBookings()
        }
    }

    private fun onBookingsTabSelected() {
        if ((activity as? ProsumerHomeActivity)?.consumePendingNewBooking() == true) {
            startCreateBooking()
            return
        }
        if (step == Step.LIST) {
            loadPendingBookings()
            prefetchStationsQuietly()
        }
    }

    private fun startCreateBooking() {
        selectedStation = null
        selectedSlot = null
        selectedDayKey = null
        binding.etStationSearch.text?.clear()
        binding.btnBookingContinue.isEnabled = false
        goToStep(Step.STATION)
    }

    private fun returnToBookingsList() {
        selectedStation = null
        selectedSlot = null
        selectedDayKey = null
        binding.etStationSearch.text?.clear()
        binding.btnBookingContinue.isEnabled = false
        goToStep(Step.LIST)
    }

    private fun setupStepHeaders() {
        binding.headerStation.tvStepNumber.text = "1"
        binding.headerStation.tvStepTitle.setText(R.string.booking_available_stations)
        binding.headerSlot.tvStepNumber.text = "2"
        binding.headerSlot.tvStepTitle.setText(R.string.booking_step_slot)
    }

    private fun onBackPressed() {
        when (step) {
            Step.STATION -> returnToBookingsList()
            Step.SLOT -> goToStep(Step.STATION)
            Step.SUMMARY -> goToStep(Step.SLOT)
            Step.LIST -> Unit
        }
    }

    private fun onContinue() {
        when (step) {
            Step.STATION -> {
                if (selectedStation == null) {
                    Toast.makeText(requireContext(), R.string.booking_pick_station, Toast.LENGTH_SHORT).show()
                    return
                }
                goToStep(Step.SLOT)
            }
            Step.SLOT -> {
                if (selectedSlot == null) {
                    Toast.makeText(requireContext(), R.string.booking_pick_slot, Toast.LENGTH_SHORT).show()
                    return
                }
                populateSummary()
                goToStep(Step.SUMMARY)
            }
            else -> Unit
        }
    }

    private fun goToStep(next: Step) {
        step = next
        showStep(next)
    }

    private fun showStep(current: Step) {
        val isList = current == Step.LIST
        binding.stepList.isVisible = isList
        binding.stepStation.isVisible = current == Step.STATION
        binding.stepSlot.isVisible = current == Step.SLOT
        binding.stepSummary.isVisible = current == Step.SUMMARY

        binding.wizardToolbar.isVisible = !isList
        binding.btnBookingBack.isVisible = current != Step.LIST
        binding.btnBookingContinue.isVisible = current == Step.STATION || current == Step.SLOT
        binding.btnBookingContinue.isEnabled = when (current) {
            Step.STATION -> selectedStation != null
            Step.SLOT -> selectedSlot != null
            else -> false
        }

        if (current != Step.STATION) {
            binding.etStationSearch.clearFocus()
            applyStationSearchStroke(false)
        }

        when (current) {
            Step.LIST -> loadPendingBookings()
            Step.STATION -> {
                binding.tvBookingEyebrow.isVisible = true
                binding.tvBookingEyebrow.setText(R.string.booking_eyebrow_new)
                binding.tvBookingTitle.setText(R.string.booking_step_station)
                binding.tvBookingSubtitle.isVisible = false
                applyStationSearchStroke(binding.etStationSearch.hasFocus())
                presentStationStep()
            }
            Step.SLOT -> {
                selectedDayKey = null
                selectedSlot = null
                binding.btnBookingContinue.isEnabled = false
                binding.tvBookingEyebrow.isVisible = true
                binding.tvBookingTitle.setText(R.string.booking_step_slot)
                binding.tvBookingSubtitle.isVisible = true
                binding.tvBookingSubtitle.text = selectedStation?.name ?: ""
                binding.tvSlotMonth.text = monthLabel()
                loadSlotsForStation()
            }
            Step.SUMMARY -> {
                binding.tvBookingEyebrow.isVisible = true
                binding.tvBookingTitle.setText(R.string.booking_summary_title)
                binding.tvBookingSubtitle.isVisible = true
                binding.tvBookingSubtitle.setText(R.string.booking_summary_eyebrow)
            }
        }
    }

    private fun loadPendingBookings() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val api = ApiClient.getApiService(requireContext())
                pendingItems = api.getMyReservations(status = "Pending", pageSize = 50).body()?.items.orEmpty()
                if (_binding == null) return@launch
                renderPendingBookings()
            } catch (_: Exception) {
                if (_binding == null) return@launch
                binding.tvPendingEmpty.isVisible = true
                binding.tvPendingEmpty.text = getString(R.string.dashboard_load_error)
            }
        }
    }

    private fun renderPendingBookings() {
        val userName = SessionManager(requireContext()).getUserSession()?.name
        val sorted = pendingItems.sortedBy { item ->
            val t = BookingRules.parseInstant(item.slotStartTimeUtc)?.toEpochMilli() ?: 0L
            if (pendingSortNewestFirst) -t else t
        }
        binding.tvPendingCount.text = sorted.size.toString()
        binding.pendingList.removeAllViews()
        if (sorted.isEmpty()) {
            binding.tvPendingEmpty.isVisible = true
            binding.tvPendingEmpty.setText(R.string.bookings_pending_empty)
        } else {
            binding.tvPendingEmpty.isVisible = false
            sorted.forEach { item ->
                ReservationUi.addPendingBookingCard(binding.pendingList, layoutInflater, item, userName)
            }
        }
    }

    private fun filteredStations(): List<SolarStation> {
        val query = binding.etStationSearch.text?.toString()?.trim()?.lowercase(Locale.getDefault()).orEmpty()
        if (query.isEmpty()) return stations
        return stations.filter { station ->
            station.name.lowercase(Locale.getDefault()).contains(query) ||
                station.address?.lowercase(Locale.getDefault())?.contains(query) == true
        }
    }

    private fun updateStationCountLabel() {
        binding.headerStation.tvStepAside.text =
            getString(R.string.booking_active_stations_count, filteredStations().size)
    }

    /** Show cached stations instantly; only hit the network when the cache is empty. */
    private fun presentStationStep() {
        binding.tvStationsError.isVisible = false
        if (stations.isNotEmpty()) {
            binding.progressStations.isVisible = false
            binding.stationList.isVisible = true
            updateStationCountLabel()
            renderStationCards()
            return
        }
        if (stationsFetchJob?.isActive == true) {
            binding.progressStations.isVisible = true
            binding.stationList.isVisible = false
            return
        }
        fetchStations(showBlockingLoader = true)
    }

    /** Load stations in the background while the user is on the bookings list. */
    private fun prefetchStationsQuietly() {
        if (stations.isNotEmpty() || stationsFetchJob?.isActive == true) return
        fetchStations(showBlockingLoader = false)
    }

    private fun fetchStations(showBlockingLoader: Boolean) {
        if (showBlockingLoader && _binding != null) {
            binding.progressStations.isVisible = true
            binding.stationList.isVisible = stations.isNotEmpty()
            binding.tvStationsError.isVisible = false
            if (stations.isEmpty()) {
                binding.headerStation.tvStepAside.text = ""
            }
        }

        stationsFetchJob?.cancel()
        stationsFetchJob = viewLifecycleOwner.lifecycleScope.launch {
            try {
                val api = ApiClient.getApiService(requireContext())
                val response = api.getStations()
                if (_binding == null) return@launch
                binding.progressStations.isVisible = false
                if (!response.isSuccessful) {
                    if (step == Step.STATION && stations.isEmpty()) {
                        binding.tvStationsError.isVisible = true
                        binding.tvStationsError.text = getString(R.string.dashboard_load_error)
                    }
                    return@launch
                }
                stations = response.body().orEmpty().filter { it.isActive }
                if (step == Step.STATION) {
                    updateStationCountLabel()
                    renderStationCards()
                }
            } catch (_: Exception) {
                if (_binding == null) return@launch
                binding.progressStations.isVisible = false
                if (step == Step.STATION && stations.isEmpty()) {
                    binding.tvStationsError.isVisible = true
                    binding.tvStationsError.text = getString(R.string.dashboard_load_error)
                }
            }
        }
    }

    private fun renderStationCards() {
        val visible = filteredStations()
        binding.stationList.removeAllViews()
        binding.tvStationsError.isVisible = visible.isEmpty() && stations.isNotEmpty()
        if (visible.isEmpty() && stations.isNotEmpty()) {
            binding.tvStationsError.text = getString(R.string.booking_no_station_match)
        }
        binding.stationList.isVisible = visible.isNotEmpty()
        val inflater = layoutInflater
        visible.forEach { station ->
            val cardBinding = ItemBookingStationCardBinding.inflate(inflater, binding.stationList, false)
            val selected = selectedStation?.id == station.id
            cardBinding.tvStationName.text = station.name
            cardBinding.tvStationAddress.text = station.address ?: "—"
            cardBinding.tvStationCapacity.text = getString(R.string.station_capacity_value, station.capacityKw)
            applyStationCardSelection(cardBinding, selected)
            cardBinding.root.tag = station.id
            cardBinding.root.setOnClickListener {
                selectedStation = station
                selectedSlot = null
                refreshStationCardSelection()
                binding.btnBookingContinue.isEnabled = true
            }
            binding.stationList.addView(cardBinding.root)
        }
    }

    private fun refreshStationCardSelection() {
        for (i in 0 until binding.stationList.childCount) {
            val root = binding.stationList.getChildAt(i)
            val stationId = root.tag as? String ?: continue
            val selected = selectedStation?.id == stationId
            applyStationCardSelection(ItemBookingStationCardBinding.bind(root), selected)
        }
    }

    private fun applyStationSearchStroke(focused: Boolean) {
        if (_binding == null) return
        val density = resources.displayMetrics.density
        val card = binding.stationSearchLayout
        if (focused) {
            card.strokeWidth = (2.5f * density).toInt()
            card.strokeColor = ContextCompat.getColor(requireContext(), R.color.booking_card_selected_stroke)
            card.cardElevation = 2f
        } else {
            card.strokeWidth = (1f * density).toInt()
            card.strokeColor = ContextCompat.getColor(requireContext(), R.color.booking_search_stroke)
            card.cardElevation = 1f
        }
    }

    private fun applyStationCardSelection(
        cardBinding: ItemBookingStationCardBinding,
        selected: Boolean
    ) {
        cardBinding.radioInner.isVisible = selected
        cardBinding.radioOuter.setBackgroundResource(
            if (selected) R.drawable.bg_station_radio_outer_selected
            else R.drawable.bg_station_radio_outer
        )
        val density = resources.displayMetrics.density
        val strokeDp = if (selected) 3.5f else 1f
        cardBinding.stationCardRoot.strokeWidth = (strokeDp * density).toInt()
        cardBinding.stationCardRoot.strokeColor = ContextCompat.getColor(
            requireContext(),
            if (selected) R.color.booking_card_selected_stroke else R.color.booking_search_stroke
        )
        cardBinding.stationCardRoot.cardElevation = if (selected) 8f else 2f
        cardBinding.stationCardRoot.translationZ = if (selected) 2f else 0f
    }

    private fun loadSlotsForStation() {
        val station = selectedStation ?: return
        binding.progressSlots.isVisible = true
        binding.slotList.isVisible = false
        binding.tvSlotsPlaceholder.isVisible = false

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val api = ApiClient.getApiService(requireContext())
                val result = StationSlotBuilder.loadSelectableSlots(api, station.id)
                if (_binding == null) return@launch
                loadedSlots = result.slots
                binding.progressSlots.isVisible = false
                buildDayChips()
                renderSlotsForSelectedDay()
            } catch (_: Exception) {
                if (_binding == null) return@launch
                binding.progressSlots.isVisible = false
                binding.tvSlotsPlaceholder.isVisible = true
                binding.tvSlotsPlaceholder.text = getString(R.string.dashboard_load_error)
            }
        }
    }

    private fun buildDayChips() {
        binding.dayChipRow.removeAllViews()
        val days = (0 until 8).map { LocalDate.now().plusDays(it.toLong()) }
        days.forEach { day ->
            val key = StationSlotBuilder.dayKey(day)
            val chip = TextView(requireContext()).apply {
                text = day.format(DateTimeFormatter.ofPattern("EEE d", Locale.getDefault()))
                setPadding(32, 20, 32, 20)
                setBackgroundResource(R.drawable.bg_solar_icon_circle)
                setTextColor(resources.getColor(R.color.dashboard_text, null))
                val selected = (selectedDayKey ?: firstOpenDayKey()) == key
                if (selected) setTypeface(typeface, Typeface.BOLD)
                setOnClickListener {
                    selectedDayKey = key
                    selectedSlot = null
                    buildDayChips()
                    renderSlotsForSelectedDay()
                    binding.btnBookingContinue.isEnabled = false
                }
            }
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { marginEnd = 12 }
            binding.dayChipRow.addView(chip, lp)
        }
        if (selectedDayKey == null) {
            selectedDayKey = firstOpenDayKey() ?: StationSlotBuilder.dayKey(days.first())
        }
    }

    private fun firstOpenDayKey(): String? {
        val station = selectedStation ?: return null
        val now = System.currentTimeMillis()
        return loadedSlots.map { StationSlotBuilder.dayKey(it.startTimeUtc) }.distinct().firstOrNull { dayKey ->
            loadedSlots.any { slot ->
                StationSlotBuilder.dayKey(slot.startTimeUtc) == dayKey &&
                    BookingRules.slotAvailability(slot, station, now).bookable
            }
        }
    }

    private fun renderSlotsForSelectedDay() {
        val station = selectedStation ?: return
        val dayKey = selectedDayKey ?: return
        val now = System.currentTimeMillis()
        binding.slotList.removeAllViews()

        val entries = loadedSlots.filter { StationSlotBuilder.dayKey(it.startTimeUtc) == dayKey }
        if (entries.isEmpty()) {
            binding.slotList.isVisible = false
            binding.tvSlotsPlaceholder.isVisible = true
            binding.tvSlotsPlaceholder.setText(R.string.booking_no_slots_day)
            return
        }

        binding.tvSlotsPlaceholder.isVisible = false
        binding.slotList.isVisible = true
        val inflater = layoutInflater
        entries.forEach { slot ->
            val availability = BookingRules.slotAvailability(slot, station, now)
            val row = ItemBookingSlotRowBinding.inflate(inflater, binding.slotList, false)
            row.tvSlotTime.text = ReservationUi.formatSlotRange(slot.startTimeUtc, slot.endTimeUtc)
            row.tvSlotMeta.text = if (availability.bookable) {
                getString(R.string.booking_spaces_remaining, slot.remainingBookings)
            } else {
                availability.reason ?: getString(R.string.booking_unavailable)
            }
            row.radioSlot.isChecked =
                selectedSlot?.id == slot.id && selectedSlot?.startTimeUtc == slot.startTimeUtc
            row.root.alpha = if (availability.bookable) 1f else 0.5f
            row.root.setOnClickListener {
                if (!availability.bookable) return@setOnClickListener
                selectedSlot = slot
                renderSlotsForSelectedDay()
                binding.btnBookingContinue.isEnabled = true
            }
            binding.slotList.addView(row.root)
        }
    }

    private fun populateSummary() {
        val user = SessionManager(requireContext()).getUserSession()
        val station = selectedStation
        val slot = selectedSlot
        binding.tvSummaryProsumer.text = getString(
            R.string.booking_summary_line,
            getString(R.string.booking_label_prosumer),
            "${user?.name ?: "—"}\nNIC ${user?.nic ?: "—"}"
        )
        binding.tvSummaryStation.text = getString(
            R.string.booking_summary_line,
            getString(R.string.booking_label_station),
            "${station?.name ?: "—"}\n${station?.address ?: ""}"
        )
        binding.tvSummaryDate.text = getString(
            R.string.booking_summary_line,
            getString(R.string.booking_label_date),
            formatLongDate(slot?.startTimeUtc)
        )
        binding.tvSummaryTime.text = getString(
            R.string.booking_summary_line,
            getString(R.string.booking_label_time),
            ReservationUi.formatSlotRange(slot?.startTimeUtc, slot?.endTimeUtc)
        )
        binding.tvSummaryAvailability.text = getString(
            R.string.booking_summary_line,
            getString(R.string.booking_label_availability),
            slot?.let { getString(R.string.booking_spaces_remaining, it.remainingBookings) } ?: "—"
        )
        binding.tvSummaryError.isVisible = false
    }

    private fun confirmBooking() {
        if (submitting) return
        val station = selectedStation ?: return
        val slot = selectedSlot ?: return

        submitting = true
        binding.btnConfirmBooking.isEnabled = false
        binding.tvSummaryError.isVisible = false

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val api = ApiClient.getApiService(requireContext())
                val slotId = StationSlotBuilder.ensureStoredSlotId(api, station.id, slot)
                val response = api.createReservation(
                    CreateReservationRequest(slotId = slotId, stationId = station.id)
                )
                if (_binding == null) return@launch
                submitting = false
                binding.btnConfirmBooking.isEnabled = true
                if (response.isSuccessful) {
                    Toast.makeText(
                        requireContext(),
                        response.body()?.message ?: getString(R.string.booking_success),
                        Toast.LENGTH_LONG
                    ).show()
                    returnToBookingsList()
                } else {
                    binding.tvSummaryError.isVisible = true
                    binding.tvSummaryError.text =
                        response.errorBody()?.string() ?: getString(R.string.booking_failed)
                }
            } catch (e: Exception) {
                if (_binding == null) return@launch
                submitting = false
                binding.btnConfirmBooking.isEnabled = true
                binding.tvSummaryError.isVisible = true
                binding.tvSummaryError.text = e.message ?: getString(R.string.booking_failed)
            }
        }
    }

    private fun monthLabel(): String {
        return LocalDate.now().format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.getDefault()))
    }

    private fun formatLongDate(iso: String?): String {
        val instant = BookingRules.parseInstant(iso) ?: return "—"
        val zoned = instant.atZone(ZoneId.of("Asia/Colombo"))
        return zoned.format(DateTimeFormatter.ofPattern("EEE, MMM d, yyyy", Locale.getDefault()))
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
