package com.alribat.attendance

import android.content.Context
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

object ApiClient {
    private val jsonType = "application/json; charset=utf-8".toMediaType()
    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .build()

    private fun request(url: String, body: JSONObject, token: String? = null): Pair<Int, String> {
        val requestBody = body.toString().toRequestBody(jsonType)
        val builder = Request.Builder()
            .url(url)
            .header("apikey", BuildConfig.SUPABASE_KEY)
            .header("Content-Type", "application/json")
            .post(requestBody)
        if (!token.isNullOrBlank()) builder.header("Authorization", "Bearer $token")
        client.newCall(builder.build()).execute().use {
            return it.code to it.body?.string().orEmpty()
        }
    }

    fun login(context: Context, identifier: String, password: String) {
        val (code, body) = request(
            BuildConfig.SUPABASE_URL + "/functions/v1/login-identifier",
            JSONObject().put("identifier", identifier.trim()).put("password", password)
        )
        if (code !in 200..299) throw IOException(errorMessage(body, "تعذر تسجيل الدخول"))
        val json = JSONObject(body)
        val access = json.optString("access_token")
        val refresh = json.optString("refresh_token")
        if (access.isBlank() || refresh.isBlank()) throw IOException("استجابة تسجيل الدخول غير مكتملة")
        TokenStore(context).saveSession(access, refresh)
    }

    private fun refresh(context: Context): Boolean {
        val store = TokenStore(context)
        val refresh = store.refreshToken ?: return false
        val (code, body) = request(
            BuildConfig.SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token",
            JSONObject().put("refresh_token", refresh)
        )
        if (code !in 200..299) return false
        val json = JSONObject(body)
        val access = json.optString("access_token")
        val nextRefresh = json.optString("refresh_token", refresh)
        if (access.isBlank()) return false
        store.saveSession(access, nextRefresh)
        return true
    }

    private fun rpc(context: Context, name: String, body: JSONObject): JSONObject {
        val store = TokenStore(context)
        var token = store.accessToken ?: throw IOException("الجلسة غير موجودة")
        var result = request(BuildConfig.SUPABASE_URL + "/rest/v1/rpc/$name", body, token)
        if (result.first == 401 && refresh(context)) {
            token = TokenStore(context).accessToken ?: token
            result = request(BuildConfig.SUPABASE_URL + "/rest/v1/rpc/$name", body, token)
        }
        if (result.first !in 200..299) {
            throw IOException(errorMessage(result.second, "فشل الاتصال بقاعدة المدرسة"))
        }
        return JSONObject(result.second)
    }

    fun getGeofence(context: Context): SchoolGeofence {
        val json = rpc(context, "get_my_staff_geofence", JSONObject())
        TokenStore(context).geofenceJson = json.toString()
        return SchoolGeofence.fromJson(json)
    }

    fun cachedGeofence(context: Context): SchoolGeofence? =
        TokenStore(context).geofenceJson?.let {
            runCatching { SchoolGeofence.fromJson(JSONObject(it)) }.getOrNull()
        }

    fun recordEvent(
        context: Context,
        event: String,
        lat: Double,
        lng: Double,
        accuracy: Float,
        deviceId: String
    ): JSONObject = rpc(
        context,
        "record_staff_geofence_event",
        JSONObject()
            .put("p_event", event)
            .put("p_lat", lat)
            .put("p_lng", lng)
            .put("p_accuracy", accuracy.toDouble())
            .put("p_device_id", deviceId)
    )

    private fun errorMessage(body: String, fallback: String): String =
        runCatching {
            val json = JSONObject(body)
            json.optString("message").ifBlank {
                json.optString("error").ifBlank { fallback }
            }
        }.getOrDefault(fallback)
}
