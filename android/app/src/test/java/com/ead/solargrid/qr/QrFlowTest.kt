package com.ead.solargrid.qr

import com.ead.solargrid.api.ApiService
import com.google.zxing.BarcodeFormat
import com.google.zxing.BinaryBitmap
import com.google.zxing.DecodeHintType
import com.google.zxing.RGBLuminanceSource
import com.google.zxing.common.HybridBinarizer
import com.google.zxing.qrcode.QRCodeReader
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/** QR flow against a fake server, through the app's real Retrofit [ApiService]. */
class QrFlowTest {

    private lateinit var server: MockWebServer
    private lateinit var repository: QrRepository

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        val api = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .client(OkHttpClient.Builder().readTimeout(2, TimeUnit.SECONDS).build())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
        repository = QrRepository(api)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `payload survives QR encode and decode, then verify and complete succeed`() = runTest {
        val payload = "eyJyaWQiOiI2NmY5YTFjMmU0YjBhMWIyYzNkNGU1ZjYifQ.c2lnbmF0dXJlLWJ5dGVz"

        val decoded = decodeQr(payload)
        assertEquals(payload, decoded)

        server.enqueue(json(200, VERIFY_OK))
        server.enqueue(json(200, COMPLETE_OK))

        val verified = repository.verify(decoded)
        assertTrue(verified is QrResult.Success)
        val body = (verified as QrResult.Success).data
        assertEquals(RESERVATION_ID, body.reservation?.id)
        assertEquals("Colombo Solar Hub", body.reservation?.stationName)
        assertEquals("200012345678", body.prosumer?.nic)
        assertEquals("2026-09-29T10:00:00Z", body.reservation?.slotStartTimeUtc)

        val verifyRequest = server.takeRequest()
        assertEquals("POST", verifyRequest.method)
        assertEquals("/api/reservations/verify-qr", verifyRequest.path)
        assertEquals("{\"payload\":\"$payload\"}", verifyRequest.body.readUtf8())

        val completed = repository.complete(body.reservation!!.id)
        assertTrue(completed is QrResult.Success)
        assertEquals("Completed", (completed as QrResult.Success).data.reservation?.status)

        val completeRequest = server.takeRequest()
        assertEquals("PATCH", completeRequest.method)
        assertEquals("/api/reservations/$RESERVATION_ID/complete", completeRequest.path)
        // No version is sent, so a repeat is answered with "already completed", not a version clash.
        assertEquals("{}", completeRequest.body.readUtf8())
    }

    @Test
    fun `second complete reports already completed and never success`() = runTest {
        server.enqueue(json(200, COMPLETE_OK))
        server.enqueue(
            json(409, """{"message":"Reservation is already completed. Capacity was not released again."}""")
        )

        assertTrue(repository.complete(RESERVATION_ID) is QrResult.Success)

        val second = repository.complete(RESERVATION_ID)
        assertTrue(second is QrResult.HttpError)
        assertEquals(409, (second as QrResult.HttpError).code)
        assertEquals(QrFailure.ALREADY_COMPLETED, QrFailure.from(second))
    }

    @Test
    fun `verify failures map to the right friendly case`() = runTest {
        val cases = listOf(
            400 to "Invalid QR code. It is damaged or has been tampered with." to QrFailure.INVALID,
            400 to "This QR code has expired." to QrFailure.EXPIRED,
            409 to "This energy transfer is already completed." to QrFailure.ALREADY_COMPLETED,
            409 to "This reservation was cancelled. The QR code is no longer valid." to QrFailure.NO_LONGER_VALID,
            409 to "This reservation was rejected. The QR code is not valid." to QrFailure.NO_LONGER_VALID,
            409 to "This reservation is not approved." to QrFailure.NO_LONGER_VALID,
            404 to "The reservation for this QR code was not found." to QrFailure.NO_LONGER_VALID,
            409 to "This QR code no longer matches the reservation. Ask the prosumer to open the QR code again." to QrFailure.INVALID,
            400 to "This QR code is not valid yet. Scanning opens at 2026-09-29 09:30 UTC." to QrFailure.NOT_YET_VALID,
            403 to "Only a Grid Operator can verify transaction QR codes." to QrFailure.FORBIDDEN,
            401 to "" to QrFailure.SESSION_EXPIRED
        )

        for ((response, expected) in cases) {
            val (code, message) = response
            server.enqueue(json(code, """{"message":"$message"}"""))
            val result = repository.verify("any.payload")
            assertEquals("HTTP $code \"$message\"", expected, QrFailure.from(result))
        }
    }

