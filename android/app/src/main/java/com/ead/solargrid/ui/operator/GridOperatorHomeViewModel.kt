package com.ead.solargrid.ui.operator

import android.app.Application
import android.os.SystemClock
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.ead.solargrid.api.ApiClient
import com.ead.solargrid.models.ReservationSummaryResponse
import com.ead.solargrid.models.SolarStation
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import org.json.JSONObject
import retrofit2.Response
import java.time.LocalDate
import java.time.ZoneOffset

data class InfrastructureTotals(
    val stations: Int,
    val capacityKw: Double,
    val batterySlots: Int
)

/**
 * Everything the Grid Operator home shows. A value stays null until it has loaded once;
 * a failed refresh keeps the last good value and reports errorMessage instead.
 */
data class OperatorHomeState(
    val isLoading: Boolean = false,
    val summary: ReservationSummaryResponse? = null,
    val reservationsToday: Long? = null,
    val completedToday: Long? = null,
    val infrastructure: InfrastructureTotals? = null,
    val errorMessage: String? = null,
    val sessionExpired: Boolean = false,
    /** Wall-clock time of the last fully successful refresh, for the "Updated" label. */
    val updatedAtMillis: Long? = null
)

class GridOperatorHomeViewModel(application: Application) : AndroidViewModel(application) {

    private sealed interface ApiResult<out T> {
        data class Success<T>(val data: T) : ApiResult<T>
        data class Failure(val code: Int?, val message: String) : ApiResult<Nothing>
    }

    private val api = ApiClient.getApiService(application)

    private val _state = MutableLiveData(OperatorHomeState())
    val state: LiveData<OperatorHomeState> = _state

    private var loadJob: Job? = null
    private var lastLoadedElapsed = 0L

    /** Called from onResume, so returning to the screen refreshes old numbers without spamming the API. */
    fun refreshIfStale() {
        if (lastLoadedElapsed == 0L || SystemClock.elapsedRealtime() - lastLoadedElapsed > STALE_AFTER_MS) {
            refresh()
        }
    }

    fun refresh() {
        if (loadJob?.isActive == true) return

        loadJob = viewModelScope.launch {
            _state.value = currentState().copy(isLoading = true)

            // "Today" is the UTC day of the slot start, which is what the API filters on (same as the web dashboard).
            val todayUtc = LocalDate.now(ZoneOffset.UTC).toString()

            val summaryCall = async { call { api.getReservationSummary() } }
            val todayCall = async { call { api.getReservations(dateUtc = todayUtc, page = 1, pageSize = 1) } }
            val completedCall = async {
                call { api.getReservations(status = STATUS_COMPLETED, dateUtc = todayUtc, page = 1, pageSize = 1) }
            }
            val stationsCall = async { call { api.getStations() } }

            val summary = summaryCall.await()
            val today = todayCall.await()
            val completed = completedCall.await()
            val stations = stationsCall.await()

            val failures = listOf(summary, today, completed, stations).filterIsInstance<ApiResult.Failure>()
            val previous = currentState()

            if (failures.isEmpty()) {
                lastLoadedElapsed = SystemClock.elapsedRealtime()
            }

            _state.value = previous.copy(
                isLoading = false,
                summary = summary.dataOr(previous.summary),
                reservationsToday = today.dataOr(null)?.totalCount ?: previous.reservationsToday,
                completedToday = completed.dataOr(null)?.totalCount ?: previous.completedToday,
                infrastructure = stations.dataOr(null)?.let(::totals) ?: previous.infrastructure,
                errorMessage = failures.firstOrNull()?.message,
                sessionExpired = failures.any { it.code == HTTP_UNAUTHORIZED },
                updatedAtMillis = if (failures.isEmpty()) System.currentTimeMillis() else previous.updatedAtMillis
            )
        }
    }

    private fun currentState() = _state.value ?: OperatorHomeState()

    private fun totals(stations: List<SolarStation>) = InfrastructureTotals(
        stations = stations.size,
        capacityKw = stations.sumOf { it.capacityKw },
        batterySlots = stations.sumOf { it.batteryStorageSlots }
    )

    private fun <T> ApiResult<T>.dataOr(fallback: T?): T? =
        if (this is ApiResult.Success) data else fallback

    private suspend fun <T> call(request: suspend () -> Response<T>): ApiResult<T> {
        return try {
            val response = request()
            val body = response.body()
            if (response.isSuccessful && body != null) {
                ApiResult.Success(body)
            } else {
                ApiResult.Failure(response.code(), errorMessage(response))
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            ApiResult.Failure(null, "Can't reach the server. Check your connection and try again.")
        }
    }

    private fun errorMessage(response: Response<*>): String {
        val fromServer = try {
            response.errorBody()?.string()?.let { JSONObject(it).optString("message") }
        } catch (e: Exception) {
            null
        }
        return when {
            !fromServer.isNullOrBlank() -> fromServer
            response.code() == HTTP_UNAUTHORIZED -> "Your session has expired. Please log in again."
            response.code() == HTTP_FORBIDDEN -> "You don't have permission to view this information."
            else -> "Something went wrong (${response.code()}). Please try again."
        }
    }

    companion object {
        private const val STALE_AFTER_MS = 30_000L
        private const val STATUS_COMPLETED = "Completed"
        private const val HTTP_UNAUTHORIZED = 401
        private const val HTTP_FORBIDDEN = 403
    }
}
