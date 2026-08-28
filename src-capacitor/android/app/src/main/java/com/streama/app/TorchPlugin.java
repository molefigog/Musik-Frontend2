package com.streama.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Torch")
public class TorchPlugin extends Plugin {

    @PluginMethod
    public void on(PluginCall call) {
        TorchController.setTorch(getContext(), true);
        call.resolve();
    }

    @PluginMethod
    public void off(PluginCall call) {
        TorchController.setTorch(getContext(), false);
        call.resolve();
    }
}