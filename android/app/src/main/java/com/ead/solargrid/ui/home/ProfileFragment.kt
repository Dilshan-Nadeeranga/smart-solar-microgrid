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
        
        val session = SessionManager(requireContext())
        
        binding.btnEditProfile.setOnClickListener {
            showEditProfileDialog(user, session)
        }

        binding.btnDeactivate.setOnClickListener {
            requestDeactivation(user.nic)
        }
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

    private fun showEditProfileDialog(user: com.ead.solargrid.models.User?, session: SessionManager) {
        val dialogView = LayoutInflater.from(requireContext()).inflate(com.ead.solargrid.R.layout.dialog_edit_profile, null)
        val etName = dialogView.findViewById<com.google.android.material.textfield.TextInputEditText>(com.ead.solargrid.R.id.etEditName)
        val etEmail = dialogView.findViewById<com.google.android.material.textfield.TextInputEditText>(com.ead.solargrid.R.id.etEditEmail)
        val etPhone = dialogView.findViewById<com.google.android.material.textfield.TextInputEditText>(com.ead.solargrid.R.id.etEditPhone)
        val etAddress = dialogView.findViewById<com.google.android.material.textfield.TextInputEditText>(com.ead.solargrid.R.id.etEditAddress)

        etName.setText(user?.name)
        etEmail.setText(user?.email)
        etPhone.setText(user?.phone)
        etAddress.setText(user?.address)

        androidx.appcompat.app.AlertDialog.Builder(requireContext())
            .setView(dialogView)
            .setPositiveButton("Save") { _, _ ->
                val request = com.ead.solargrid.models.UpdateProfileRequest(
                    name = etName.text.toString().trim(),
                    email = etEmail.text.toString().trim(),
                    phone = etPhone.text.toString().trim(),
                    address = etAddress.text.toString().trim()
                )
                updateProfile(user?.nic, request, session)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun updateProfile(nic: String?, request: com.ead.solargrid.models.UpdateProfileRequest, session: SessionManager) {
        if (nic == null) return
        androidx.lifecycle.lifecycleScope.launchWhenStarted {
            try {
                val response = com.ead.solargrid.api.RetrofitClient.apiService.updateProfile(nic, request)
                if (response.isSuccessful) {
                    val updatedUser = response.body()
                    if (updatedUser != null) {
                        // Keep our User model updated with what the server returns
                        val newModelUser = User(
                            nic = updatedUser.nic,
                            name = updatedUser.name,
                            email = updatedUser.email,
                            phone = updatedUser.phone,
                            address = updatedUser.address,
                            role = updatedUser.role,
                            accountStatus = updatedUser.accountStatus,
                            nicVerificationStatus = "VERIFIED"
                        )
                        session.saveUserSession(newModelUser)
                        showUser(newModelUser)
                        android.widget.Toast.makeText(requireContext(), "Profile Updated", android.widget.Toast.LENGTH_SHORT).show()
                    }
                } else {
                    android.widget.Toast.makeText(requireContext(), "Update Failed", android.widget.Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                android.widget.Toast.makeText(requireContext(), "Error: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun requestDeactivation(nic: String?) {
        if (nic == null) return
        androidx.appcompat.app.AlertDialog.Builder(requireContext())
            .setTitle("Request Deactivation")
            .setMessage("Are you sure you want to deactivate your account? This action requires backoffice approval.")
            .setPositiveButton("Yes") { _, _ ->
                androidx.lifecycle.lifecycleScope.launchWhenStarted {
                    try {
                        val response = com.ead.solargrid.api.RetrofitClient.apiService.requestDeactivation(nic)
                        if (response.isSuccessful) {
                            android.widget.Toast.makeText(requireContext(), "Deactivation Requested", android.widget.Toast.LENGTH_SHORT).show()
                            binding.tvProfileStatus.text = pretty("DEACTIVATION_REQUESTED")
                        } else {
                            android.widget.Toast.makeText(requireContext(), "Request Failed", android.widget.Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        android.widget.Toast.makeText(requireContext(), "Error: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("No", null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
