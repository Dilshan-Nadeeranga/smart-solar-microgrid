package com.ead.solargrid.ui.home

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.ead.solargrid.database.SessionManager
import com.ead.solargrid.databinding.FragmentProsumerProfileBinding
import com.ead.solargrid.ui.auth.LoginActivity

class ProfileFragment : Fragment() {

    private var _binding: FragmentProsumerProfileBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentProsumerProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val session = SessionManager(requireContext())
        val user = session.getUserSession()

        binding.tvProfileName.text = user?.name ?: "—"
        binding.tvProfileNic.text = user?.nic?.let { "NIC $it" } ?: "—"
        binding.tvProfileEmail.text = user?.email ?: "—"
        binding.tvProfileStatus.text = user?.accountStatus ?: "—"

        binding.btnLogout.setOnClickListener {
            session.logout()
            startActivity(Intent(requireContext(), LoginActivity::class.java))
            requireActivity().finish()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
