package com.streama.app;

import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.paypal.android.corepayments.CoreConfig;
import com.paypal.android.corepayments.Environment;
import com.paypal.android.corepayments.Address;
import com.paypal.android.corepayments.PayPalSDKError;
import com.paypal.android.cardpayments.Card;
import com.paypal.android.cardpayments.CardClient;
import com.paypal.android.cardpayments.CardRequest;
import com.paypal.android.cardpayments.CardApproveOrderCallback;
import com.paypal.android.cardpayments.CardApproveOrderResult;
import com.paypal.android.cardpayments.CardFinishApproveOrderResult;
import com.paypal.android.cardpayments.threedsecure.SCA;

@CapacitorPlugin(name = "PayPalCard")
public class PayPalCardPlugin extends Plugin {

    private CardClient cardClient;
    private PluginCall pendingCall;

    @PluginMethod
    public void initialize(PluginCall call) {
        String clientId = call.getString("clientId");
        String envParam = call.getString("environment", "sandbox");

        if (clientId == null || clientId.isEmpty()) {
            call.reject("clientId is required");
            return;
        }

        Environment env = "live".equalsIgnoreCase(envParam) ? Environment.LIVE : Environment.SANDBOX;
        CoreConfig config = new CoreConfig(clientId, env);

        cardClient = new CardClient(getContext(), config);

        call.resolve();
    }

    @PluginMethod
    public void payWithCard(PluginCall call) {
        if (cardClient == null) {
            call.reject("Call initialize() before payWithCard()");
            return;
        }

        String orderId = call.getString("orderId");
        String returnUrl = call.getString("returnUrl");
        JSObject cardObj = call.getObject("card");

        if (orderId == null || returnUrl == null || cardObj == null) {
            call.reject("orderId, returnUrl and card are required");
            return;
        }

        Address billingAddress = null;
        JSObject billing = cardObj.getJSObject("billingAddress");
        if (billing != null) {
            billingAddress = new Address(
                billing.getString("countryCode", ""),
                billing.getString("streetAddress", null),
                billing.getString("extendedAddress", null),
                billing.getString("locality", null),
                billing.getString("region", null),
                billing.getString("postalCode", null)
            );
        }

        Card card = new Card(
            cardObj.getString("number"),
            cardObj.getString("expirationMonth"),
            cardObj.getString("expirationYear"),
            cardObj.getString("securityCode"),
            null,
            billingAddress
        );

        CardRequest request = new CardRequest(orderId, card, returnUrl, SCA.SCA_WHEN_REQUIRED);

        pendingCall = call;
        call.setKeepAlive(true);

        cardClient.approveOrder(request, new CardApproveOrderCallback() {
            @Override
            public void onCardApproveOrderResult(CardApproveOrderResult result) {
                handleApproveOrderResult(result);
            }
        });
    }

    private void handleApproveOrderResult(CardApproveOrderResult result) {
        if (result instanceof CardApproveOrderResult.Success) {
            CardApproveOrderResult.Success success = (CardApproveOrderResult.Success) result;
            resolveSuccess(success.getOrderId(), success.getStatus());

        } else if (result instanceof CardApproveOrderResult.AuthorizationRequired) {
            CardApproveOrderResult.AuthorizationRequired auth =
                (CardApproveOrderResult.AuthorizationRequired) result;
            cardClient.presentAuthChallenge(getActivity(), auth.getAuthChallenge());

        } else if (result instanceof CardApproveOrderResult.Failure) {
            CardApproveOrderResult.Failure failure = (CardApproveOrderResult.Failure) result;
            rejectWithError(failure.getError());
        }
    }

    public void handleNewIntent(Intent intent) {
        if (cardClient == null || pendingCall == null) return;

        CardFinishApproveOrderResult result = cardClient.finishApproveOrder(intent);
        if (result == null) return;

        if (result instanceof CardFinishApproveOrderResult.Success) {
            CardFinishApproveOrderResult.Success success = (CardFinishApproveOrderResult.Success) result;
            resolveSuccess(success.getOrderId(), success.getStatus());

        } else if (result instanceof CardFinishApproveOrderResult.Failure) {
            CardFinishApproveOrderResult.Failure failure = (CardFinishApproveOrderResult.Failure) result;
            rejectWithError(failure.getError());

        } else if (result instanceof CardFinishApproveOrderResult.Canceled) {
            JSObject ret = new JSObject();
            ret.put("cancelled", true);
            pendingCall.resolve(ret);
            pendingCall = null;
        }
    }

    private void resolveSuccess(String orderId, String status) {
        if (pendingCall == null) return;
        JSObject ret = new JSObject();
        ret.put("orderId", orderId);
        ret.put("status", status);
        pendingCall.resolve(ret);
        pendingCall = null;
    }

    private void rejectWithError(PayPalSDKError error) {
        if (pendingCall == null) return;
        pendingCall.reject(error.getErrorDescription(), String.valueOf(error.getCode()));
        pendingCall = null;
    }
}