package vn.nclink.webwrapper;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.widget.ImageView;

public class SplashActivity extends Activity {
    private static final long SPLASH_MS = 1100L;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);

        ImageView image = new ImageView(this);
        image.setBackgroundColor(Color.BLACK);
        image.setImageResource(R.drawable.splash_screen);
        image.setScaleType(ImageView.ScaleType.CENTER_CROP);
        setContentView(image, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            startActivity(new Intent(this, MainActivity.class));
            finish();
        }, SPLASH_MS);
    }
}
