package com.ead.solargrid.ui.home

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.ead.solargrid.R
import com.ead.solargrid.api.ApiClient
import com.ead.solargrid.databinding.FragmentProsumerBookingsBinding
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

class MyReservationsFragment : Fragment() {

    private var _binding: FragmentProsumerBookingsBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentProsumerBookingsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onResume() {
        super.onResume()
        loadBookings()
    }

    private fun loadBookings() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val api = ApiClient.getApiService(requireContext())
                val pending = api.getMyReservations(status = "Pending", pageSize = 20).body()?.items.orEmpty()
                val approved = api.getMyReservations(status = "Approved", pageSize = 20).body()?.items.orEmpty()
                val items = pending + approved

                if (_binding == null) return@launch
                binding.bookingsList.removeAllViews()
                if (items.isEmpty()) {
                    binding.tvBookingsEmpty.visibility = View.VISIBLE
                    binding.tvBookingsEmpty.setText(R.string.bookings_empty)
                } else {
                    binding.tvBookingsEmpty.visibility = View.GONE
                    val inflater = layoutInflater
                    items.forEach { item ->
                        ReservationUi.addBookingRow(binding.bookingsList, inflater, item)
                    }
                }
            } catch (_: Exception) {
                if (_binding == null) return@launch
                binding.tvBookingsEmpty.visibility = View.VISIBLE
                binding.tvBookingsEmpty.text = getString(R.string.dashboard_load_error)
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
