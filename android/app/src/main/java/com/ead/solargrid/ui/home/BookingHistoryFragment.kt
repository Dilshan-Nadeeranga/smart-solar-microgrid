package com.ead.solargrid.ui.home

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.ead.solargrid.R
import com.ead.solargrid.api.ApiClient
import com.ead.solargrid.databinding.FragmentProsumerHistoryBinding
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

class BookingHistoryFragment : Fragment() {

    private var _binding: FragmentProsumerHistoryBinding? = null
    private val binding get() = _binding!!

    private val historyStatuses = setOf("Completed", "Cancelled", "Rejected")

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentProsumerHistoryBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onResume() {
        super.onResume()
        loadHistory()
    }

    private fun loadHistory() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val api = ApiClient.getApiService(requireContext())
                val all = api.getMyReservations(pageSize = 50).body()?.items.orEmpty()
                val items = all.filter { it.status in historyStatuses }

                if (_binding == null) return@launch
                binding.historyList.removeAllViews()
                if (items.isEmpty()) {
                    binding.tvHistoryEmpty.visibility = View.VISIBLE
                    binding.tvHistoryEmpty.setText(R.string.history_empty)
                } else {
                    binding.tvHistoryEmpty.visibility = View.GONE
                    val inflater = layoutInflater
                    items.forEach { item ->
                        ReservationUi.addBookingRow(binding.historyList, inflater, item)
                    }
                }
            } catch (_: Exception) {
                if (_binding == null) return@launch
                binding.tvHistoryEmpty.visibility = View.VISIBLE
                binding.tvHistoryEmpty.text = getString(R.string.dashboard_load_error)
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
