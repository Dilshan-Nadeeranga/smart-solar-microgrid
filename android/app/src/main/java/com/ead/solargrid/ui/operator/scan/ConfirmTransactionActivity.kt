package com.ead.solargrid.ui.operator.scan

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isInvisible
import androidx.core.view.isVisible
import androidx.core.view.updatePadding
import androidx.lifecycle.ViewModelProvider
import com.ead.solargrid.R
import com.ead.solargrid.database.SessionManager
import com.ead.solargrid.databinding.ActivityConfirmTransactionBinding
import com.ead.solargrid.qr.QrFailure
import com.ead.solargrid.ui.auth.LoginActivity
import com.ead.solargrid.ui.home.ReservationUi

/**
 * Grid Operator: shows a verified reservation and records the energy transfer.
 * Result: [Activity.RESULT_OK] to scan the next code, [RESULT_GO_HOME] to leave the scanner,
 * [Activity.RESULT_CANCELED] (cancel / back) to scan again without completing.
 */
class ConfirmTransactionActivity : AppCompatActivity() {

    companion object {
        const val RESULT_GO_HOME = Activity.RESULT_FIRST_USER

        private const val EXTRA_RESERVATION_ID = "reservation_id"
        private const val EXTRA_STATION_NAME = "station_name"
        private const val EXTRA_PROSUMER_NIC = "prosumer_nic"
        private const val EXTRA_PROSUMER_NAME = "prosumer_name"
        private const val EXTRA_SLOT_START = "slot_start"
        private const val EXTRA_SLOT_END = "slot_end"

        fun newIntent(context: Context, reservation: VerifiedReservation): Intent =
            Intent(context, ConfirmTransactionActivity::class.java)
                .putExtra(EXTRA_RESERVATION_ID, reservation.reservationId)
                .putExtra(EXTRA_STATION_NAME, reservation.stationName)
                .putExtra(EXTRA_PROSUMER_NIC, reservation.prosumerNic)
                .putExtra(EXTRA_PROSUMER_NAME, reservation.prosumerName)
                .putExtra(EXTRA_SLOT_START, reservation.slotStartUtc)
                .putExtra(EXTRA_SLOT_END, reservation.slotEndUtc)
    }

    private lateinit var binding: ActivityConfirmTransactionBinding
    private lateinit var viewModel: ConfirmTransactionViewModel
    private lateinit var reservationId: String

    /** While the complete call is in flight, back is ignored so the outcome is always shown. */
    private val blockBackWhileCompleting = object : OnBackPressedCallback(false) {
        override fun handleOnBackPressed() = Unit
    }

    /** After success, back behaves like "Scan next". */
    private val backAfterSuccess = object : OnBackPressedCallback(false) {
        override fun handleOnBackPressed() = finishWith(RESULT_OK)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val id = intent.getStringExtra(EXTRA_RESERVATION_ID)
        if (id.isNullOrBlank()) {
            finish()
            return
        }
        reservationId = id

        binding = ActivityConfirmTransactionBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setUpWindowInsets()
        bindDetails()

        onBackPressedDispatcher.addCallback(this, backAfterSuccess)
        onBackPressedDispatcher.addCallback(this, blockBackWhileCompleting)
        binding.btnBack.setOnClickListener { onBackPressedDispatcher.onBackPressed() }

        viewModel = ViewModelProvider(this)[ConfirmTransactionViewModel::class.java]
        viewModel.state.observe(this, ::render)
    }

