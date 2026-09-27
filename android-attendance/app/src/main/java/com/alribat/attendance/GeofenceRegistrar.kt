package com.alribat.attendance

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.tasks.Tasks
import java.util.concurrent.TimeUnit

object GeofenceRegistrar {
    private const val ENTER_ID = "ribat-school-enter"
    private const val EXIT_ID = "ribat-school-exit"

    private fun pendingIntent(context: Context): PendingIntent {
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
        return PendingIntent.getBroadcast(
            context,
            4101,
            Intent(context, GeofenceBroadcastReceiver::class.java),
            flags
        )
    }

    fun hasPermissions(context: Context): Boolean {
        val fine = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val background = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        return fine && background
    }

    fun registerBlocking(context: Context, cfg: SchoolGeofence) {
        if (!cfg.usable()) throw IllegalStateException("إعداد النطاق غير مكتمل")
        if (!hasPermissions(context)) throw SecurityException("صلاحية الموقع الدائم غير مفعلة")

        val lat = cfg.lat!!
        val lng = cfg.lng!!

        val enter = Geofence.Builder()
            .setRequestId(ENTER_ID)
            .setCircularRegion(lat, lng, cfg.radiusM)
            .setExpirationDuration(Geofence.NEVER_EXPIRE)
            .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER)
            .build()

        val exit = Geofence.Builder()
            .setRequestId(EXIT_ID)
            .setCircularRegion(lat, lng, cfg.radiusM + cfg.exitBufferM)
            .setExpirationDuration(Geofence.NEVER_EXPIRE)
            .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_EXIT)
            .build()

        val request = GeofencingRequest.Builder()
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
            .addGeofences(listOf(enter, exit))
            .build()

        Tasks.await(
            LocationServices.getGeofencingClient(context)
                .addGeofences(request, pendingIntent(context)),
            30,
            TimeUnit.SECONDS
        )
    }

    fun remove(context: Context) {
        runCatching {
            Tasks.await(
                LocationServices.getGeofencingClient(context)
                    .removeGeofences(pendingIntent(context)),
                15,
                TimeUnit.SECONDS
            )
        }
    }
}
