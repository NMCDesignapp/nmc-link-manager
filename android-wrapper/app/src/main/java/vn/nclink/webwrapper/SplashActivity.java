package vn.nclink.webwrapper;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.widget.ImageView;

import java.io.InputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

public class SplashActivity extends Activity {
    private static final long SPLASH_MS = 1100L;
    private static final String PACKAGED_SPLASH_ENTRY = "res/Yh.png";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);

        ImageView image = new ImageView(this);
        image.setBackgroundColor(Color.BLACK);
        image.setScaleType(ImageView.ScaleType.CENTER_CROP);

        Bitmap splash = loadPackagedSplash();
        if (splash != null) image.setImageBitmap(splash);

        setContentView(image, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            startActivity(new Intent(this, MainActivity.class));
            finish();
        }, SPLASH_MS);
    }

    private Bitmap loadPackagedSplash() {
        try (ZipFile apk = new ZipFile(getApplicationInfo().sourceDir)) {
            ZipEntry entry = apk.getEntry(PACKAGED_SPLASH_ENTRY);
            if (entry == null) return null;
            try (InputStream input = apk.getInputStream(entry)) {
                return BitmapFactory.decodeStream(input);
            }
        } catch (Exception ignored) {
            return null;
        }
    }
}
