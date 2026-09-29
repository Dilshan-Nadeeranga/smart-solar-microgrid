package com.ead.solargrid.ui.operator.scan

import androidx.annotation.OptIn
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Feeds camera frames to ML Kit and reports the first QR value it reads, exactly once.
 * A new analyzer is created each time scanning resumes. [onDecoded] runs on the main thread.
 */
class QrCodeAnalyzer(
    private val scanner: BarcodeScanner,
    private val onDecoded: (String) -> Unit
) : ImageAnalysis.Analyzer {

    private val delivered = AtomicBoolean(false)

    @OptIn(ExperimentalGetImage::class)
    override fun analyze(image: ImageProxy) {
        val mediaImage = image.image
        if (mediaImage == null || delivered.get()) {
            image.close()
            return
        }

        val input = InputImage.fromMediaImage(mediaImage, image.imageInfo.rotationDegrees)
        scanner.process(input)
            .addOnSuccessListener { barcodes ->
                val value = barcodes.firstNotNullOfOrNull { it.rawValue?.takeIf(String::isNotBlank) }
                if (value != null && delivered.compareAndSet(false, true)) {
                    onDecoded(value)
                }
            }
            .addOnCompleteListener { image.close() }
    }
}
