package com.streama.app;

import android.app.Activity;
import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.paypal.android.corepayments.CoreConfig;
import com.paypal.android.corepayments.Environment;
import com.paypal.android.paypalwebpayments.PayPalWebCheckoutClient;
import com.paypal.android.paypalwebpayments.PayPalWebCheckoutRequest;
import com.paypal.android.paypalwebpayments.PayPalWebCheckoutFundingSource;
import com.paypal.android.paypalwebpayments.PayPalWebStartCallback;
import com.paypal.android.paypalwebpayments.PayPalPresentAuthChallengeResult;
import com.paypal.android.paypalwebpayments.PayPalWebCheckoutFinishStartResult;

@CapacitorPlugin(name = "PayPalWeb")
public class PayPalWebPlugin extends Plugin {

    private PayPalWebCheckoutClient webClient;

    @PluginMethod
    public void initialize(PluginCall call) {
        String clientId = call.getString("clientId");
        String envParam = call.getString("environment", "sandbox");
        String urlScheme = call.getString("urlScheme");

        if (clientId == null || clientId.isEmpty() || urlScheme == null || urlScheme.isEmpty()) {
            call.reject("clientId and urlScheme are required");
            return;
        }

        Environment env = "live".equalsIgnoreCase(envParam) ? Environment.LIVE : Environment.SANDBOX;
        CoreConfig config = new CoreConfig(clientId, env);

        webClient = new PayPalWebCheckoutClient(getContext(), config, urlScheme);

        call.resolve();
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (webClient == null) {
            call.reject("Call initialize() before start()");
            return;
        }

        String orderId = call.getString("orderId");
        if (orderId == null || orderId.isEmpty()) {
            call.reject("orderId is required");
            return;
        }

        PayPalWebCheckoutRequest request =
            new PayPalWebCheckoutRequest(orderId, PayPalWebCheckoutFundingSource.PAYPAL);

        webClient.start((Activity) getActivity(), request, new PayPalWebStartCallback() {
            @Override
            public void onPayPalWebStartResult(PayPalPresentAuthChallengeResult result) {
                if (result instanceof PayPalPresentAuthChallengeResult.Success) {
                    JSObject ret = new JSObject();
                    ret.put("started", true);
                    call.resolve(ret);

                } else if (result instanceof PayPalPresentAuthChallengeResult.Failure) {
                    PayPalPresentAuthChallengeResult.Failure failure =
                        (PayPalPresentAuthChallengeResult.Failure) result;
                    call.reject(
                        failure.getError().getErrorDescription(),
                        String.valueOf(failure.getError().getCode())
                    );
                }
            }
        });
    }

    /** Forwarded from MainActivity.onNewIntent() for the PayPal browser-switch return. */
    public void handleNewIntent(Intent intent) {
        if (webClient == null) return;

        PayPalWebCheckoutFinishStartResult result = webClient.finishStart(intent);
        if (result == null) return; // not a PayPal web-checkout deep link - ignore

        JSObject ret = new JSObject();

        if (result instanceof PayPalWebCheckoutFinishStartResult.Success) {
            PayPalWebCheckoutFinishStartResult.Success success =
                (PayPalWebCheckoutFinishStartResult.Success) result;
            ret.put("orderId", success.getOrderId());
            ret.put("payerId", success.getPayerId());

        } else if (result instanceof PayPalWebCheckoutFinishStartResult.Failure) {
            PayPalWebCheckoutFinishStartResult.Failure failure =
                (PayPalWebCheckoutFinishStartResult.Failure) result;
            ret.put("error", failure.getError().getErrorDescription());

        } else if (result instanceof PayPalWebCheckoutFinishStartResult.Canceled) {
            ret.put("cancelled", true);

        } else {
            return; // NoResult - nothing to report yet, wait for a later intent
        }

        notifyListeners("paypalWebResult", ret);
    }
}