    private fun setUpWindowInsets() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowCompat.getInsetsController(window, binding.root).apply {
            isAppearanceLightStatusBars = true
            isAppearanceLightNavigationBars = true
        }
        val topBar = binding.topBar
        val actions = binding.actions
        val baseTop = topBar.paddingTop
        val baseBottom = actions.paddingBottom
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            view.updatePadding(left = bars.left, right = bars.right)
            topBar.updatePadding(top = baseTop + bars.top)
            actions.updatePadding(bottom = baseBottom + bars.bottom)
            insets
        }
    }

    private fun bindDetails() {
        val station = intent.getStringExtra(EXTRA_STATION_NAME)?.takeIf { it.isNotBlank() }
            ?: getString(R.string.operator_value_placeholder)
        val nic = intent.getStringExtra(EXTRA_PROSUMER_NIC)?.takeIf { it.isNotBlank() }
            ?: getString(R.string.operator_value_placeholder)
        val name = intent.getStringExtra(EXTRA_PROSUMER_NAME)?.takeIf { it.isNotBlank() }
        val slot = ReservationUi.formatSlotRange(
            intent.getStringExtra(EXTRA_SLOT_START),
            intent.getStringExtra(EXTRA_SLOT_END)
        )

        binding.tvStation.text = station
        binding.tvProsumer.text =
            if (name != null) getString(R.string.confirm_prosumer_value, name, nic) else getString(R.string.confirm_prosumer_nic_only, nic)
        binding.tvSlot.text = slot
        binding.tvReservationId.text = reservationId
        binding.tvSuccessDetail.text = getString(R.string.confirm_done_detail, station, slot)
    }

    private fun render(state: ConfirmState) {
        val completing = state is ConfirmState.Completing
        val completed = state is ConfirmState.Completed
        val failed = state as? ConfirmState.Failed

        if (failed?.failure == QrFailure.SESSION_EXPIRED) {
            sessionExpired()
            return
        }

        blockBackWhileCompleting.isEnabled = completing
        backAfterSuccess.isEnabled = completed
        binding.btnBack.isEnabled = !completing
        binding.progress.isInvisible = !completing

        binding.reviewGroup.isVisible = !completed
        binding.successGroup.isVisible = completed
        binding.tvTitle.setText(if (completed) R.string.confirm_done_title else R.string.confirm_title)

        binding.errorCard.isVisible = failed != null
        if (failed != null) {
            binding.tvError.text = QrFailureText.forComplete(this, failed.failure, failed.serverMessage)
        }

        when {
            completed -> {
                binding.btnPrimary.isEnabled = true
                binding.btnPrimary.setText(R.string.confirm_scan_next)
                binding.btnPrimary.setOnClickListener { finishWith(RESULT_OK) }
                binding.btnSecondary.isEnabled = true
                binding.btnSecondary.setText(R.string.confirm_back_home)
                binding.btnSecondary.setOnClickListener { finishWith(RESULT_GO_HOME) }
            }
            failed != null && !failed.canRetry -> {
                // e.g. someone else completed it meanwhile: nothing left to do here but move on.
                binding.btnPrimary.isEnabled = true
                binding.btnPrimary.setText(R.string.confirm_scan_next)
                binding.btnPrimary.setOnClickListener { finishWith(RESULT_OK) }
                binding.btnSecondary.isEnabled = true
                binding.btnSecondary.setText(R.string.confirm_back_home)
                binding.btnSecondary.setOnClickListener { finishWith(RESULT_GO_HOME) }
            }
            else -> {
                // Idle, in flight, or a retryable failure.
                binding.btnPrimary.isEnabled = !completing
                binding.btnPrimary.setText(if (completing) R.string.confirm_completing else R.string.confirm_complete)
                binding.btnPrimary.setOnClickListener { viewModel.complete(reservationId) }
                binding.btnSecondary.isEnabled = !completing
                binding.btnSecondary.setText(R.string.confirm_cancel)
                binding.btnSecondary.setOnClickListener { finishWith(RESULT_CANCELED) }
            }
        }
    }

    private fun finishWith(resultCode: Int) {
        setResult(resultCode)
        finish()
    }

    private fun sessionExpired() {
        Toast.makeText(this, R.string.operator_session_expired, Toast.LENGTH_LONG).show()
        SessionManager(this).logout()
        startActivity(
            Intent(this, LoginActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        )
        finish()
    }
}
