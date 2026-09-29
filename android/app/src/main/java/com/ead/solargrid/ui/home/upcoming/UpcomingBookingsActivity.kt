package com.ead.solargrid.ui.home.upcoming

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import androidx.core.view.updatePadding
import androidx.lifecycle.lifecycleScope
import com.ead.solargrid.R
import com.ead.solargrid.api.ApiClient
import com.ead.solargrid.databinding.ActivityUpcomingBookingsBinding
import com.ead.solargrid.models.ReservationItem
import com.ead.solargrid.ui.home.ReservationUi
import com.ead.solargrid.ui.home.qr.ReservationQrActivity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/**
 * Prosumer: every Approved booking whose slot has not ended, soonest first.
 * Opened from the dashboard's "Approved (upcoming)" card; each row opens its QR code.
 */
class UpcomingBookingsActivity : AppCompatActivity() {

    companion object {
        fun newIntent(context: Context) = Intent(context, UpcomingBookingsActivity::class.java)
    }

    private lateinit var binding: ActivityUpcomingBookingsBinding
    private var loadJob: Job? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityUpcomingBookingsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        applyInsets()

        binding.btnBack.setOnClickListener { finish() }
        binding.btnRetry.setOnClickListener { load() }
    }

    /** Reloads on every return, e.g. after viewing a QR, so the list never goes stale. */
    override fun onResume() {
        super.onResume()
        load()
    }

    /** targetSdk 35 is edge-to-edge on Android 15, so pad for the system bars on every version. */
    private fun applyInsets() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            view.updatePadding(left = bars.left, top = bars.top, right = bars.right, bottom = bars.bottom)
            insets
        }
    }

    private fun load() {
        if (loadJob?.isActive == true) return
        // Keep the current rows visible during a background refresh; show the spinner only when empty.
        binding.progress.isVisible = binding.bookingList.childCount == 0
        binding.messageGroup.isVisible = false

        loadJob = lifecycleScope.launch {
            try {
                val now = System.currentTimeMillis()
                val items = UpcomingBookings.load(ApiClient.getApiService(this@UpcomingBookingsActivity), now)
                render(items, now)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                showError()
            }
        }
    }

    private fun render(items: List<ReservationItem>, now: Long) {
        binding.progress.isVisible = false
        binding.bookingList.removeAllViews()

        binding.tvCount.isVisible = items.isNotEmpty()
        binding.tvCount.text = resources.getQuantityString(R.plurals.upcoming_count, items.size, items.size)

        if (items.isEmpty()) {
            showMessage(getString(R.string.dashboard_upcoming_empty), retry = false)
            return
        }
        binding.messageGroup.isVisible = false
        items.forEach { item ->
            ReservationUi.addBookingRow(
                binding.bookingList,
                layoutInflater,
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

    private fun showError() {
        binding.progress.isVisible = false
        // A failed refresh keeps the rows already on screen.
        if (binding.bookingList.childCount == 0) {
            showMessage(getString(R.string.dashboard_load_error), retry = true)
        }
    }

    private fun showMessage(message: String, retry: Boolean) {
        binding.messageGroup.isVisible = true
        binding.tvMessage.text = message
        binding.btnRetry.isVisible = retry
    }

    private fun openQr(item: ReservationItem) {
        startActivity(ReservationQrActivity.newIntent(this, item))
    }
}
