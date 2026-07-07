package com.zapprex.nazmart;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(UsbEscPosPrinterPlugin.class);
        registerPlugin(BluetoothEscPosPrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}