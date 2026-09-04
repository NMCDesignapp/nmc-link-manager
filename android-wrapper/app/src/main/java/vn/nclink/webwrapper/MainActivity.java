package vn.nclink.webwrapper;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebBackForwardList;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final int PICK_FILE = 9001;
    private static final long INITIAL_HISTORY_SETTLE_MS = 1500L;

    private WebView webView;
    private ValueCallback<Uri[]> chooser;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private int rootHistoryIndex = -1;
    private boolean rootHistoryLocked = false;

    private final Runnable lockRootHistory = () -> {
        if (webView == null || rootHistoryLocked) return;
        WebBackForwardList list = webView.copyBackForwardList();
        rootHistoryIndex = list.getCurrentIndex();
        rootHistoryLocked = true;
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.parseColor("#0B1119"));
        getWindow().setNavigationBarColor(Color.parseColor("#0B1119"));

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#0B1119"));
        setContentView(root);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#0B1119"));
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        setupWebView();
        if (savedInstanceState != null && webView.restoreState(savedInstanceState) != null) {
            scheduleRootHistoryLock();
            return;
        }
        webView.loadUrl(BuildConfig.START_URL);
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setUserAgentString(settings.getUserAgentString() + " NCLinkAndroid/1.0.7");

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new Bridge(), "NCLinkAndroid");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if (scheme == null || "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectDownloadHook();
                if (!rootHistoryLocked) scheduleRootHistoryLock();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> filePathCallback, FileChooserParams params) {
                if (chooser != null) chooser.onReceiveValue(null);
                chooser = filePathCallback;
                try {
                    Intent intent = params.createIntent();
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    startActivityForResult(intent, PICK_FILE);
                    return true;
                } catch (Exception e) {
                    chooser = null;
                    return false;
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url == null) return;
            if (url.startsWith("blob:") || url.startsWith("data:")) {
                injectDownloadHook();
                return;
            }
            try {
                String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setTitle(fileName);
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
                if (mimeType != null && !mimeType.isEmpty()) request.setMimeType(mimeType);
                if (userAgent != null) request.addRequestHeader("User-Agent", userAgent);
                String cookie = CookieManager.getInstance().getCookie(url);
                if (cookie != null) request.addRequestHeader("Cookie", cookie);
                ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(request);
                Toast.makeText(this, "Đang tải tệp vào thư mục Download.", Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                Toast.makeText(this, "Không thể tải tệp.", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void scheduleRootHistoryLock() {
        mainHandler.removeCallbacks(lockRootHistory);
        mainHandler.postDelayed(lockRootHistory, INITIAL_HISTORY_SETTLE_MS);
    }

    private boolean hasUserNavigationHistory() {
        if (webView == null) return false;
        WebBackForwardList list = webView.copyBackForwardList();
        int currentIndex = list.getCurrentIndex();
        if (!rootHistoryLocked) {
            rootHistoryIndex = currentIndex;
            rootHistoryLocked = true;
            mainHandler.removeCallbacks(lockRootHistory);
            return false;
        }
        return webView.canGoBack() && currentIndex > rootHistoryIndex;
    }

    private void injectDownloadHook() {
        String js = "(()=>{if(window.__ncdl)return;window.__ncdl=1;document.addEventListener('click',e=>{let a=e.target.closest&&e.target.closest('a[download]');if(!a||!a.href||(!a.href.startsWith('blob:')&&!a.href.startsWith('data:')))return;e.preventDefault();let n=a.download||'download';if(a.href.startsWith('data:'))NCLinkAndroid.saveBase64(a.href,n,'');else fetch(a.href).then(r=>r.blob()).then(b=>{let f=new FileReader();f.onloadend=()=>NCLinkAndroid.saveBase64(f.result,n,b.type||'');f.readAsDataURL(b)})},true)})()";
        webView.evaluateJavascript(js, null);
    }

    public class Bridge {
        @JavascriptInterface
        public void saveBase64(String dataUrl, String name, String mime) {
            runOnUiThread(() -> saveData(dataUrl, name, mime));
        }
    }

    private void saveData(String dataUrl, String name, String mime) {
        try {
            int comma = dataUrl.indexOf(',');
            if (comma < 0) throw new IllegalStateException();
            String base64 = dataUrl.substring(comma + 1);
            byte[] bytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
            String safe = (name == null || name.trim().isEmpty()) ? "download" : name.replaceAll("[\\\\/:*?\"<>|]", "_");
            String realMime = (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime;
            if (!safe.contains(".")) {
                String ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(realMime);
                if (ext != null && !ext.isEmpty()) safe += "." + ext;
            }
            android.content.ContentValues values = new android.content.ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, safe);
            values.put(MediaStore.MediaColumns.MIME_TYPE, realMime);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IllegalStateException();
            try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                if (out == null) throw new IllegalStateException();
                out.write(bytes);
            }
            Toast.makeText(this, "Đã lưu “" + safe + "” vào Download.", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, "Không thể lưu tệp.", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onBackPressed() {
        if (hasUserNavigationHistory()) {
            webView.goBack();
            return;
        }
        new AlertDialog.Builder(this)
                .setTitle("Thoát ứng dụng?")
                .setMessage("Bạn có muốn thoát ứng dụng không?")
                .setNegativeButton("Ở lại", null)
                .setPositiveButton("Thoát", (dialog, which) -> finish())
                .show();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        mainHandler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_FILE || chooser == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK) {
            if (data != null && data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                result = new Uri[count];
                for (int i = 0; i < count; i++) result[i] = data.getClipData().getItemAt(i).getUri();
            } else if (data != null && data.getData() != null) {
                result = new Uri[]{data.getData()};
            }
        }
        chooser.onReceiveValue(result);
        chooser = null;
    }
}
