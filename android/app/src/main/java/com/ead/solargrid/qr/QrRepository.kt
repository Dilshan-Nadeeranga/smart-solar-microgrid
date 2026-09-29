package com.ead.solargrid.qr

import com.ead.solargrid.api.ApiService
import com.ead.solargrid.models.QrCodeDto
import com.ead.solargrid.models.QrVerificationResponse
import com.ead.solargrid.models.ReservationActionRequest
import com.ead.solargrid.models.ReservationActionResponse
import com.ead.solargrid.models.VerifyQrRequest
import com.google.gson.Gson
import kotlinx.coroutines.CancellationException
import retrofit2.Response
import java.io.IOException

/** Outcome of one QR endpoint call. Never carries the QR payload in an error. */
sealed interface QrResult<out T> {
    data class Success<T>(val data: T) : QrResult<T>

    /** The server answered with a non-2xx status; [serverMessage] is its `{ "message" }`. */
    data class HttpError(val code: Int, val serverMessage: String?) : QrResult<Nothing>

    /** No usable response: offline, timeout, DNS, TLS... */
    data object NetworkError : QrResult<Nothing>
}

/** The three QR endpoints, wrapped so screens deal in [QrResult] instead of Retrofit responses. */
class QrRepository(private val api: ApiService) {

    private class ErrorBody(val message: String?)

    private val gson = Gson()

    /** Prosumer: fetch a fresh signed payload for an Approved reservation. */
    suspend fun getQr(reservationId: String): QrResult<QrCodeDto> =
        call({ api.getReservationQr(reservationId) }) { body ->
            body.qr?.takeIf { !it.payload.isNullOrBlank() && !it.expiresAtUtc.isNullOrBlank() }
        }

    /** Grid Operator: check a scanned string. Read-only on the server. */
    suspend fun verify(payload: String): QrResult<QrVerificationResponse> =
        call({ api.verifyQr(VerifyQrRequest(payload)) }) { body ->
            body.takeIf { it.reservation?.id?.isNotBlank() == true }
        }

    /** Grid Operator: record the transfer. A repeat call fails with 409 "already completed". */
    suspend fun complete(reservationId: String): QrResult<ReservationActionResponse> =
        call({ api.completeReservation(reservationId, ReservationActionRequest()) }) { it }

    private suspend fun <B, T> call(
        request: suspend () -> Response<B>,
        extract: (B) -> T?
    ): QrResult<T> {
        val response = try {
            request()
        } catch (e: CancellationException) {
            throw e
        } catch (e: IOException) {
            return QrResult.NetworkError
        } catch (e: RuntimeException) {
            // Gson throws these for a body that is not the JSON we expect.
            return QrResult.HttpError(HTTP_BAD_RESPONSE, null)
        }

        if (!response.isSuccessful) {
            return QrResult.HttpError(response.code(), readMessage(response))
        }
        val data = response.body()?.let(extract)
            ?: return QrResult.HttpError(HTTP_BAD_RESPONSE, null)
        return QrResult.Success(data)
    }

    private fun readMessage(response: Response<*>): String? = try {
        response.errorBody()?.string()
            ?.let { gson.fromJson(it, ErrorBody::class.java)?.message }
            ?.takeIf { it.isNotBlank() }
    } catch (e: Exception) {
        null
    }

    companion object {
        /** Stand-in status for a 2xx whose body could not be used. */
        const val HTTP_BAD_RESPONSE = 502
    }
}
