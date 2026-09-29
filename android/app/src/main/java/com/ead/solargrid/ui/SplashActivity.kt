package com.ead.solargrid.ui

import android.animation.ObjectAnimator
import android.animation.PropertyValuesHolder
import android.content.Intent
import android.os.Bundle
import android.view.animation.Animation
import android.view.animation.AnimationUtils
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import com.ead.solargrid.R
import com.ead.solargrid.database.SessionManager
import com.ead.solargrid.databinding.ActivitySplashBinding
import com.ead.solargrid.ui.auth.LoginActivity
import com.ead.solargrid.ui.home.ProsumerHomeActivity
import com.ead.solargrid.ui.operator.GridOperatorHomeActivity

class SplashActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySplashBinding
    private var navigated = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(binding.root)
        SystemBarUtils.enableEdgeToEdge(this, binding.root)
        applyBottomInsets()

        playIntroAnimations()
        binding.root.postDelayed({ navigateToNextScreen() }, SPLASH_MIN_MS)
    }

    private fun playIntroAnimations() {
        val iconAnim = AnimationUtils.loadAnimation(this, R.anim.splash_scale_fade_in).apply {
            setAnimationListener(object : Animation.AnimationListener {
                override fun onAnimationStart(animation: Animation?) = Unit
                override fun onAnimationRepeat(animation: Animation?) = Unit
                override fun onAnimationEnd(animation: Animation?) {
                    startIconPulse()
                }
            })
        }
        binding.splashIcon.startAnimation(iconAnim)

        val logoAnim = AnimationUtils.loadAnimation(this, R.anim.splash_bottom_fade_in_up).apply {
            startOffset = LOGO_DELAY_MS
        }
        binding.splashLogo.startAnimation(logoAnim)

        val taglineAnim = AnimationUtils.loadAnimation(this, R.anim.splash_bottom_fade_in_up).apply {
            startOffset = TAGLINE_DELAY_MS
        }
        binding.splashTagline.startAnimation(taglineAnim)
    }

    private fun applyBottomInsets() {
        val bottomStart = binding.splashBottom.paddingBottom
        ViewCompat.setOnApplyWindowInsetsListener(binding.splashRoot) { _, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            binding.splashBottom.updatePadding(bottom = bottomStart + bars.bottom)
            insets
        }
        ViewCompat.requestApplyInsets(binding.splashRoot)
    }

    private fun startIconPulse() {
        val pulse = ObjectAnimator.ofPropertyValuesHolder(
            binding.splashIcon,
            PropertyValuesHolder.ofFloat("scaleX", 1f, 1.06f),
            PropertyValuesHolder.ofFloat("scaleY", 1f, 1.06f)
        ).apply {
            duration = 900
            repeatCount = ObjectAnimator.INFINITE
            repeatMode = ObjectAnimator.REVERSE
        }
        pulse.start()
    }

    private fun navigateToNextScreen() {
        if (navigated || isFinishing) return
        navigated = true

        val sessionManager = SessionManager(this)
        val token = sessionManager.fetchAuthToken()
        val next = when {
            token.isNullOrEmpty() -> Intent(this, LoginActivity::class.java)
            sessionManager.getRole() == "PROSUMER" -> Intent(this, ProsumerHomeActivity::class.java)
            sessionManager.getRole() == "GRID_OPERATOR" -> Intent(this, GridOperatorHomeActivity::class.java)
            else -> Intent(this, LoginActivity::class.java)
        }
        startActivity(next)
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        finish()
    }

    companion object {
        private const val SPLASH_MIN_MS = 2600L
        private const val LOGO_DELAY_MS = 480L
        private const val TAGLINE_DELAY_MS = 760L
    }
}
