package com.ead.solargrid.ui.operator.scan

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.ColorStateList
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import androidx.core.view.updateLayoutParams
import androidx.core.view.updatePadding
import androidx.lifecycle.ViewModelProvider
import com.ead.solargrid.R
import com.ead.solargrid.database.SessionManager
import com.ead.solargrid.databinding.ActivityScanQrBinding
import com.ead.solargrid.qr.QrFailure
import com.ead.solargrid.ui.auth.LoginActivity
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Grid Operator: live camera QR scanner. On the first decode the camera is stopped, the string
 * is verified with the API, and a successful result opens [ConfirmTransactionActivity].
 */
class ScanQrActivity : AppCompatActivity() {

    companion object {
        private const val KEY_PERMISSION_DENIED = "permission_denied"
    }

    private lateinit var binding: ActivityScanQrBinding
    private lateinit var viewModel: ScanQrViewModel

    private lateinit var analysisExecutor: ExecutorService
    private lateinit var barcodeScanner: BarcodeScanner
    private var cameraProvider: ProcessCameraProvider? = null
    private var cameraRunning = false
    private var currentAnalyzer: QrCodeAnalyzer? = null

    /** True once the user has said no at least once, so we know when to offer Settings instead. */
    private var permissionDenied = false

    private val cameraPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        permissionDenied = !granted
        renderPermission()
    }

    private val confirmTransaction = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == ConfirmTransactionActivity.RESULT_GO_HOME) {
            finish()
        } else {
            // "Scan next", "Cancel" and back all return here to scan again.
            viewModel.resumeScanning()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityScanQrBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setUpWindowInsets()

        viewModel = ViewModelProvider(this)[ScanQrViewModel::class.java]
        analysisExecutor = Executors.newSingleThreadExecutor()
        barcodeScanner = BarcodeScanning.getClient(
            BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
        )

        permissionDenied = savedInstanceState?.getBoolean(KEY_PERMISSION_DENIED) ?: false

        binding.btnBack.setOnClickListener { finish() }
        binding.btnScanAgain.setOnClickListener { viewModel.resumeScanning() }
        binding.btnPermission.setOnClickListener { onPermissionButton() }

        viewModel.state.observe(this, ::render)

        if (!hasCameraPermission() && savedInstanceState == null) {
            cameraPermission.launch(Manifest.permission.CAMERA)
        }
    }

    override fun onResume() {
        super.onResume()
        // Picks up a grant made in system Settings while we were away.
        renderPermission()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean(KEY_PERMISSION_DENIED, permissionDenied)
    }

    override fun onDestroy() {
        super.onDestroy()
        stopCamera()
        if (::barcodeScanner.isInitialized) barcodeScanner.close()
        if (::analysisExecutor.isInitialized) analysisExecutor.shutdown()
    }

    // ----- Setup -----

    private fun setUpWindowInsets() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val topBar = binding.topBar
        val baseTop = topBar.paddingTop
        val baseCardMargin = (binding.statusCard.layoutParams as ViewGroup.MarginLayoutParams).bottomMargin

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { _, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            topBar.updatePadding(left = bars.left, top = baseTop + bars.top, right = bars.right)
            binding.statusCard.updateLayoutParams<ViewGroup.MarginLayoutParams> {
                bottomMargin = baseCardMargin + bars.bottom
            }
            insets
        }
    }

    // ----- Permission -----

    private fun hasCameraPermission() =
        ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED

    /** Shows the rationale panel while the camera is not allowed, otherwise resumes the scanner. */
    private fun renderPermission() {
        val granted = hasCameraPermission()
        binding.permissionPanel.isVisible = !granted
        binding.statusCard.isVisible = granted
        binding.viewfinder.isVisible = granted

        // Dark icons on the light panel, white icons over the camera.
        val iconColor = ContextCompat.getColor(this, if (granted) R.color.white else R.color.op_text)
        binding.btnBack.imageTintList = ColorStateList.valueOf(iconColor)
        binding.tvTitle.setTextColor(iconColor)
        binding.topBar.background =
            if (granted) ContextCompat.getDrawable(this, R.drawable.bg_scan_top_scrim) else null
        WindowCompat.getInsetsController(window, binding.root).isAppearanceLightStatusBars = !granted

        if (granted) {
            permissionDenied = false
            viewModel.state.value?.let(::render)
            return
        }

        stopCamera()
        val goToSettings = permissionDenied &&
            !shouldShowRequestPermissionRationale(Manifest.permission.CAMERA)
        binding.tvPermissionMessage.setText(
            if (goToSettings) R.string.scan_camera_denied_permanently else R.string.scan_camera_rationale
        )
        binding.btnPermission.setText(
            if (goToSettings) R.string.scan_camera_settings else R.string.scan_camera_allow
        )
    }

    private fun onPermissionButton() {
        val goToSettings = permissionDenied &&
            !shouldShowRequestPermissionRationale(Manifest.permission.CAMERA)
        if (goToSettings) {
            startActivity(
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", packageName, null))
            )
        } else {
            cameraPermission.launch(Manifest.permission.CAMERA)
        }
    }

    // ----- Rendering -----

    private fun render(state: ScanState) {
        binding.hintRow.isVisible = state !is ScanState.Failed
        binding.errorGroup.isVisible = state is ScanState.Failed
        binding.progressVerify.isVisible = state is ScanState.Verifying || state is ScanState.Verified
        binding.tvHint.setText(
            if (state is ScanState.Scanning) R.string.scan_hint else R.string.scan_verifying
        )

        when (state) {
            ScanState.Scanning -> if (hasCameraPermission()) startCamera()
            ScanState.Verifying, ScanState.AwaitingConfirmation -> stopCamera()
            is ScanState.Verified -> {
                stopCamera()
                viewModel.onConfirmationOpened()
                confirmTransaction.launch(ConfirmTransactionActivity.newIntent(this, state.reservation))
            }
            is ScanState.Failed -> {
                stopCamera()
                if (state.failure == QrFailure.SESSION_EXPIRED) {
                    sessionExpired()
                    return
                }
                binding.tvError.text = QrFailureText.forVerify(this, state.failure, state.serverMessage)
            }
        }
    }

    // ----- Camera -----

    private fun startCamera() {
        if (cameraRunning) return
        cameraRunning = true

        val future = ProcessCameraProvider.getInstance(this)
        future.addListener({
            // State may have moved on (decode, permission revoked, destroyed) while the provider loaded.
            if (!cameraRunning || isDestroyed) return@addListener
            try {
                val provider = future.get()
                cameraProvider = provider

                val preview = Preview.Builder().build().also {
                    it.setSurfaceProvider(binding.previewView.surfaceProvider)
                }
                lateinit var analyzer: QrCodeAnalyzer
                analyzer = QrCodeAnalyzer(barcodeScanner) { value ->
                    // Ignore a late result from an earlier camera session.
                    if (analyzer === currentAnalyzer) onQrDecoded(value)
                }
                currentAnalyzer = analyzer
                val analysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()
                    .also { it.setAnalyzer(analysisExecutor, analyzer) }

                provider.unbindAll()
                provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
            } catch (e: Exception) {
                cameraRunning = false
                Toast.makeText(this, R.string.scan_camera_unavailable, Toast.LENGTH_LONG).show()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun stopCamera() {
        cameraRunning = false
        currentAnalyzer = null
        cameraProvider?.unbindAll()
    }

    private fun onQrDecoded(value: String) {
        // Stop first so no further frames are analysed while we verify.
        stopCamera()
        viewModel.onQrDecoded(value)
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
