package com.streama.app;

import androidx.annotation.NonNull;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        String command = data.get("command");

        if ("TORCH_ON".equals(command)) {
            TorchController.setTorch(getApplicationContext(), true);
        } else if ("TORCH_OFF".equals(command)) {
            TorchController.setTorch(getApplicationContext(), false);
        }
    }
}