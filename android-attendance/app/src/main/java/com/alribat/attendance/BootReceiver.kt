package com.alribat.attendance

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (!TokenStore(context).loggedIn()) return

        ApiClient.cachedGeofence(context)?.let { cfg ->
            if (cfg.usable() && GeofenceRegistrar.hasPermissions(context)) {
                Thread {
                    runCatching { GeofenceRegistrar.registerBlocking(context, cfg) }
                }.start()
            }
        }

        val request = OneTimeWorkRequestBuilder<GeofenceRefreshWorker>()
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            "ribat-geofence-boot",
            ExistingWorkPolicy.REPLACE,
            request
        )
    }
}
