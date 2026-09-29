package com.ead.solargrid.ui.operator.scan

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.ead.solargrid.api.ApiClient
import com.ead.solargrid.qr.QrFailure
import com.ead.solargrid.qr.QrRepository
import com.ead.solargrid.qr.QrResult
import kotlinx.coroutines.launch

/** What the Confirm screen needs from a successful verify. Holds no QR payload. */
data class VerifiedReservation(
    val reservationId: String,
    val stationName: String?,
    val prosumerNic: String?,
    val prosumerName: String?,
    val slotStartUtc: String?,
    val slotEndUtc: String?
)

sealed interface ScanState {
    data object Scanning : ScanState
    data object Verifying : ScanState

    /** One-shot: the screen opens Confirm, then calls [ScanQrViewModel.onConfirmationOpened]. */
    data class Verified(val reservation: VerifiedReservation) : ScanState

    /** Confirm screen is on top; the camera stays off. */
    data object AwaitingConfirmation : ScanState

    data class Failed(val failure: QrFailure, val serverMessage: String?) : ScanState
}

class ScanQrViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = QrRepository(ApiClient.getApiService(application))

    private val _state = MutableLiveData<ScanState>(ScanState.Scanning)
    val state: LiveData<ScanState> = _state

    /**
     * Verifies a decoded QR string. Ignored unless the scanner is live, so a second frame of the
     * same code cannot start a second request. The payload is only a local here: it is sent once
     * and never stored.
     */
    fun onQrDecoded(payload: String) {
        if (_state.value != ScanState.Scanning) return
        _state.value = ScanState.Verifying

        viewModelScope.launch {
            val result = repository.verify(payload)
            val reservation = (result as? QrResult.Success)?.data?.reservation
            _state.value = when {
                result is QrResult.Success && reservation != null -> {
                    val body = result.data
                    ScanState.Verified(
                        VerifiedReservation(
                            reservationId = reservation.id,
                            stationName = reservation.stationName,
                            prosumerNic = body.prosumer?.nic ?: reservation.prosumerId,
                            prosumerName = body.prosumer?.name,
                            slotStartUtc = reservation.slotStartTimeUtc,
                            slotEndUtc = reservation.slotEndTimeUtc
                        )
                    )
                }
                else -> ScanState.Failed(QrFailure.from(result), (result as? QrResult.HttpError)?.serverMessage)
            }
        }
    }

    fun onConfirmationOpened() {
        if (_state.value is ScanState.Verified) _state.value = ScanState.AwaitingConfirmation
    }

    /** "Scan again" after an error, or back from the Confirm screen. */
    fun resumeScanning() {
        if (_state.value != ScanState.Verifying) _state.value = ScanState.Scanning
    }
}
