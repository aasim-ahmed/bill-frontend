package com.zapprex.nazmart;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.os.Build;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashMap;

@CapacitorPlugin(name = "UsbEscPosPrinter")
public class UsbEscPosPrinterPlugin extends Plugin {

    private static final String ACTION_USB_PERMISSION =
            "com.zapprex.nazmart.USB_PERMISSION";

    private BroadcastReceiver usbReceiver;

    @PluginMethod
    public void getDevices(PluginCall call) {

        try {

            UsbManager usbManager =
                    (UsbManager) getContext().getSystemService(Context.USB_SERVICE);

            if (usbManager == null) {
                call.reject("UsbManager not available");
                return;
            }

            HashMap<String, UsbDevice> deviceList = usbManager.getDeviceList();

            JSArray devicesArray = new JSArray();

            for (UsbDevice device : deviceList.values()) {

                JSObject obj = new JSObject();

                obj.put("deviceName", device.getDeviceName());
                obj.put("vendorId", device.getVendorId());
                obj.put("productId", device.getProductId());

                devicesArray.put(obj);
            }

            JSObject ret = new JSObject();
            ret.put("devices", devicesArray);

            call.resolve(ret);

        } catch (Throwable e) {

            e.printStackTrace();
            call.reject(e.toString());

        }
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {

        try {

            Integer vendorId = call.getInt("vendorId");
            Integer productId = call.getInt("productId");

            if (vendorId == null || productId == null) {
                call.reject("Must provide vendorId and productId");
                return;
            }

            UsbManager usbManager =
                    (UsbManager) getContext().getSystemService(Context.USB_SERVICE);

            if (usbManager == null) {
                call.reject("UsbManager not available");
                return;
            }

            UsbDevice targetDevice = null;

            for (UsbDevice device : usbManager.getDeviceList().values()) {

                if (device.getVendorId() == vendorId &&
                        device.getProductId() == productId) {

                    targetDevice = device;
                    break;
                }
            }

            if (targetDevice == null) {
                call.reject("Device not found");
                return;
            }

            if (usbManager.hasPermission(targetDevice)) {

                JSObject ret = new JSObject();
                ret.put("granted", true);
                call.resolve(ret);
                return;
            }

            final UsbDevice finalDevice = targetDevice;

            usbReceiver = new BroadcastReceiver() {

                @Override
                public void onReceive(Context context, Intent intent) {

                    if (ACTION_USB_PERMISSION.equals(intent.getAction())) {

                        synchronized (this) {

                            boolean permissionGranted = intent.getBooleanExtra(
                                    UsbManager.EXTRA_PERMISSION_GRANTED, false);

                            if (permissionGranted) {

                                JSObject ret = new JSObject();
                                ret.put("granted", true);
                                call.resolve(ret);

                            } else {

                                call.reject("Permission denied by user");
                            }
                        }
                    }

                    try {
                        getContext().unregisterReceiver(this);
                    } catch (Exception ignored) {}

                    usbReceiver = null;
                }
            };

            // Build explicit Intent — required on Android 14+ (API 34).
            // An implicit PendingIntent with FLAG_MUTABLE is disallowed on U+.
            Intent permissionIntentBase = new Intent(ACTION_USB_PERMISSION);
            permissionIntentBase.setPackage(getContext().getPackageName());

            // Build PendingIntent flags.
            // FLAG_UPDATE_CURRENT is always set.
            // FLAG_MUTABLE is required on Android 12+ (API 31) so the system
            // can fill in the USB device extras before delivering the intent.
            int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                pendingFlags |= PendingIntent.FLAG_MUTABLE;
            }

            PendingIntent permissionIntent = PendingIntent.getBroadcast(
                    getContext(),
                    0,
                    permissionIntentBase,
                    pendingFlags
            );

            // Register BroadcastReceiver.
            // RECEIVER_NOT_EXPORTED on Android 13+ (API 33): the broadcast is sent
            // by the system via the explicit package match, so we do NOT need
            // RECEIVER_EXPORTED and using it would be a security risk.
            IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);

            if (Build.VERSION.SDK_INT >= 33) {
                getContext().registerReceiver(
                        usbReceiver,
                        filter,
                        Context.RECEIVER_NOT_EXPORTED
                );
            } else {
                getContext().registerReceiver(usbReceiver, filter);
            }

            usbManager.requestPermission(finalDevice, permissionIntent);

        } catch (Throwable e) {

            e.printStackTrace();
            call.reject("requestPermission failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void print(PluginCall call) {

        Integer vendorId = call.getInt("vendorId");
        Integer productId = call.getInt("productId");
        String dataBase64 = call.getString("data");

        if (vendorId == null || productId == null || dataBase64 == null) {
            call.reject("Must provide vendorId, productId and data");
            return;
        }

        byte[] data;

        try {
            data = Base64.decode(dataBase64, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            call.reject("Invalid Base64 data");
            return;
        }

        UsbManager usbManager =
                (UsbManager) getContext().getSystemService(Context.USB_SERVICE);

        if (usbManager == null) {
            call.reject("UsbManager not available");
            return;
        }

        UsbDevice targetDevice = null;

        for (UsbDevice device : usbManager.getDeviceList().values()) {

            if (device.getVendorId() == vendorId &&
                    device.getProductId() == productId) {

                targetDevice = device;
                break;
            }
        }

        if (targetDevice == null) {
            call.reject("Device not found");
            return;
        }

        if (!usbManager.hasPermission(targetDevice)) {
            call.reject("Permission denied");
            return;
        }

        UsbInterface usbInterface = null;
        UsbEndpoint outEndpoint = null;

        for (int i = 0; i < targetDevice.getInterfaceCount(); i++) {

            UsbInterface iface = targetDevice.getInterface(i);

            if (iface.getInterfaceClass() == UsbConstants.USB_CLASS_PRINTER) {

                for (int j = 0; j < iface.getEndpointCount(); j++) {

                    UsbEndpoint endpoint = iface.getEndpoint(j);

                    if (endpoint.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK
                            && endpoint.getDirection() == UsbConstants.USB_DIR_OUT) {

                        usbInterface = iface;
                        outEndpoint = endpoint;
                        break;
                    }
                }
            }

            if (outEndpoint != null) {
                break;
            }
        }

        if (usbInterface == null || outEndpoint == null) {
            call.reject("Printer interface or Bulk OUT endpoint not found");
            return;
        }

        UsbDeviceConnection connection = usbManager.openDevice(targetDevice);

        if (connection == null) {
            call.reject("Connection failed");
            return;
        }

        boolean claimed = false;

        try {

            claimed = connection.claimInterface(usbInterface, true);

            if (!claimed) {
                call.reject("Failed to claim interface");
                return;
            }

            int bytesSent =
                    connection.bulkTransfer(outEndpoint, data, data.length, 5000);

            if (bytesSent >= 0) {

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("bytesSent", bytesSent);

                call.resolve(ret);

            } else {

                call.reject("Write failure");
            }

        } finally {

            if (claimed) {
                connection.releaseInterface(usbInterface);
            }

            connection.close();
        }
    }
}