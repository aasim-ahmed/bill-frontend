package com.zapprex.nazmart;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Base64;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "BluetoothEscPosPrinter",
    permissions = {
        @Permission(
            strings = {
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.ACCESS_FINE_LOCATION
            },
            alias = "bluetooth_legacy"
        ),
        @Permission(
            strings = {
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            },
            alias = "bluetooth_modern"
        )
    }
)
public class BluetoothEscPosPrinterPlugin extends Plugin {

    private BluetoothAdapter bluetoothAdapter;
    private BroadcastReceiver scanReceiver;
    private PluginCall savedScanCall;

    private BluetoothSocket bluetoothSocket;
    private OutputStream outputStream;
    private ExecutorService executorService = Executors.newSingleThreadExecutor();
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    @Override
    public void load() {
        BluetoothManager bluetoothManager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        if (bluetoothManager != null) {
            bluetoothAdapter = bluetoothManager.getAdapter();
        }
    }

    @PluginMethod
    public void requestBluetoothPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (getPermissionState("bluetooth_modern") != com.getcapacitor.PermissionState.GRANTED) {
                requestPermissionForAlias("bluetooth_modern", call, "modernPermissionCallback");
            } else {
                JSObject ret = new JSObject();
                ret.put("connectGranted", true);
                ret.put("scanGranted", true);
                call.resolve(ret);
            }
        } else {
            if (getPermissionState("bluetooth_legacy") != com.getcapacitor.PermissionState.GRANTED) {
                requestPermissionForAlias("bluetooth_legacy", call, "legacyPermissionCallback");
            } else {
                JSObject ret = new JSObject();
                ret.put("connectGranted", true);
                ret.put("scanGranted", true);
                call.resolve(ret);
            }
        }
    }

    @PermissionCallback
    private void modernPermissionCallback(PluginCall call) {
        boolean granted = getPermissionState("bluetooth_modern") == com.getcapacitor.PermissionState.GRANTED;
        JSObject ret = new JSObject();
        ret.put("connectGranted", granted);
        ret.put("scanGranted", granted);
        call.resolve(ret);
    }

    @PermissionCallback
    private void legacyPermissionCallback(PluginCall call) {
        boolean granted = getPermissionState("bluetooth_legacy") == com.getcapacitor.PermissionState.GRANTED;
        JSObject ret = new JSObject();
        ret.put("connectGranted", granted);
        ret.put("scanGranted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void isBluetoothSupported(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("supported", bluetoothAdapter != null);
        call.resolve(ret);
    }

    @PluginMethod
    public void isBluetoothEnabled(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth not supported");
            return;
        }
        JSObject ret = new JSObject();
        ret.put("enabled", bluetoothAdapter.isEnabled());
        call.resolve(ret);
    }

    @PluginMethod
    public void enableBluetooth(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth not supported");
            return;
        }

        if (bluetoothAdapter.isEnabled()) {
            call.resolve();
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                call.reject("Permission denied: BLUETOOTH_CONNECT");
                return;
            }
        }

        Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
        getActivity().startActivityForResult(enableBtIntent, 1);
        call.resolve();
    }

    @PluginMethod
    public void getPairedDevices(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth not supported");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                call.reject("Permission denied: BLUETOOTH_CONNECT");
                return;
            }
        }

        Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
        JSArray devicesArray = new JSArray();

        if (pairedDevices != null) {
            for (BluetoothDevice device : pairedDevices) {
                JSObject obj = new JSObject();
                obj.put("name", device.getName());
                obj.put("address", device.getAddress());
                devicesArray.put(obj);
            }
        }

        JSObject ret = new JSObject();
        ret.put("devices", devicesArray);
        call.resolve(ret);
    }

    @PluginMethod
    public void scanDevices(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth not supported");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                call.reject("Permission denied: BLUETOOTH_SCAN or BLUETOOTH_CONNECT");
                return;
            }
        } else {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                call.reject("Permission denied: ACCESS_FINE_LOCATION");
                return;
            }
        }

        if (bluetoothAdapter.isDiscovering()) {
            bluetoothAdapter.cancelDiscovery();
        }

        savedScanCall = call;
        JSArray devicesArray = new JSArray();

        scanReceiver = new BroadcastReceiver() {
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (BluetoothDevice.ACTION_FOUND.equals(action)) {
                    BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                    if (device != null && device.getName() != null) {
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                                return;
                            }
                            JSObject obj = new JSObject();
                            obj.put("name", device.getName());
                            obj.put("address", device.getAddress());
                            obj.put("bonded", device.getBondState() == BluetoothDevice.BOND_BONDED);
                            devicesArray.put(obj);
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(action)) {
                    getContext().unregisterReceiver(this);
                    scanReceiver = null;
                    if (savedScanCall != null) {
                        JSObject ret = new JSObject();
                        ret.put("devices", devicesArray);
                        savedScanCall.resolve(ret);
                        savedScanCall = null;
                    }
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(BluetoothDevice.ACTION_FOUND);
        filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
        
        getContext().registerReceiver(scanReceiver, filter);

        if (!bluetoothAdapter.startDiscovery()) {
            if (scanReceiver != null) {
                getContext().unregisterReceiver(scanReceiver);
                scanReceiver = null;
            }
            call.reject("Discovery failed to start");
            savedScanCall = null;
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.isEmpty()) {
            call.reject("Must provide address");
            return;
        }

        if (bluetoothAdapter == null) {
            call.reject("Bluetooth not supported");
            return;
        }

        if (!bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is disabled");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                call.reject("Permission denied: BLUETOOTH_CONNECT");
                return;
            }
        }

        if (bluetoothAdapter.isDiscovering()) {
            bluetoothAdapter.cancelDiscovery();
        }

        BluetoothDevice device;
        try {
            device = bluetoothAdapter.getRemoteDevice(address);
        } catch (IllegalArgumentException e) {
            call.reject("Invalid MAC address");
            return;
        }

        executorService.execute(() -> {
            try {
                disconnectInternal();

                // Create socket using reflection or standard UUID for SPP.
                // Modern Android allows standard SPP UUID.
                BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                socket.connect();

                bluetoothSocket = socket;
                outputStream = socket.getOutputStream();

                JSObject ret = new JSObject();
                ret.put("connected", true);
                ret.put("address", device.getAddress());

                // Check permission to read device name to avoid security exceptions
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED) {
                    try {
                        ret.put("name", device.getName());
                    } catch (SecurityException ignored) {
                        ret.put("name", "Unknown");
                    }
                } else {
                    ret.put("name", "Unknown");
                }
                
                call.resolve(ret);
            } catch (Exception e) {
                disconnectInternal();
                call.reject("Connection failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        executorService.execute(() -> {
            disconnectInternal();
            JSObject ret = new JSObject();
            ret.put("disconnected", true);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void isConnected(PluginCall call) {
        JSObject ret = new JSObject();
        boolean connected = bluetoothSocket != null && bluetoothSocket.isConnected();
        ret.put("connected", connected);
        call.resolve(ret);
    }

    @PluginMethod
    public void print(PluginCall call) {
        String dataBase64 = call.getString("data");
        if (dataBase64 == null) {
            call.reject("Must provide data");
            return;
        }

        byte[] data;
        try {
            data = Base64.decode(dataBase64, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            call.reject("Invalid Base64 data");
            return;
        }

        executorService.execute(() -> {
            if (bluetoothSocket == null || !bluetoothSocket.isConnected() || outputStream == null) {
                call.reject("Not connected to printer");
                return;
            }

            try {
                outputStream.write(data);
                outputStream.flush();

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("bytesSent", data.length);
                call.resolve(ret);
            } catch (Exception e) {
                disconnectInternal(); // Clean up if write fails
                call.reject("Write failure: " + e.getMessage());
            }
        });
    }

    private void disconnectInternal() {
        if (outputStream != null) {
            try { outputStream.flush(); } catch (Exception ignored) {}
            try { outputStream.close(); } catch (Exception ignored) {}
            outputStream = null;
        }
        if (bluetoothSocket != null) {
            try { bluetoothSocket.close(); } catch (Exception ignored) {}
            bluetoothSocket = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (scanReceiver != null) {
            try {
                getContext().unregisterReceiver(scanReceiver);
            } catch (Exception ignored) {}
            scanReceiver = null;
        }
        disconnectInternal();
        if (executorService != null) {
            executorService.shutdown();
        }
        super.handleOnDestroy();
    }
}
