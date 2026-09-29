package com.ead.solargrid.ui.home

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.ead.solargrid.R
import com.ead.solargrid.api.ApiClient
import com.ead.solargrid.databinding.FragmentProsumerMapBinding
import com.ead.solargrid.models.SolarStation
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import kotlinx.coroutines.launch
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Nearby Stations map screen.
 *
 * Uses the official recommended pattern from the Maps SDK for Android docs:
 * a [SupportMapFragment] hosted in the child fragment manager, with the map
 * delivered through [OnMapReadyCallback]. Lifecycle is handled automatically
 * by the fragment (no manual MapView lifecycle forwarding needed).
 */
class StationsMapFragment : Fragment(), OnMapReadyCallback {

    private var _binding: FragmentProsumerMapBinding? = null
    private val binding get() = _binding!!

    private var googleMap: GoogleMap? = null
    private var userLocation: LatLng? = null
    private var selected: SolarStation? = null
    private val markers = mutableListOf<Pair<Marker, SolarStation>>()

    private val locationPermission = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        val granted = result[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            result[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            enableMyLocation()
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentProsumerMapBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        if (manifestMapsKey().isBlank()) {
            binding.tvMapKeyMissing.visibility = View.VISIBLE
        }
        binding.btnCloseLocation.setOnClickListener {
            binding.locationBanner.visibility = View.GONE
        }
        binding.btnUseLocation.setOnClickListener { requestLocation() }
        binding.btnMyLocation.setOnClickListener { requestLocation() }
        binding.btnDirections.setOnClickListener { openDirections() }
        binding.btnViewStation.setOnClickListener { focusSelected() }
        binding.etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
            override fun afterTextChanged(s: Editable?) {
                filterMarkers(s?.toString().orEmpty())
            }
        })

