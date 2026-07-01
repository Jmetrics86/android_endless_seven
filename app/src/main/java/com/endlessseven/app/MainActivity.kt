package com.endlessseven.app

import android.content.pm.ApplicationInfo
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.JavascriptInterface
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.analytics.ktx.analytics
import com.google.firebase.ktx.Firebase
import org.json.JSONObject
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.endlessseven.app.ui.theme.EndlessSevenTheme
import java.io.PrintWriter
import java.io.StringWriter

class MainActivity : ComponentActivity() {
    /** Paused/resumed with activity; cleared in [AndroidView] onRelease. */
    private var webViewHolder: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        
        setupCrashHandler()

        val isDebuggable = (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
        if (isDebuggable) {
            WebView.setWebContentsDebuggingEnabled(true)
        }
        enableEdgeToEdge()
        hideSystemUI()
        setContent {
            EndlessSevenTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    EndlessSevenWebBoard(
                        onWebViewAttached = { w -> webViewHolder = w },
                        onWebViewReleased = { webViewHolder = null },
                    )
                }
            }
        }
    }

    private fun setupCrashHandler() {
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            val sw = StringWriter()
            throwable.printStackTrace(PrintWriter(sw))
            val stackTrace = sw.toString()
            
            // Format for Gemini Agent visibility
            Log.e("E7_CRASH_REPORT", "\n\n!![NATIVE CRASH DETECTED]!!")
            Log.e("E7_CRASH_REPORT", "Thread: ${thread.name}")
            Log.e("E7_CRASH_REPORT", "Stacktrace:\n$stackTrace")
            Log.e("E7_CRASH_REPORT", "!![END CRASH REPORT]!!\n\n")
            
            defaultHandler?.uncaughtException(thread, throwable)
        }
    }

    override fun onPause() {
        webViewHolder?.onPause()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        webViewHolder?.onResume()
        hideSystemUI()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            hideSystemUI()
        }
    }

    private fun hideSystemUI() {
        val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
        windowInsetsController.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        windowInsetsController.hide(WindowInsetsCompat.Type.systemBars())
    }
}

/**
 * Loads the game from packaged assets via [WebViewAssetLoader].
 */
@Composable
private fun EndlessSevenWebBoard(
    onWebViewAttached: (WebView) -> Unit,
    onWebViewReleased: () -> Unit,
) {
    val appContext = LocalContext.current.applicationContext
    val assetLoader = remember(appContext) {
        WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(appContext))
            .build()
    }
    val firebaseAnalytics = remember { Firebase.analytics }

    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { context ->
            WebView(context).apply {
                onWebViewAttached(this)
                addJavascriptInterface(WebAnalyticsInterface(firebaseAnalytics), "AndroidAnalytics")
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
                setBackgroundColor(Color.BLACK)
                setLayerType(View.LAYER_TYPE_HARDWARE, null)
                overScrollMode = WebView.OVER_SCROLL_NEVER
                isVerticalScrollBarEnabled = false
                isHorizontalScrollBarEnabled = false
                isFocusable = true
                isFocusableInTouchMode = true
                scrollBarStyle = View.SCROLLBARS_INSIDE_OVERLAY

                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    cacheMode = WebSettings.LOAD_DEFAULT
                    allowFileAccess = true
                    allowContentAccess = true
                    mediaPlaybackRequiresUserGesture = false
                    useWideViewPort = true
                    loadWithOverviewMode = true
                    builtInZoomControls = false
                    displayZoomControls = false
                    setSupportZoom(false)
                    textZoom = TEXT_ZOOM_DEFAULT_PERCENT
                }

                webChromeClient = object : WebChromeClient() {
                    override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                        consoleMessage?.apply {
                            val level = when(messageLevel()) {
                                ConsoleMessage.MessageLevel.ERROR -> "!![JS ERROR]!!"
                                ConsoleMessage.MessageLevel.WARNING -> "[JS WARN]"
                                else -> "[JS LOG]"
                            }
                            Log.d("E7_WEB_LOG", "$level ${message()} (at ${sourceId()}:${lineNumber()})")
                        }
                        return true
                    }
                }

                webViewClient = object : WebViewClientCompat() {
                    override fun shouldInterceptRequest(
                        view: WebView,
                        request: WebResourceRequest,
                    ): WebResourceResponse? {
                        return assetLoader.shouldInterceptRequest(request.url)
                    }

                    @Deprecated("Deprecated in Java")
                    override fun shouldInterceptRequest(
                        view: WebView,
                        url: String,
                    ): WebResourceResponse? {
                        return assetLoader.shouldInterceptRequest(Uri.parse(url))
                    }
                }

                loadUrl(GAME_URL)
            }
        },
        onRelease = { webView ->
            onWebViewReleased()
            webView.apply {
                stopLoading()
                loadUrl(BLANK_PAGE)
                clearHistory()
                removeAllViews()
                destroy()
            }
        },
    )
}

private const val GAME_URL = "https://appassets.androidplatform.net/assets/web/index.html"
private const val BLANK_PAGE = "about:blank"
private const val TEXT_ZOOM_DEFAULT_PERCENT = 100

class WebAnalyticsInterface(private val analytics: FirebaseAnalytics) {
    @JavascriptInterface
    fun logEvent(name: String, jsonParams: String) {
        val bundle = Bundle()
        try {
            val json = JSONObject(jsonParams)
            val keys = json.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                when (val value = json.get(key)) {
                    is Int -> bundle.putInt(key, value)
                    is Double -> bundle.putDouble(key, value)
                    is Boolean -> bundle.putBoolean(key, value)
                    else -> bundle.putString(key, value.toString())
                }
            }
        } catch (e: Exception) {
            Log.e("E7_WEB_ANALYTICS", "Failed to parse jsonParams: $jsonParams", e)
        }
        analytics.logEvent(name, bundle)
    }
}
