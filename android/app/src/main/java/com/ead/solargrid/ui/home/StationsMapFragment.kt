package com.ead.solargrid.ui.home

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.MotionEvent
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import android.widget.LinearLayout
import android.widget.TextView
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
    private var applyingSuggestion = false
    private var sheetShown = false
    private var nearbyOrder: List<SolarStation> = emptyList()
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
        binding.btnViewStation.setOnClickListener { focusSelected() }
        enableSheetDrag()
        enableSheetSwipe()
        binding.etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
            override fun afterTextChanged(s: Editable?) {
                val query = s?.toString().orEmpty()
                filterMarkers(query)
                if (!applyingSuggestion) showSuggestions(query)
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
            hideSuggestions()
            false
        }
        map.setOnMapClickListener { hideSuggestions() }
        map.moveCamera(CameraUpdateFactory.newLatLngZoom(COLOMBO, 12f))
        if (hasLocationPermission()) {
            enableMyLocation()
        }
        loadStations()
    }

    override fun onDestroyView() {
        markers.clear()
        googleMap = null
        sheetShown = false
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
                pullUpSheet()
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
                    .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_YELLOW))
            ) ?: return@forEach
            marker.tag = station
            markers += marker to station
        }
        filterMarkers(binding.etSearch.text?.toString().orEmpty())
        val origin = userLocation ?: COLOMBO
        nearbyOrder = stations.sortedBy { distanceKm(origin, LatLng(it.latitude, it.longitude)) }
        val focus = nearbyOrder.firstOrNull()
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
        pullUpSheet()
    }

    private fun pullUpSheet() {
        if (sheetShown || _binding == null) return
        sheetShown = true
        val sheet = binding.stationSheet
        sheet.post {
            if (_binding == null) return@post
            sheet.translationY = sheet.height.toFloat()
            sheet.visibility = View.VISIBLE
            sheet.animate()
                .translationY(0f)
                .setDuration(450)
                .setInterpolator(android.view.animation.DecelerateInterpolator())
                .start()
        }
    }

    private fun enableSheetDrag() {
        val sheet = binding.stationSheet
        var downY = 0f
        binding.sheetHandle.setOnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downY = event.rawY
                    sheet.animate().cancel()
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dragged = (event.rawY - downY).coerceAtLeast(0f)
                    sheet.translationY = dragged.coerceAtMost(sheet.height.toFloat())
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    val hide = sheet.translationY > sheet.height * 0.28f
                    sheet.animate()
                        .translationY(if (hide) sheet.height.toFloat() else 0f)
                        .setDuration(220)
                        .setInterpolator(android.view.animation.DecelerateInterpolator())
                        .withEndAction {
                            if (hide && _binding != null) {
                                sheet.visibility = View.INVISIBLE
                                sheet.translationY = 0f
                                sheetShown = false
                            }
                        }
                        .start()
                    true
                }
                else -> false
            }
        }
    }

    private fun enableSheetSwipe() {
        val sheet = binding.stationSheet
        val slop = android.view.ViewConfiguration.get(sheet.context).scaledTouchSlop
        var downX = 0f
        var downY = 0f
        var swiping = false
        sheet.setOnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downX = event.rawX
                    downY = event.rawY
                    swiping = false
                    false
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.rawX - downX
                    val dy = event.rawY - downY
                    if (!swiping && kotlin.math.abs(dx) > slop && kotlin.math.abs(dx) > kotlin.math.abs(dy)) {
                        swiping = true
                        sheet.animate().cancel()
                    }
                    if (swiping) {
                        sheet.translationX = dx
                        true
                    } else {
                        false
                    }
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    if (!swiping) return@setOnTouchListener false
                    val index = nearbyOrder.indexOfFirst { it.id == selected?.id }.coerceAtLeast(0)
                    val step = when {
                        nearbyOrder.size <= 1 -> 0
                        sheet.translationX < -sheet.width * 0.22f && index < nearbyOrder.lastIndex -> 1
                        sheet.translationX > sheet.width * 0.22f && index > 0 -> -1
                        else -> 0
                    }
                    if (step != 0) {
                        val exitX = if (step > 0) -sheet.width.toFloat() else sheet.width.toFloat()
                        val enterX = -exitX * 0.35f
                        sheet.animate()
                            .translationX(exitX)
                            .setDuration(160)
                            .withEndAction {
                                if (_binding == null) return@withEndAction
                                showNearby(step)
                                sheet.translationX = enterX
                                sheet.animate().translationX(0f).setDuration(180).start()
                            }
                            .start()
                    } else {
                        sheet.animate().translationX(0f).setDuration(160).start()
                    }
                    true
                }
                else -> false
            }
        }
    }

    private fun showNearby(step: Int) {
        val order = nearbyOrder
        if (order.isEmpty()) return
        val index = order.indexOfFirst { it.id == selected?.id }.coerceAtLeast(0)
        val next = order[(index + step).coerceIn(0, order.lastIndex)]
        showStation(next)
        googleMap?.animateCamera(
            CameraUpdateFactory.newLatLngZoom(LatLng(next.latitude, next.longitude), 15f)
        )
        markers.firstOrNull { it.second.id == next.id }?.first?.showInfoWindow()
    }

    private fun showSuggestions(query: String) {
        val list = binding.suggestionList
        list.removeAllViews()
        val text = query.trim()
        val matches = if (text.isEmpty()) {
            emptyList()
        } else {
            markers.map { it.second }
                .filter {
                    it.name.contains(text, ignoreCase = true) ||
                        it.address.orEmpty().contains(text, ignoreCase = true)
                }
                .take(5)
        }
        if (matches.isEmpty()) {
            list.visibility = View.GONE
            return
        }
        val density = resources.displayMetrics.density
        val padH = (14 * density).toInt()
        val padV = (10 * density).toInt()
        matches.forEach { station ->
            val row = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(padH, padV, padH, padV)
                setOnClickListener { selectSuggestion(station) }
            }
            row.addView(TextView(requireContext()).apply {
                this.text = station.name
                setTextColor(0xFF0B1C30.toInt())
                textSize = 14f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            val address = station.address?.takeIf { it.isNotBlank() }
            if (address != null) {
                row.addView(TextView(requireContext()).apply {
                    this.text = address
                    setTextColor(0xFF4D4632.toInt())
                    textSize = 12f
                    maxLines = 1
                    ellipsize = android.text.TextUtils.TruncateAt.END
                })
            }
            list.addView(row)
        }
        list.visibility = View.VISIBLE
    }

    private fun selectSuggestion(station: SolarStation) {
        applyingSuggestion = true
        binding.etSearch.setText(station.name)
        binding.etSearch.setSelection(station.name.length)
        applyingSuggestion = false
        hideSuggestions()
        val input = context?.getSystemService(InputMethodManager::class.java)
        input?.hideSoftInputFromWindow(binding.etSearch.windowToken, 0)
        showStation(station)
        googleMap?.animateCamera(
            CameraUpdateFactory.newLatLngZoom(LatLng(station.latitude, station.longitude), 15f)
        )
        markers.firstOrNull { it.second.id == station.id }?.first?.showInfoWindow()
    }

    private fun hideSuggestions() {
        if (_binding == null) return
        binding.suggestionList.removeAllViews()
        binding.suggestionList.visibility = View.GONE
    }

    private fun filterMarkers(query: String) {
        val text = query.trim().lowercase()
        markers.forEach { (marker, station) ->
            marker.isVisible = text.isEmpty() ||
                station.name.lowercase().contains(text) ||
                station.address.orEmpty().lowercase().contains(text)
        }
    }

    private fun focusSelected() {
        val station = selected ?: return
        googleMap?.animateCamera(
            CameraUpdateFactory.newLatLngZoom(LatLng(station.latitude, station.longitude), 15f)
        )
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