        // Official pattern: host SupportMapFragment in the child fragment manager.
        val mapFragment = childFragmentManager.findFragmentById(R.id.mapContainer) as? SupportMapFragment
            ?: SupportMapFragment.newInstance().also {
                childFragmentManager.beginTransaction()
                    .replace(R.id.mapContainer, it)
                    .commitNow()
            }
        mapFragment.getMapAsync(this)
    }

    override fun onMapReady(map: GoogleMap) {
        if (_binding == null) return
        googleMap = map
        map.mapType = GoogleMap.MAP_TYPE_NORMAL
        map.uiSettings.isZoomControlsEnabled = true
        map.uiSettings.isMapToolbarEnabled = false
        map.setOnMarkerClickListener { marker ->
            (marker.tag as? SolarStation)?.let { showStation(it) }
            false
        }
        map.moveCamera(CameraUpdateFactory.newLatLngZoom(COLOMBO, 12f))
        if (hasLocationPermission()) {
            enableMyLocation()
        }
        loadStations()
    }

    override fun onDestroyView() {
        markers.clear()
        googleMap = null
        _binding = null
        super.onDestroyView()
    }

    private fun manifestMapsKey(): String {
        val context = context ?: return ""
        return try {
            val info = context.packageManager.getApplicationInfo(
                context.packageName,
                PackageManager.GET_META_DATA
            )
            info.metaData?.getString("com.google.android.geo.API_KEY").orEmpty()
        } catch (_: Exception) {
            ""
        }
    }

    private fun requestLocation() {
        if (hasLocationPermission()) {
            enableMyLocation()
            return
        }
        locationPermission.launch(
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )
        )
    }

    private fun hasLocationPermission(): Boolean {
        val context = context ?: return false
        return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
    }

    private fun enableMyLocation() {
        val map = googleMap ?: return
        if (!hasLocationPermission()) return
        try {
            map.isMyLocationEnabled = true
        } catch (_: SecurityException) {
            return
        }
        val client = LocationServices.getFusedLocationProviderClient(requireActivity())
        client.lastLocation.addOnSuccessListener { location ->
            if (location == null || _binding == null) return@addOnSuccessListener
            userLocation = LatLng(location.latitude, location.longitude)
            binding.locationBanner.visibility = View.GONE
            map.animateCamera(CameraUpdateFactory.newLatLngZoom(userLocation!!, 13f))
            selected?.let { showStation(it) }
            loadStations()
        }
    }

    private fun loadStations() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val api = ApiClient.getApiService(requireContext())
                val here = userLocation
                val stations = if (here != null) {
                    val nearby = api.getNearbyStations(here.latitude, here.longitude, 50.0).body().orEmpty()
                    if (nearby.isNotEmpty()) {
                        nearby.map { it.station }
                    } else {
                        api.getStations().body().orEmpty()
                    }
                } else {
                    api.getStations().body().orEmpty()
                }.filter { it.isActive && it.latitude in -90.0..90.0 && it.longitude in -180.0..180.0 }

                if (_binding == null) return@launch
                drawMarkers(stations)
            } catch (_: Exception) {
                if (_binding == null) return@launch
                binding.tvStationName.setText(R.string.dashboard_load_error)
            }
        }
    }

    private fun drawMarkers(stations: List<SolarStation>) {
        val map = googleMap ?: return
        markers.forEach { it.first.remove() }
        markers.clear()
        stations.forEach { station ->
            val marker = map.addMarker(
                MarkerOptions()
                    .position(LatLng(station.latitude, station.longitude))
                    .title(station.name)
                    .snippet(station.address)
                    .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_YELLOW))
            ) ?: return@forEach
            marker.tag = station
            markers += marker to station
        }
        filterMarkers(binding.etSearch.text?.toString().orEmpty())
        val focus = nearest(stations) ?: stations.firstOrNull()
        if (focus != null) {
            showStation(focus)
        }
        moveCamera(stations)
    }

    private fun moveCamera(stations: List<SolarStation>) {
        val map = googleMap ?: return
        val here = userLocation
        if (here != null) {
            map.animateCamera(CameraUpdateFactory.newLatLngZoom(here, 13f))
            return
        }
        val nearbyColombo = stations.filter { distanceKm(COLOMBO, LatLng(it.latitude, it.longitude)) <= 80 }
        val focus = nearbyColombo.ifEmpty { stations }
        if (focus.isEmpty()) {
            map.moveCamera(CameraUpdateFactory.newLatLngZoom(COLOMBO, 12f))
            return
        }
        if (focus.size == 1) {
            map.moveCamera(CameraUpdateFactory.newLatLngZoom(LatLng(focus[0].latitude, focus[0].longitude), 13f))
            return
        }
        val bounds = LatLngBounds.builder()
        focus.forEach { bounds.include(LatLng(it.latitude, it.longitude)) }
        binding.mapContainer.post {
            try {
                googleMap?.moveCamera(CameraUpdateFactory.newLatLngBounds(bounds.build(), 120))
            } catch (_: Exception) {
                googleMap?.moveCamera(CameraUpdateFactory.newLatLngZoom(COLOMBO, 12f))
            }
        }
    }

    private fun showStation(station: SolarStation) {
        selected = station
        binding.tvStationName.text = station.name
        binding.tvArea.text = station.address?.takeIf { it.isNotBlank() } ?: getString(R.string.map_station_area)
        binding.tvOpen.setText(if (station.isActive) R.string.map_open_now else R.string.map_closed)
        binding.tvPower.text = getString(R.string.map_power_kw, station.capacityKw.toInt())
        binding.tvSlots.text = getString(R.string.map_slots_count, station.batteryStorageSlots)
        val here = userLocation
        binding.tvDistance.text = if (here == null) {
            getString(R.string.map_distance_unknown)
        } else {
            getString(R.string.map_distance_km, distanceKm(here, LatLng(station.latitude, station.longitude)))
        }
    }

    private fun filterMarkers(query: String) {
        val text = query.trim().lowercase()
        markers.forEach { (marker, station) ->
            marker.isVisible = text.isEmpty() ||
                station.name.lowercase().contains(text) ||
                station.address.orEmpty().lowercase().contains(text)
        }
    }

    private fun nearest(stations: List<SolarStation>): SolarStation? {
        val here = userLocation ?: return null
        return stations.minByOrNull { distanceKm(here, LatLng(it.latitude, it.longitude)) }
    }

    private fun focusSelected() {
        val station = selected ?: return
        googleMap?.animateCamera(
            CameraUpdateFactory.newLatLngZoom(LatLng(station.latitude, station.longitude), 15f)
        )
    }

    private fun openDirections() {
        val station = selected ?: return
        val label = Uri.encode(station.name)
        val uri = Uri.parse("geo:${station.latitude},${station.longitude}?q=${station.latitude},${station.longitude}($label)")
        startActivity(Intent(Intent.ACTION_VIEW, uri))
    }

    private fun distanceKm(from: LatLng, to: LatLng): Double {
        val earth = 6371.0
        val dLat = Math.toRadians(to.latitude - from.latitude)
        val dLng = Math.toRadians(to.longitude - from.longitude)
        val a = sin(dLat / 2).pow(2) +
            cos(Math.toRadians(from.latitude)) * cos(Math.toRadians(to.latitude)) * sin(dLng / 2).pow(2)
        return 2 * earth * asin(sqrt(a))
    }

    companion object {
        private val COLOMBO = LatLng(6.9271, 79.8612)
    }
}
