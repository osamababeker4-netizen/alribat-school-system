package com.alribat.attendance

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class GeofenceRefreshWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val store = TokenStore(applicationContext)
        if (!store.loggedIn()) return@withContext Result.success()

        try {
            val cfg = ApiClient.getGeofence(applicationContext)
            if (cfg.excluded) {
                GeofenceRegistrar.remove(applicationContext)
                return@withContext Result.success()
            }
            if (!cfg.usable() || !GeofenceRegistrar.hasPermissions(applicationContext)) {
                return@withContext Result.success()
            }
            GeofenceRegistrar.registerBlocking(applicationContext, cfg)
            Result.success()
        } catch (_: Exception) {
            if (runAttemptCount < 5) Result.retry() else Result.failure()
        }
    }
}
