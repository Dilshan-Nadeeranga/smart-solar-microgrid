package com.ead.solargrid.ui

import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updateLayoutParams
import androidx.core.view.updatePadding

object SystemBarUtils {

    fun enableEdgeToEdge(activity: AppCompatActivity, root: View) {
        WindowCompat.setDecorFitsSystemWindows(activity.window, false)
        WindowCompat.getInsetsController(activity.window, root).apply {
            isAppearanceLightStatusBars = true
            isAppearanceLightNavigationBars = true
        }
    }

    /**
     * Pads [topTarget] below the status bar / notch and [bottomTarget] above the nav bar.
     * Optionally mirrors horizontal cutout insets on [horizontalTarget] (defaults to [root]).
     */
    fun applyInsets(
        root: View,
        topTarget: View,
        bottomTarget: View? = null,
        horizontalTarget: View? = null
    ) {
        val topStart = topTarget.paddingTop
        val bottomStart = bottomTarget?.paddingBottom ?: 0
        val hTarget = horizontalTarget ?: root
        val hLeft = hTarget.paddingLeft
        val hRight = hTarget.paddingRight

        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            topTarget.updatePadding(top = topStart + bars.top)
            bottomTarget?.updatePadding(bottom = bottomStart + bars.bottom)
            hTarget.updatePadding(left = hLeft + bars.left, right = hRight + bars.right)
            insets
        }
        ViewCompat.requestApplyInsets(root)
    }

    /** Yellow status-bar band + content below notch; bottom nav padded above gesture bar. */
    fun applyYellowStatusBarShell(
        root: View,
        statusBarScrim: View,
        bottomTarget: View? = null,
        horizontalTarget: View? = null
    ) {
        val bottomStart = bottomTarget?.paddingBottom ?: 0
        val hTarget = horizontalTarget ?: root
        val hLeft = hTarget.paddingLeft
        val hRight = hTarget.paddingRight

        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            statusBarScrim.updateLayoutParams<ViewGroup.LayoutParams> {
                height = bars.top
            }
            bottomTarget?.updatePadding(bottom = bottomStart + bars.bottom)
            hTarget.updatePadding(left = hLeft + bars.left, right = hRight + bars.right)
            insets
        }
        ViewCompat.requestApplyInsets(root)
    }

    /** Single scrollable/form screen: pad all edges on one root content view. */
    fun applyInsetsOnContent(
        activity: AppCompatActivity,
        root: View,
        content: View,
        statusBarScrim: View? = null
    ) {
        enableEdgeToEdge(activity, root)
        val startTop = content.paddingTop
        val startBottom = content.paddingBottom
        val startLeft = content.paddingLeft
        val startRight = content.paddingRight
        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            statusBarScrim?.updateLayoutParams<ViewGroup.LayoutParams> {
                height = bars.top
            }
            content.updatePadding(
                left = startLeft + bars.left,
                top = startTop + (if (statusBarScrim != null) 0 else bars.top),
                right = startRight + bars.right,
                bottom = startBottom + bars.bottom
            )
            insets
        }
        ViewCompat.requestApplyInsets(root)
    }
}
