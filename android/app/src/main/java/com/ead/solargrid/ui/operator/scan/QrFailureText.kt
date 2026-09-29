package com.ead.solargrid.ui.operator.scan

import android.content.Context
import com.ead.solargrid.R
import com.ead.solargrid.qr.QrFailure

/** The friendly line shown to a Grid Operator for each [QrFailure]. */
object QrFailureText {

    fun forVerify(context: Context, failure: QrFailure, serverMessage: String?): String =
        text(context, failure, serverMessage, R.string.qr_error_verify_network)

    fun forComplete(context: Context, failure: QrFailure, serverMessage: String?): String =
        text(context, failure, serverMessage, R.string.qr_error_complete_network)

    private fun text(context: Context, failure: QrFailure, serverMessage: String?, networkRes: Int): String =
        when (failure) {
            QrFailure.INVALID -> context.getString(R.string.qr_error_invalid)
            QrFailure.EXPIRED -> context.getString(R.string.qr_error_expired)
            QrFailure.ALREADY_COMPLETED -> context.getString(R.string.qr_error_already_completed)
            QrFailure.NO_LONGER_VALID -> context.getString(R.string.qr_error_no_longer_valid)
            QrFailure.NETWORK -> context.getString(networkRes)
            QrFailure.FORBIDDEN -> context.getString(R.string.qr_error_forbidden)
            QrFailure.SESSION_EXPIRED -> context.getString(R.string.operator_session_expired)
            // The server's own text says when scanning opens, or what else went wrong.
            QrFailure.NOT_YET_VALID, QrFailure.OTHER ->
                serverMessage ?: context.getString(R.string.qr_error_other)
        }
}
