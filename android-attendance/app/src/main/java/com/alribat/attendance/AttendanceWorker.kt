package com.alribat.attendance

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AttendanceWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        if (!TokenStore(applicationContext).loggedIn()) {
            return@withContext Result.failure()
        }

        val event = inputData.getString("event")
            ?: return@withContext Result.failure()
        val lat = inputData.getDouble("lat", Double.NaN)
        val lng = inputData.getDouble("lng", Double.NaN)
        val accuracy = inputData.getFloat("accuracy", Float.NaN)
        val deviceId = inputData.getString("deviceId").orEmpty()

        if (!lat.isFinite() || !lng.isFinite() || !accuracy.isFinite()) {
            return@withContext Result.failure()
        }

        try {
            ApiClient.recordEvent(
                applicationContext,
                event,
                lat,
                lng,
                accuracy,
                deviceId
            )
            Result.success()
        } catch (_: Exception) {
            if (runAttemptCount < 8) Result.retry() else Result.failure()
        }
    }
}
