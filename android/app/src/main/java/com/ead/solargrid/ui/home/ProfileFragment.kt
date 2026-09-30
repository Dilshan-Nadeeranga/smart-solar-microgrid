package com.ead.solargrid.ui.home

import android.app.Dialog
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.ead.solargrid.api.ApiClient
import com.ead.solargrid.database.SessionManager
import com.ead.solargrid.databinding.DialogLogoutConfirmBinding
import com.ead.solargrid.databinding.FragmentProsumerProfileBinding
import com.ead.solargrid.models.User
import com.ead.solargrid.ui.auth.LoginActivity
import kotlinx.coroutines.launch
import java.util.Locale

class ProfileFragment : Fragment() {

    private var _binding: FragmentProsumerProfileBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val content = FragmentProsumerProfileBinding.inflate(inflater, container, false)
        _binding = content
        return content.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val session = SessionManager(requireContext())
        session.getUserSession()?.let { showUser(it) }

        binding.btnLogout.setOnClickListener { confirmLogout(session) }

        val nic = session.getUserSession()?.nic ?: return
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = ApiClient.getApiService(requireContext()).getUser(nic)
                val user = response.body()
                if (!response.isSuccessful || user == null || _binding == null) return@launch
                session.saveUserSession(
                    nic = user.nic,
                    name = user.name,
                    email = user.email,
                    phone = user.phone.orEmpty(),
                    address = user.address.orEmpty(),
                    role = user.role,
                    accountStatus = user.accountStatus
                )
                showUser(user)
            } catch (_: Exception) {
                // Keep the details already stored on this phone.
            }
        }
    }

    private fun confirmLogout(session: SessionManager) {
        val dialogBinding = DialogLogoutConfirmBinding.inflate(layoutInflater)
        val dialog = Dialog(requireContext())
        dialog.setContentView(dialogBinding.root)
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        dialog.window?.setLayout(
            (resources.displayMetrics.widthPixels * 0.88f).toInt(),
            ViewGroup.LayoutParams.WRAP_CONTENT
        )
        dialogBinding.btnStaySignedIn.setOnClickListener { dialog.dismiss() }
        dialogBinding.btnConfirmLogout.setOnClickListener {
            dialog.dismiss()
            session.logout()
            startActivity(Intent(requireContext(), LoginActivity::class.java))
            requireActivity().finish()
        }
        dialog.show()
    }

    private fun showUser(user: User) {
        binding.tvProfileName.text = user.name.ifBlank { "—" }
        binding.tvProfileNic.text = user.nic.ifBlank { "—" }
        binding.tvProfileEmail.text = user.email.ifBlank { "—" }
        binding.tvProfilePhone.text = user.phone?.ifBlank { "—" } ?: "—"
        binding.tvProfileAddress.text = user.address?.ifBlank { "—" } ?: "—"
        binding.tvProfileStatus.text = pretty(user.accountStatus)
        binding.tvProfileNicStatus.text = pretty(user.nicVerificationStatus)
    }

    private fun pretty(value: String?): String {
        val raw = value?.trim().orEmpty()
        if (raw.isEmpty()) return "—"
        return raw.lowercase(Locale.getDefault())
            .split('_')
            .filter { it.isNotEmpty() }
            .joinToString(" ") { word ->
                word.replaceFirstChar { it.titlecase(Locale.getDefault()) }
            }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
