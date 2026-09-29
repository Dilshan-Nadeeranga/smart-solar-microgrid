package com.ead.solargrid.ui.home.qr

import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.content.Context
import android.content.Intent
import android.graphics.RenderEffect
import android.graphics.Shader
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import androidx.core.view.updatePadding
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.ead.solargrid.R
import com.ead.solargrid.database.SessionManager
import com.ead.solargrid.databinding.ActivityReservationQrBinding
import com.ead.solargrid.models.ReservationItem
import com.ead.solargrid.qr.QrValidity
import com.ead.solargrid.ui.auth.LoginActivity
import com.ead.solargrid.ui.home.ReservationUi
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.Instant

/**
 * Prosumer: shows the signed QR code for one Approved reservation, with a countdown to its
 * server-set expiry. The payload lives only in the ViewModel's memory (as the rendered image)
 * and is dropped when the screen is left. FLAG_SECURE keeps it out of screenshots and Recents.
 */
class ReservationQrActivity : AppCompatActivity() {

    companion object {
        private const val EXTRA_RESERVATION_ID = "reservation_id"
        private const val EXTRA_STATION_NAME = "station_name"
        private const val EXTRA_SLOT_START = "slot_start"
        private const val EXTRA_SLOT_END = "slot_end"
        private const val BLUR_RADIUS = 18f

        fun newIntent(context: Context, item: ReservationItem): Intent =
            Intent(context, ReservationQrActivity::class.java)
                .putExtra(EXTRA_RESERVATION_ID, item.id)
                .putExtra(EXTRA_STATION_NAME, item.stationName ?: item.stationId)
                .putExtra(EXTRA_SLOT_START, item.slotStartTimeUtc)
                .putExtra(EXTRA_SLOT_END, item.slotEndTimeUtc)
    }

    private lateinit var binding: ActivityReservationQrBinding
    private lateinit var viewModel: ReservationQrViewModel
    private val skeletonPulse by lazy {
        ObjectAnimator.ofFloat(binding.qrSkeleton, View.ALPHA, 1f, 0.45f).apply {
            duration = 700
            repeatMode = ValueAnimator.REVERSE
            repeatCount = ValueAnimator.INFINITE
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)

        val reservationId = intent.getStringExtra(EXTRA_RESERVATION_ID)
        if (reservationId.isNullOrBlank()) {
            finish()
            return
        }

        binding = ActivityReservationQrBinding.inflate(layoutInflater)
        setContentView(binding.root)
        applyInsets()

        binding.tvStation.text = intent.getStringExtra(EXTRA_STATION_NAME).orEmpty()
        binding.tvSlot.text = ReservationUi.formatSlotRange(
            intent.getStringExtra(EXTRA_SLOT_START),
            intent.getStringExtra(EXTRA_SLOT_END)
        )

        binding.btnBack.setOnClickListener { finish() }
        viewModel = ViewModelProvider(this)[ReservationQrViewModel::class.java]
        binding.btnRefresh.setOnClickListener { viewModel.load() }
        binding.btnRetry.setOnClickListener { viewModel.load() }

        viewModel.state.observe(this, ::render)
        viewModel.start(reservationId)

        // Tick the countdown once a second while visible.
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                while (true) {
                    renderCountdown()
                    delay(1_000L - SystemClock.elapsedRealtime() % 1_000L)
                }
            }
        }
    }

    override fun onDestroy() {
        if (::binding.isInitialized) skeletonPulse.cancel()
        if (isFinishing && ::binding.isInitialized) {
            binding.ivQr.setImageDrawable(null)
            viewModel.clear()
        }
        super.onDestroy()
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

    private fun render(state: ReservationQrState) {
        val ready = state as? ReservationQrState.Ready
        val showQrCard = state is ReservationQrState.Loading || ready != null

        binding.qrCard.isVisible = showQrCard
        binding.messageCard.isVisible = !showQrCard

        binding.qrSkeleton.isVisible = state is ReservationQrState.Loading
        binding.ivQr.isVisible = ready != null
        binding.ivQr.setImageBitmap(ready?.qrImage)

        if (state is ReservationQrState.Loading) {
            binding.expiredOverlay.isVisible = false
            setQrDimmed(false)
            binding.tvCountdown.isVisible = true
            binding.tvCountdown.text = getString(R.string.qr_loading)
            binding.tvStatusLine.isVisible = true
            binding.tvValidFrom.isVisible = false
            skeletonPulse.start()
        } else {
            skeletonPulse.cancel()
            binding.qrSkeleton.alpha = 1f
        }

        if (ready != null) {
            renderValidFrom(ready.validFrom)
            renderCountdown()
        }

        when (state) {
            ReservationQrState.Inactive -> showMessage(
                R.string.qr_inactive_title, getString(R.string.qr_inactive_message), retry = false
            )
            ReservationQrState.NotOwner -> showMessage(
                R.string.qr_forbidden_title, getString(R.string.qr_forbidden_message), retry = false
            )
            is ReservationQrState.Error -> if (state.isNetwork) {
                showMessage(R.string.qr_network_title, getString(R.string.qr_network_message), retry = true)
            } else {
                showMessage(
                    R.string.qr_error_title,
                    state.serverMessage ?: getString(R.string.qr_error_other),
                    retry = true
                )
            }
            ReservationQrState.SessionExpired -> {
                Toast.makeText(this, R.string.qr_session_expired, Toast.LENGTH_LONG).show()
                SessionManager(this).logout()
                startActivity(
                    Intent(this, LoginActivity::class.java)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                )
                finish()
            }
            else -> Unit
        }
    }

    private fun showMessage(title: Int, body: String, retry: Boolean) {
        binding.tvMessageTitle.setText(title)
        binding.tvMessageBody.text = body
        binding.btnRetry.isVisible = retry
    }

    private fun renderValidFrom(validFrom: Instant?) {
        // Only worth mentioning while the scan window has not opened yet.
        val show = validFrom != null && validFrom.isAfter(Instant.now())
        binding.tvValidFrom.isVisible = show
        if (show) {
            binding.tvValidFrom.text = getString(R.string.qr_scannable_from, ReservationUi.formatDateTime(validFrom))
        }
    }

    private fun renderCountdown() {
        if (!::binding.isInitialized) return
        val ready = viewModel.state.value as? ReservationQrState.Ready ?: return
        val now = SystemClock.elapsedRealtime()
        val expired = ready.validity.isExpired(now)

        binding.expiredOverlay.isVisible = expired
        setQrDimmed(expired)
        binding.tvCountdown.isVisible = !expired
        binding.tvStatusLine.isVisible = !expired
        if (!expired) {
            binding.tvCountdown.text = getString(
                R.string.qr_valid_for,
                QrValidity.format(ready.validity.remainingMs(now))
            )
        } else {
            binding.tvValidFrom.isVisible = false
        }
    }

    private fun setQrDimmed(dimmed: Boolean) {
        val qr = binding.ivQr
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            qr.setRenderEffect(
                if (dimmed) RenderEffect.createBlurEffect(BLUR_RADIUS, BLUR_RADIUS, Shader.TileMode.CLAMP) else null
            )
        }
        qr.alpha = if (dimmed) 0.25f else 1f
    }
}
