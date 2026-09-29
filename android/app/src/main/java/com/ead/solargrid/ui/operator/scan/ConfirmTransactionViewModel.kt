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

sealed interface ConfirmState {
    data object Idle : ConfirmState
    data object Completing : ConfirmState
    data object Completed : ConfirmState
    data class Failed(val failure: QrFailure, val serverMessage: String?) : ConfirmState {
        /** Worth another tap only when the server never answered or answered unexpectedly. */
        val canRetry get() = failure == QrFailure.NETWORK || failure == QrFailure.OTHER
    }
}

class ConfirmTransactionViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = QrRepository(ApiClient.getApiService(application))

    private val _state = MutableLiveData<ConfirmState>(ConfirmState.Idle)
    val state: LiveData<ConfirmState> = _state

    /** Sends at most one complete request at a time, and none once the transfer is recorded. */
    fun complete(reservationId: String) {
        when (val current = _state.value) {
            ConfirmState.Completing, ConfirmState.Completed -> return
            is ConfirmState.Failed -> if (!current.canRetry) return
            else -> Unit
        }
        _state.value = ConfirmState.Completing

        viewModelScope.launch {
            _state.value = when (val result = repository.complete(reservationId)) {
                is QrResult.Success -> ConfirmState.Completed
                else -> ConfirmState.Failed(QrFailure.from(result), (result as? QrResult.HttpError)?.serverMessage)
            }
        }
    }
}
