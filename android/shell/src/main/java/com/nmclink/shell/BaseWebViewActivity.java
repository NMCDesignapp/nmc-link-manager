package com.nmclink.shell;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.SslErrorHandler;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.net.http.SslError;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public abstract class BaseWebViewActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 4217;
    private static final int STORAGE_PERMISSION_REQUEST = 4218;
    private static final String DOWNLOAD_SUBDIR = "NC-Link";

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private final ExecutorService ioExecutor = Executors.newSingleThreadExecutor();
    private PendingBlobDownload pendingBlobDownload;
    private PendingHttpDownload pendingHttpDownload;

    protected abstract String startUrl();

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(10, 10, 15));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " NCLinkAndroid/1.0");

        WebView.setWebContentsDebuggingEnabled(false);
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new DownloadBridge(), "NCLinkAndroid");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleExternalUri(request.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectBlobDownloadBridge();
                applyImmersiveMode();
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
                Toast.makeText(BaseWebViewActivity.this, "Không thể mở trang do lỗi chứng chỉ bảo mật.", Toast.LENGTH_LONG).show();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;

                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(resolveAcceptType(params));
                if (params != null && params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                }

                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (Exception error) {
                    filePathCallback = null;
                    Toast.makeText(BaseWebViewActivity.this, "Không mở được trình chọn file.", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url == null || url.isBlank()) {
                return;
            }
            if (url.startsWith("blob:") || url.startsWith("data:")) {
                String safeUrl = url.replace("\\", "\\\\").replace("'", "\\'");
                webView.evaluateJavascript("window.__ncLinkAndroidSaveUrl && window.__ncLinkAndroidSaveUrl('" + safeUrl + "','download');", null);
                return;
            }
            downloadHttp(url, userAgent, contentDisposition, mimeType);
        });

        applyImmersiveMode();
        if (savedInstanceState == null) {
            webView.loadUrl(startUrl());
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private String resolveAcceptType(WebChromeClient.FileChooserParams params) {
        if (params == null || params.getAcceptTypes() == null) {
            return "*/*";
        }
        for (String type : params.getAcceptTypes()) {
            if (type != null && !type.isBlank() && type.contains("/")) {
                return type;
            }
        }
        return "*/*";
    }

    private boolean handleExternalUri(Uri uri) {
        if (uri == null || uri.getScheme() == null) {
            return false;
        }
        String scheme = uri.getScheme().toLowerCase(Locale.ROOT);
        if (scheme.equals("http") || scheme.equals("https")) {
            return false;
        }

        try {
            Intent intent;
            if (scheme.equals("intent")) {
                intent = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME);
            } else {
                intent = new Intent(Intent.ACTION_VIEW, uri);
            }
            startActivity(intent);
        } catch (Exception error) {
            Toast.makeText(this, "Không có ứng dụng phù hợp để mở liên kết này.", Toast.LENGTH_SHORT).show();
        }
        return true;
    }

    private void injectBlobDownloadBridge() {
        String script = "(function(){" +
                "if(window.__ncLinkAndroidHookInstalled)return;" +
                "window.__ncLinkAndroidHookInstalled=true;" +
                "async function send(url,name){try{" +
                "var r=await fetch(url);var b=await r.blob();var fr=new FileReader();" +
                "fr.onloadend=function(){var s=String(fr.result||'');var i=s.indexOf(',');" +
                "if(i>=0&&window.NCLinkAndroid){window.NCLinkAndroid.saveBase64(name||'download',b.type||'application/octet-stream',s.substring(i+1));}};" +
                "fr.readAsDataURL(b);" +
                "}catch(e){if(window.NCLinkAndroid)window.NCLinkAndroid.onDownloadError(String(e));}}" +
                "window.__ncLinkAndroidSaveUrl=send;" +
                "document.addEventListener('click',function(ev){" +
                "var t=ev.target;var a=t&&t.closest?t.closest('a[download]'):null;if(!a)return;" +
                "var h=a.href||a.getAttribute('href')||'';" +
                "if(h.indexOf('blob:')===0||h.indexOf('data:')===0){ev.preventDefault();ev.stopPropagation();send(h,a.download||'download');}" +
                "},true);" +
                "})();";
        webView.evaluateJavascript(script, null);
    }

    private void downloadHttp(String url, String userAgent, String contentDisposition, String mimeType) {
        String fileName = sanitizeFileName(URLUtil.guessFileName(url, contentDisposition, mimeType), mimeType);
        PendingHttpDownload task = new PendingHttpDownload(url, userAgent, mimeType, fileName);
        if (needsLegacyStoragePermission()) {
            pendingHttpDownload = task;
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, STORAGE_PERMISSION_REQUEST);
            return;
        }
        enqueueHttpDownload(task);
    }

    private void enqueueHttpDownload(PendingHttpDownload task) {
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(task.url));
            request.setTitle(task.fileName);
            request.setDescription("Đang tải file từ NC-Link");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            if (task.mimeType != null && !task.mimeType.isBlank()) {
                request.setMimeType(task.mimeType);
            }
            if (task.userAgent != null && !task.userAgent.isBlank()) {
                request.addRequestHeader("User-Agent", task.userAgent);
            }
            String cookies = CookieManager.getInstance().getCookie(task.url);
            if (cookies != null && !cookies.isBlank()) {
                request.addRequestHeader("Cookie", cookies);
            }
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, DOWNLOAD_SUBDIR + "/" + task.fileName);
            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            manager.enqueue(request);
            Toast.makeText(this, "Đang tải: " + task.fileName, Toast.LENGTH_SHORT).show();
        } catch (Exception error) {
            Toast.makeText(this, "Không thể tải file.", Toast.LENGTH_LONG).show();
        }
    }

    private boolean needsLegacyStoragePermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
                && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED;
    }

    private void saveBlob(String fileName, String mimeType, String base64Data) {
        String safeName = sanitizeFileName(fileName, mimeType);
        if (needsLegacyStoragePermission()) {
            pendingBlobDownload = new PendingBlobDownload(safeName, mimeType, base64Data);
            runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, STORAGE_PERMISSION_REQUEST));
            return;
        }
        ioExecutor.execute(() -> writeBlobToDownloads(new PendingBlobDownload(safeName, mimeType, base64Data)));
    }

    private void writeBlobToDownloads(PendingBlobDownload task) {
        try {
            byte[] data = Base64.decode(task.base64Data, Base64.DEFAULT);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, task.fileName);
                values.put(MediaStore.Downloads.MIME_TYPE, normalizeMimeType(task.mimeType, task.fileName));
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + DOWNLOAD_SUBDIR);
                values.put(MediaStore.Downloads.IS_PENDING, 1);
                Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) {
                    throw new IllegalStateException("Cannot create download entry");
                }
                try (OutputStream output = resolver.openOutputStream(uri, "w")) {
                    if (output == null) {
                        throw new IllegalStateException("Cannot open download output stream");
                    }
                    output.write(data);
                } catch (Exception error) {
                    resolver.delete(uri, null, null);
                    throw error;
                }
                ContentValues done = new ContentValues();
                done.put(MediaStore.Downloads.IS_PENDING, 0);
                resolver.update(uri, done, null, null);
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), DOWNLOAD_SUBDIR);
                if (!dir.exists() && !dir.mkdirs()) {
                    throw new IllegalStateException("Cannot create download folder");
                }
                File target = uniqueFile(dir, task.fileName);
                try (FileOutputStream output = new FileOutputStream(target)) {
                    output.write(data);
                }
            }
            runOnUiThread(() -> Toast.makeText(this, "Đã lưu vào Downloads/" + DOWNLOAD_SUBDIR + ": " + task.fileName, Toast.LENGTH_LONG).show());
        } catch (Exception error) {
            runOnUiThread(() -> Toast.makeText(this, "Không thể lưu file tải xuống.", Toast.LENGTH_LONG).show());
        }
    }

    private File uniqueFile(File dir, String fileName) {
        File target = new File(dir, fileName);
        if (!target.exists()) {
            return target;
        }
        int dot = fileName.lastIndexOf('.');
        String base = dot > 0 ? fileName.substring(0, dot) : fileName;
        String ext = dot > 0 ? fileName.substring(dot) : "";
        for (int i = 1; i < 1000; i++) {
            target = new File(dir, base + " (" + i + ")" + ext);
            if (!target.exists()) {
                return target;
            }
        }
        return new File(dir, base + "-" + System.currentTimeMillis() + ext);
    }

    private String sanitizeFileName(String fileName, String mimeType) {
        String name = fileName == null ? "" : fileName.trim();
        name = name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
        if (name.isBlank()) {
            name = "download-" + System.currentTimeMillis();
        }
        String lowerMime = mimeType == null ? "" : mimeType.toLowerCase(Locale.ROOT);
        if (!name.contains(".") && lowerMime.contains("spreadsheetml")) {
            name += ".xlsx";
        }
        return name;
    }

    private String normalizeMimeType(String mimeType, String fileName) {
        if (mimeType != null && !mimeType.isBlank() && !mimeType.equals("application/octet-stream")) {
            return mimeType;
        }
        String ext = MimeTypeMap.getFileExtensionFromUrl(fileName);
        String guessed = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext == null ? "" : ext.toLowerCase(Locale.ROOT));
        return guessed == null ? "application/octet-stream" : guessed;
    }

    private void applyImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            );
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveMode();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            finish();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) {
            webView.saveState(outState);
        }
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onPause() {
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (filePathCallback != null) {
            filePathCallback.onReceiveValue(null);
            filePathCallback = null;
        }
        if (webView != null) {
            webView.removeJavascriptInterface("NCLinkAndroid");
            webView.stopLoading();
            webView.destroy();
        }
        ioExecutor.shutdownNow();
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) {
            return;
        }

        Uri[] results = null;
        if (resultCode == RESULT_OK && data != null) {
            ClipData clipData = data.getClipData();
            if (clipData != null) {
                List<Uri> uris = new ArrayList<>();
                for (int i = 0; i < clipData.getItemCount(); i++) {
                    Uri uri = clipData.getItemAt(i).getUri();
                    if (uri != null) {
                        uris.add(uri);
                    }
                }
                results = uris.toArray(new Uri[0]);
            } else if (data.getData() != null) {
                results = new Uri[]{data.getData()};
            }
        }
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != STORAGE_PERMISSION_REQUEST) {
            return;
        }
        boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        if (!granted) {
            pendingBlobDownload = null;
            pendingHttpDownload = null;
            Toast.makeText(this, "Cần quyền lưu trữ để tải file trên Android cũ.", Toast.LENGTH_LONG).show();
            return;
        }
        if (pendingHttpDownload != null) {
            PendingHttpDownload task = pendingHttpDownload;
            pendingHttpDownload = null;
            enqueueHttpDownload(task);
        }
        if (pendingBlobDownload != null) {
            PendingBlobDownload task = pendingBlobDownload;
            pendingBlobDownload = null;
            ioExecutor.execute(() -> writeBlobToDownloads(task));
        }
    }

    private final class DownloadBridge {
        @JavascriptInterface
        public void saveBase64(String fileName, String mimeType, String base64Data) {
            if (base64Data == null || base64Data.isBlank()) {
                return;
            }
            saveBlob(fileName, mimeType, base64Data);
        }

        @JavascriptInterface
        public void onDownloadError(String message) {
            runOnUiThread(() -> Toast.makeText(BaseWebViewActivity.this, "Không thể đọc file tải xuống từ trang web.", Toast.LENGTH_LONG).show());
        }
    }

    private static final class PendingBlobDownload {
        final String fileName;
        final String mimeType;
        final String base64Data;

        PendingBlobDownload(String fileName, String mimeType, String base64Data) {
            this.fileName = fileName;
            this.mimeType = mimeType;
            this.base64Data = base64Data;
        }
    }

    private static final class PendingHttpDownload {
        final String url;
        final String userAgent;
        final String mimeType;
        final String fileName;

        PendingHttpDownload(String url, String userAgent, String mimeType, String fileName) {
            this.url = url;
            this.userAgent = userAgent;
            this.mimeType = mimeType;
            this.fileName = fileName;
        }
    }
}
