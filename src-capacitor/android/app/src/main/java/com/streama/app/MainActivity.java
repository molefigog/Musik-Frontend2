package com.streama.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TorchPlugin.class);
        registerPlugin(PayPalCardPlugin.class);
        registerPlugin(PayPalWebPlugin.class);
        registerPlugin(ExoAudioPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);

        com.getcapacitor.PluginHandle cardHandle = getBridge().getPlugin("PayPalCard");
        if (cardHandle != null && cardHandle.getInstance() instanceof PayPalCardPlugin) {
            ((PayPalCardPlugin) cardHandle.getInstance()).handleNewIntent(intent);
        }

        com.getcapacitor.PluginHandle webHandle = getBridge().getPlugin("PayPalWeb");
        if (webHandle != null && webHandle.getInstance() instanceof PayPalWebPlugin) {
            ((PayPalWebPlugin) webHandle.getInstance()).handleNewIntent(intent);
        }
    }
}