    @Test
    fun `dropped connection is a network error`() = runTest {
        server.enqueue(MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AT_START))

        val result = repository.verify("any.payload")

        assertEquals(QrResult.NetworkError, result)
        assertEquals(QrFailure.NETWORK, QrFailure.from(result))
    }

    @Test
    fun `get qr reads the nested payload and expiry`() = runTest {
        server.enqueue(
            json(
                200,
                """{"message":"QR code issued.","reservationId":"$RESERVATION_ID","qr":{
                    "payload":"abc.def","issuedAtUtc":"2026-09-29T09:00:00Z",
                    "validFromUtc":"2026-09-29T09:30:00Z","expiresAtUtc":"2026-09-29T11:15:00Z"}}"""
            )
        )

        val result = repository.getQr(RESERVATION_ID)

        assertTrue(result is QrResult.Success)
        val qr = (result as QrResult.Success).data
        assertEquals("abc.def", qr.payload)
        assertEquals("2026-09-29T11:15:00Z", qr.expiresAtUtc)
        assertEquals("/api/reservations/$RESERVATION_ID/qr", server.takeRequest().path)
    }

    @Test
    fun `get qr for a reservation that is no longer approved is a 409`() = runTest {
        server.enqueue(
            json(409, """{"message":"A QR code is only available for an approved reservation. Current status: Cancelled."}""")
        )

        val result = repository.getQr(RESERVATION_ID)

        assertEquals(409, (result as QrResult.HttpError).code)
    }

    private fun json(code: Int, body: String) =
        MockResponse().setResponseCode(code).setHeader("Content-Type", "application/json").setBody(body)

    /** Renders [content] as the app does, then reads it back with ZXing's decoder. */
    private fun decodeQr(content: String): String {
        val matrix = QrCodeRenderer.encode(content, 400)
        val pixels = IntArray(matrix.width * matrix.height) { i ->
            if (matrix[i % matrix.width, i / matrix.width]) 0xFF000000.toInt() else 0xFFFFFFFF.toInt()
        }
        val bitmap = BinaryBitmap(HybridBinarizer(RGBLuminanceSource(matrix.width, matrix.height, pixels)))
        return QRCodeReader().decode(
            bitmap,
            mapOf(DecodeHintType.POSSIBLE_FORMATS to listOf(BarcodeFormat.QR_CODE))
        ).text
    }

    private companion object {
        const val RESERVATION_ID = "66f9a1c2e4b0a1b2c3d4e5f6"

        const val RESERVATION = """{
            "id":"$RESERVATION_ID","prosumerId":"200012345678","stationId":"66f9a1c2e4b0a1b2c3d4e5aa",
            "stationName":"Colombo Solar Hub","slotId":"66f9a1c2e4b0a1b2c3d4e5bb","status":"Approved",
            "slotStartTimeUtc":"2026-09-29T10:00:00Z","slotEndTimeUtc":"2026-09-29T11:00:00Z","version":3}"""

        const val VERIFY_OK = """{
            "message":"QR code verified. The reservation is approved and ready to complete.",
            "reservationId":"$RESERVATION_ID","reservation":$RESERVATION,
            "prosumer":{"nic":"200012345678","name":"Nimal Perera"},
            "qrIssuedAtUtc":"2026-09-29T09:00:00Z","qrExpiresAtUtc":"2026-09-29T11:15:00Z"}"""

        val COMPLETE_OK = """{"message":"Energy transfer completed.","reservationId":"$RESERVATION_ID",
            "reservation":${RESERVATION.replace("\"Approved\"", "\"Completed\"")}}"""
    }
}
