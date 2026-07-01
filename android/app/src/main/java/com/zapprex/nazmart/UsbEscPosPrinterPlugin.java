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
import java.util.Map;

@CapacitorPlugin(name = "UsbEscPosPrinter")
public class UsbEscPosPrinterPlugin extends Plugin {

    private static final String ACTION_USB_PERMISSION = "com.zapprex.nazmart.USB_PERMISSION";
    private BroadcastReceiver usbReceiver;

    @PluginMethod
    public void getDevices(PluginCall call) {
        UsbManager usbManager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        if (usbManager == null) {
            call.reject("UsbManager not available");
            return;
        }

        HashMap<String, UsbDevice> deviceList = usbManager.getDeviceList();
        JSArray devicesArray = new JSArray();

        for (Map.Entry<String, UsbDevice> entry : deviceList.entrySet()) {
            UsbDevice device = entry.getValue();
            if (isPrinterDevice(device)) {
                JSObject deviceObj = new JSObject();
                deviceObj.put("deviceName", device.getDeviceName());
                deviceObj.put("vendorId", device.getVendorId());
                deviceObj.put("productId", device.getProductId());
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    deviceObj.put("productName", device.getProductName());
                    deviceObj.put("manufacturerName", device.getManufacturerName());
                }
                devicesArray.put(deviceObj);
            }
        }

        JSObject ret = new JSObject();
        ret.put("devices", devicesArray);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Integer vendorId = call.getInt("vendorId");
        Integer productId = call.getInt("productId");

        if (vendorId == null || productId == null) {
            call.reject("Must provide vendorId and productId");
            return;
        }

        UsbManager usbManager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        if (usbManager == null) {
            call.reject("UsbManager not available");
            return;
        }

        UsbDevice targetDevice = null;
        for (UsbDevice device : usbManager.getDeviceList().values()) {
            if (device.getVendorId() == vendorId && device.getProductId() == productId) {
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

        // Register receiver for permission result
        usbReceiver = new BroadcastReceiver() {
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (ACTION_USB_PERMISSION.equals(action)) {
                    synchronized (this) {
                        UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                        if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                            if (device != null) {
                                JSObject ret = new JSObject();
                                ret.put("granted", true);
                                call.resolve(ret);
                            } else {
                                call.reject("Permission granted but device is null");
                            }
                        } else {
                            call.reject("Permission denied by user");
                        }
                    }
                }
                getContext().unregisterReceiver(this);
                usbReceiver = null;
            }
        };

        IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
        int flags = 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags = PendingIntent.FLAG_MUTABLE;
        }
        
        if (Build.VERSION.SDK_INT >= 33) {
            // Android 13+ requires specifying export flag for receivers
            getContext().registerReceiver(usbReceiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            getContext().registerReceiver(usbReceiver, filter);
        }

        PendingIntent permissionIntent = PendingIntent.getBroadcast(getContext(), 0, new Intent(ACTION_USB_PERMISSION), flags);
        usbManager.requestPermission(targetDevice, permissionIntent);
    }

    private boolean isPrinterDevice(UsbDevice device) {
        if (device.getDeviceClass() == UsbConstants.USB_CLASS_PRINTER) {
            return true;
        }
        for (int i = 0; i < device.getInterfaceCount(); i++) {
            UsbInterface iface = device.getInterface(i);
            if (iface.getInterfaceClass() == UsbConstants.USB_CLASS_PRINTER) {
                return true;
            }
        }
        return false;
    }

    @PluginMethod
    public void print(PluginCall call) {
        Integer vendorId = call.getInt("vendorId");
        Integer productId = call.getInt("productId");
        String dataBase64 = call.getString("data");

        if (vendorId == null || productId == null || dataBase64 == null) {
            call.reject("Must provide vendorId, productId, and data");
            return;
        }

        byte[] data;
        try {
            data = Base64.decode(dataBase64, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            call.reject("Invalid base64 data");
            return;
        }

        UsbManager usbManager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        if (usbManager == null) {
            call.reject("UsbManager not available");
            return;
        }

        UsbDevice targetDevice = null;
        for (UsbDevice device : usbManager.getDeviceList().values()) {
            if (device.getVendorId() == vendorId && device.getProductId() == productId) {
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
                    if (endpoint.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK &&
                        endpoint.getDirection() == UsbConstants.USB_DIR_OUT) {
                        usbInterface = iface;
                        outEndpoint = endpoint;
                        break;
                    }
                }
            }
            if (outEndpoint != null) break;
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

            int bytesSent = connection.bulkTransfer(outEndpoint, data, data.length, 5000);
            
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
