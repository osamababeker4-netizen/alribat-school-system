package com.alribat.attendance

import org.json.JSONObject

data class SchoolGeofence(
    val excluded: Boolean,
    val linked: Boolean,
    val staffId: String?,
    val staffName: String?,
    val role: String?,
    val lat: Double?,
    val lng: Double?,
    val radiusM: Float,
    val exitBufferM: Float,
    val maxAccuracyM: Float
) {
    fun usable() = !excluded && linked && lat != null && lng != null

    companion object {
        fun fromJson(o: JSONObject) = SchoolGeofence(
            excluded = o.optBoolean("excluded", false),
            linked = o.optBoolean("linked", false),
            staffId = o.optString("staffId").takeIf { it.isNotBlank() && it != "null" },
            staffName = o.optString("staffName").takeIf { it.isNotBlank() && it != "null" },
            role = o.optString("role").takeIf { it.isNotBlank() },
            lat = o.optString("lat").toDoubleOrNull(),
            lng = o.optString("lng").toDoubleOrNull(),
            radiusM = o.optDouble("radiusM", 120.0).toFloat(),
            exitBufferM = o.optDouble("exitBufferM", 25.0).toFloat(),
            maxAccuracyM = o.optDouble("maxAccuracyM", 80.0).toFloat()
        )
    }
}
