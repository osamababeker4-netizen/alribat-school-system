package com.alribat.attendance

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.alribat.attendance.databinding.ActivityMainBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding

    private val finePermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) ensureBackgroundPermission()
            else setStatus("يجب السماح بالموقع الدقيق لتفعيل الحضور التلقائي.")
        }

    private val backgroundPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            refreshUiAndRegister()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.loginButton.setOnClickListener { login() }
        binding.enableButton.setOnClickListener { requestAllLocationPermissions() }
        binding.refreshButton.setOnClickListener { refreshUiAndRegister() }
        binding.logoutButton.setOnClickListener {
            lifecycleScope.launch(Dispatchers.IO) {
                GeofenceRegistrar.remove(this@MainActivity)
                TokenStore(this@MainActivity).clear()
                withContext(Dispatchers.Main) { showLoggedOut() }
            }
        }

        if (TokenStore(this).loggedIn()) {
            showLoggedIn()
            refreshUiAndRegister()
        } else {
            showLoggedOut()
        }
    }

    override fun onResume() {
        super.onResume()
        if (TokenStore(this).loggedIn()) refreshUiAndRegister()
    }

    private fun login() {
        val identifier = binding.identifier.text?.toString().orEmpty()
        val password = binding.password.text?.toString().orEmpty()

        if (identifier.isBlank() || password.isBlank()) {
            setStatus("أدخل بيانات تسجيل الدخول.")
            return
        }

        binding.loginButton.isEnabled = false
        setStatus("جارٍ تسجيل الدخول...")

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                ApiClient.login(this@MainActivity, identifier, password)
                withContext(Dispatchers.Main) {
                    showLoggedIn()
                    requestAllLocationPermissions()
                    refreshUiAndRegister()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    binding.loginButton.isEnabled = true
                    setStatus(e.message ?: "تعذر تسجيل الدخول")
                }
            }
        }
    }

    private fun requestAllLocationPermissions() {
        if (
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            finePermission.launch(Manifest.permission.ACCESS_FINE_LOCATION)
            return
        }
        ensureBackgroundPermission()
    }

    private fun ensureBackgroundPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            refreshUiAndRegister()
            return
        }

        if (
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            refreshUiAndRegister()
            return
        }

        if (Build.VERSION.SDK_INT == Build.VERSION_CODES.Q) {
            backgroundPermission.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        } else {
            setStatus("من إعدادات التطبيق اختر: الموقع ← السماح طوال الوقت، ثم ارجع للتطبيق.")
            startActivity(
                Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:$packageName")
                )
            )
        }
    }

    private fun refreshUiAndRegister() {
        if (!TokenStore(this).loggedIn()) return

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val cfg = ApiClient.getGeofence(this@MainActivity)
                val message = when {
                    cfg.excluded ->
                        "حساب مدير المدرسة مستثنى من الحضور والانصراف التلقائي."

                    !cfg.linked ->
                        "هذا الحساب غير مرتبط بسجل موظف. اربطه من نظام المدرسة أولاً."

                    cfg.lat == null || cfg.lng == null ->
                        "موقع المدرسة لم يُعتمد بعد من الإعدادات."

                    !GeofenceRegistrar.hasPermissions(this@MainActivity) ->
                        "يلزم تفعيل الموقع الدائم: السماح طوال الوقت."

                    else -> {
                        GeofenceRegistrar.registerBlocking(this@MainActivity, cfg)
                        "مفعل ✓ — " + (cfg.staffName ?: "الموظف") +
                            "\nدخول النطاق = حضور تلقائي، الخروج = انصراف تلقائي." +
                            "\nنصف القطر " + cfg.radiusM.toInt() +
                            "م + هامش خروج " + cfg.exitBufferM.toInt() + "م."
                    }
                }
                withContext(Dispatchers.Main) { setStatus(message) }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    setStatus(e.message ?: "تعذر تحديث إعداد الحضور")
                }
            }
        }
    }

    private fun showLoggedIn() {
        binding.identifier.visibility = View.GONE
        binding.password.visibility = View.GONE
        binding.loginButton.visibility = View.GONE
        binding.enableButton.visibility = View.VISIBLE
        binding.refreshButton.visibility = View.VISIBLE
        binding.logoutButton.visibility = View.VISIBLE
    }

    private fun showLoggedOut() {
        binding.identifier.visibility = View.VISIBLE
        binding.password.visibility = View.VISIBLE
        binding.loginButton.visibility = View.VISIBLE
        binding.loginButton.isEnabled = true
        binding.enableButton.visibility = View.GONE
        binding.refreshButton.visibility = View.GONE
        binding.logoutButton.visibility = View.GONE
        setStatus("سجّل الدخول لتفعيل الحضور التلقائي.")
    }

    private fun setStatus(text: String) {
        binding.status.text = text
    }
}
