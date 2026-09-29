package com.ead.solargrid.ui.home

import android.os.Bundle
import android.widget.Toast
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
    private val bookingsFragment = MyReservationsFragment()
    private val historyFragment = BookingHistoryFragment()
    private val profileFragment = ProfileFragment()

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

    override fun showNearbyStationsMessage() {
        Toast.makeText(this, R.string.dashboard_nearby_coming, Toast.LENGTH_SHORT).show()
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
