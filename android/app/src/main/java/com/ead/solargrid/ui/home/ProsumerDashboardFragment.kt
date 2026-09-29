package com.ead.solargrid.ui.home

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.ead.solargrid.R
import com.ead.solargrid.api.ApiClient
import com.ead.solargrid.database.SessionManager
import com.ead.solargrid.databinding.FragmentProsumerDashboardBinding
import com.ead.solargrid.models.ReservationItem
import com.ead.solargrid.ui.home.qr.ReservationQrActivity
import com.ead.solargrid.ui.home.upcoming.UpcomingBookings
import com.ead.solargrid.ui.home.upcoming.UpcomingBookingsActivity
import kotlinx.coroutines.launch

class ProsumerDashboardFragment : Fragment() {

    private var _binding: FragmentProsumerDashboardBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentProsumerDashboardBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val session = SessionManager(requireContext())
        val user = session.getUserSession()
        val firstName = user?.name
            ?.trim()
            ?.substringBefore(' ')
            ?.ifBlank { user.name }
            ?: "Prosumer"

        binding.tvGreeting.text = getString(R.string.dashboard_greeting_wave, firstName)

        binding.cardPending.tvSummaryLabel.setText(R.string.dashboard_pending_reservations)
        binding.cardPending.tvSummaryValue.text = "0"
        binding.cardApproved.tvSummaryLabel.setText(R.string.dashboard_approved_upcoming)
        binding.cardApproved.tvSummaryValue.text = "0"
        binding.cardNearby.tvSummaryLabel.setText(R.string.dashboard_nearby_slots)
        binding.cardNearby.tvSummaryValue.text = "0"

        binding.cardApproved.root.setOnClickListener {
            startActivity(UpcomingBookingsActivity.newIntent(requireContext()))
        }
        updateApprovedCardDescription()

        binding.btnReserveSlot.setOnClickListener {
            (activity as? ProsumerNavigator)?.openNewBookingFlow()
        }
        binding.btnNearbyStations.setOnClickListener {
            (activity as? ProsumerNavigator)?.showNearbyStationsMessage()
        }
        binding.btnNotifications.setOnClickListener {
            Toast.makeText(requireContext(), R.string.coming_soon, Toast.LENGTH_SHORT).show()
        }
    }

    override fun onResume() {
        super.onResume()
        loadDashboard()
    }

    private fun loadDashboard() {
        val inflater = layoutInflater
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val api = ApiClient.getApiService(requireContext())
                val summary = api.getReservationSummary()
                if (_binding == null) return@launch
                if (summary.isSuccessful) {
                    summary.body()?.let { body ->
                        binding.cardPending.tvSummaryValue.text = body.pendingCount.toString()
                        binding.cardApproved.tvSummaryValue.text = body.approvedFutureCount.toString()
                        updateApprovedCardDescription()
                    }
                }

                val stations = api.getStations()
                if (_binding == null) return@launch
                if (stations.isSuccessful) {
                    val count = stations.body()?.count { it.isActive } ?: 0
                    binding.cardNearby.tvSummaryValue.text = count.toString()
                }

                // Same rule as the Upcoming bookings page: Approved, slot not ended, soonest first.
                val now = System.currentTimeMillis()
                val items = UpcomingBookings.load(api, now)
                if (_binding == null) return@launch
                binding.upcomingList.removeAllViews()
                if (items.isEmpty()) {
                    binding.tvUpcomingEmpty.visibility = View.VISIBLE
                    binding.tvUpcomingEmpty.setText(R.string.dashboard_upcoming_empty)
                } else {
                    binding.tvUpcomingEmpty.visibility = View.GONE
                    items.take(3).forEach { item ->
                        ReservationUi.addBookingRow(
                            binding.upcomingList,
                            inflater,
                            item,
                            onClick = ::openQr,
                            statusLabel = if (UpcomingBookings.isInProgress(item, now)) {
                                getString(R.string.upcoming_in_progress)
                            } else {
                                null
                            }
                        )
                    }
                }
            } catch (_: Exception) {
                if (_binding == null) return@launch
                binding.tvUpcomingEmpty.visibility = View.VISIBLE
                binding.tvUpcomingEmpty.text = getString(R.string.dashboard_load_error)
            }
        }
    }

    private fun updateApprovedCardDescription() {
        binding.cardApproved.root.contentDescription = getString(
            R.string.upcoming_card_description,
            getString(R.string.dashboard_approved_upcoming),
            binding.cardApproved.tvSummaryValue.text
        )
    }

    private fun openQr(item: ReservationItem) {
        startActivity(ReservationQrActivity.newIntent(requireContext(), item))
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
