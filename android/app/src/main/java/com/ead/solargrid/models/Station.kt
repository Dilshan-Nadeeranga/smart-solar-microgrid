package com.ead.solargrid.models

data class Station(
    val id: String,
    val name: String,
    val address: String?,
    val latitude: Double,
    val longitude: Double,
    val capacityKw: Double,
    val batteryStorageSlots: Int,
    val isActive: Boolean
)
