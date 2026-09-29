package com.ead.solargrid.ui.home.qr

import android.app.Application
import android.graphics.Bitmap
import android.os.SystemClock
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.ead.solargrid.api.ApiClient
import com.ead.solargrid.qr.QrCodeRenderer
import com.ead.solargrid.qr.QrRepository
import com.ead.solargrid.qr.QrResult
import com.ead.solargrid.qr.QrValidity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant

sealed interface ReservationQrState {
    data object Loading : ReservationQrState

    /** [qrImage] is the only form the payload is kept in, and only in memory. */
    data class Ready(
        val qrImage: Bitmap,
        val validity: QrValidity,
        val validFrom: Instant?
    ) : ReservationQrState

    /** 409 / 400 / 404: not Approved any more, or the slot has ended. */
    data object Inactive : ReservationQrState

    /** 403: signed-in prosumer does not own this reservation. */
    data object NotOwner : ReservationQrState

    data object SessionExpired : ReservationQrState

    data class Error(val isNetwork: Boolean, val serverMessage: String?) : ReservationQrState
}

class ReservationQrViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = QrRepository(ApiClient.getApiService(application))

    private val _state = MutableLiveData<ReservationQrState>()
    val state: LiveData<ReservationQrState> = _state

    private var reservationId: String? = null
    private var loadJob: Job? = null

    /** Loads once per screen instance; a rotation reuses what is already in memory. */
    fun start(id: String) {
        if (reservationId == id && _state.value != null) return
        reservationId = id
        load()
    }

    /** Retry after an error, or "Refresh QR" after expiry: asks the server for a new payload. */
    fun load() {
        val id = reservationId ?: return
        if (loadJob?.isActive == true) return

        loadJob = viewModelScope.launch {
            _state.value = ReservationQrState.Loading
            _state.value = when (val result = repository.getQr(id)) {
                is QrResult.Success -> {
                    val receivedAt = SystemClock.elapsedRealtime()
                    val qr = result.data
                    val validity = QrValidity.from(
                        qr.issuedAtUtc,
                        qr.expiresAtUtc,
                        receivedAt,
                        System.currentTimeMillis()
                    )
                    val payload = qr.payload
                    if (validity == null || payload.isNullOrBlank()) {
                        ReservationQrState.Error(isNetwork = false, serverMessage = null)
                    } else {
                        val image = withContext(Dispatchers.Default) {
                            QrCodeRenderer.render(payload, QR_SIZE_PX)
                        }
                        ReservationQrState.Ready(image, validity, QrValidity.parseUtc(qr.validFromUtc))
                    }
                }
                QrResult.NetworkError -> ReservationQrState.Error(isNetwork = true, serverMessage = null)
                is QrResult.HttpError -> when (result.code) {
                    401 -> ReservationQrState.SessionExpired
                    403 -> ReservationQrState.NotOwner
                    400, 404, 409 -> ReservationQrState.Inactive
                    else -> ReservationQrState.Error(isNetwork = false, serverMessage = result.serverMessage)
                }
            }
        }
    }

    /** Drops the QR image as soon as the screen is left. */
    fun clear() {
        loadJob?.cancel()
        _state.value = ReservationQrState.Loading
    }

    override fun onCleared() {
        loadJob?.cancel()
        _state.value = ReservationQrState.Loading
    }

    private companion object {
        const val QR_SIZE_PX = 720
    }
}
