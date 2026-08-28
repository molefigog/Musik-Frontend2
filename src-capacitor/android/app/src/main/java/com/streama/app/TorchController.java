package com.streama.app;

import android.content.Context;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraManager;
import android.util.Log;

public class TorchController {

    private static final String TAG = "TorchController";

    public static void setTorch(Context context, boolean on) {
        CameraManager cameraManager = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);

        if (cameraManager == null) {
            Log.e(TAG, "CameraManager not available");
            return;
        }

        try {
            String[] cameraIds = cameraManager.getCameraIdList();
            if (cameraIds.length == 0) {
                Log.e(TAG, "No cameras found");
                return;
            }

            // Rear camera (id "0") almost always has the flash unit.
            String cameraId = cameraIds[0];
            cameraManager.setTorchMode(cameraId, on);
        } catch (CameraAccessException e) {
            Log.e(TAG, "Failed to toggle torch", e);
        }
    }
}