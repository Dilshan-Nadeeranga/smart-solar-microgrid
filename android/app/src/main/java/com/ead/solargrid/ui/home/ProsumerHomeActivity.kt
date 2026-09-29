package com.ead.solargrid.ui.home

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.ead.solargrid.R
import com.ead.solargrid.databinding.ActivityProsumerHomeBinding

class ProsumerHomeActivity : AppCompatActivity(), ProsumerNavigator {

    companion object {
        private const val KEY_SELECTED_TAB = "selected_tab"
    }

    private lateinit var binding: ActivityProsumerHomeBinding
    private var ignoreBottomNavSelection = false

    private val dashboardFragment = ProsumerDashboardFragment()
    private val mapFragment = StationsMapFragment()
    private val bookingsFragment = MyReservationsFragment()
    private val historyFragment = BookingHistoryFragment()
    private val profileFragment = ProfileFragment()
    private var pendingNewBooking = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProsumerHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val tabId = savedInstanceState?.getInt(KEY_SELECTED_TAB) ?: R.id.nav_home

        ignoreBottomNavSelection = true
        binding.bottomNav.setOnItemSelectedListener { item ->
            if (ignoreBottomNavSelection) {
                return@setOnItemSelectedListener true
            }
            showFragmentForTab(item.itemId)
            true
        }

        if (supportFragmentManager.findFragmentById(R.id.fragmentContainer) == null) {
            showFragmentForTab(tabId)
        }
        binding.bottomNav.selectedItemId = tabId
        ignoreBottomNavSelection = false
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        if (::binding.isInitialized) {
            outState.putInt(KEY_SELECTED_TAB, binding.bottomNav.selectedItemId)
        }
    }

    private fun showFragmentForTab(tabId: Int) {
        val fragment = when (tabId) {
            R.id.nav_map -> mapFragment
            R.id.nav_bookings -> bookingsFragment
            R.id.nav_history -> historyFragment
            R.id.nav_profile -> profileFragment
            else -> dashboardFragment
        }
        showFragment(fragment)
    }

    override fun openBookingsTab() {
        binding.bottomNav.selectedItemId = R.id.nav_bookings
    }

    override fun openNewBookingFlow() {
        pendingNewBooking = true
        openBookingsTab()
    }

    fun consumePendingNewBooking(): Boolean {
        if (!pendingNewBooking) return false
        pendingNewBooking = false
        return true
    }

    override fun showNearbyStationsMessage() {
        binding.bottomNav.selectedItemId = R.id.nav_map
    }

    private fun showFragment(fragment: Fragment) {
        val current = supportFragmentManager.findFragmentById(R.id.fragmentContainer)
        if (current === fragment) {
            return
        }
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment)
            .commit()
    }
}
