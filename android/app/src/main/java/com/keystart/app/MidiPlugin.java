package com.keystart.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanRecord;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.midi.MidiDevice;
import android.media.midi.MidiDeviceInfo;
import android.media.midi.MidiManager;
import android.media.midi.MidiOutputPort;
import android.media.midi.MidiReceiver;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;
import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Legge le tastiere MIDI (USB e Bluetooth) con le API MIDI di Android
 * e manda le note alla parte web come evento "midi".
 */
@SuppressLint("MissingPermission")
@CapacitorPlugin(
    name = "Midi",
    permissions = {
        @Permission(alias = "ble", strings = { Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT }),
        @Permission(alias = "bleLegacy", strings = { Manifest.permission.ACCESS_FINE_LOCATION }),
    }
)
public class MidiPlugin extends Plugin {

    private static final UUID MIDI_SERVICE = UUID.fromString("03B80E5A-EDE8-4B33-A751-6CE34EC4C700");

    private MidiManager midiManager;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<Integer, MidiDevice> devices = new HashMap<>();
    private final Map<Integer, MidiOutputPort> ports = new HashMap<>();
    private final Map<Integer, String> names = new HashMap<>();
    private boolean scanning = false;

    @Override
    public void load() {
        Context ctx = getContext();
        if (!ctx.getPackageManager().hasSystemFeature(PackageManager.FEATURE_MIDI)) return;
        midiManager = (MidiManager) ctx.getSystemService(Context.MIDI_SERVICE);
        if (midiManager == null) return;

        midiManager.registerDeviceCallback(new MidiManager.DeviceCallback() {
            @Override
            public void onDeviceAdded(MidiDeviceInfo info) { open(info); }

            @Override
            public void onDeviceRemoved(MidiDeviceInfo info) { close(info.getId()); }
        }, handler);

        for (MidiDeviceInfo info : midiManager.getDevices()) open(info);
    }

    // ---------- USB e dispositivi già presenti ----------

    private void open(MidiDeviceInfo info) {
        // i dispositivi Bluetooth li apre connectBle, così non arrivano le note due volte
        if (info.getType() == MidiDeviceInfo.TYPE_BLUETOOTH) return;
        if (info.getOutputPortCount() == 0 || devices.containsKey(info.getId())) return;
        midiManager.openDevice(info, device -> {
            if (device != null) attach(device, nameOf(info));
        }, handler);
    }

    private boolean attach(MidiDevice device, String name) {
        MidiDeviceInfo info = device.getInfo();
        int id = info.getId();
        if (devices.containsKey(id) || info.getOutputPortCount() == 0) {
            if (!devices.containsKey(id)) { try { device.close(); } catch (IOException ignored) { } }
            return devices.containsKey(id);
        }
        MidiOutputPort port = device.openOutputPort(0);
        if (port == null) {
            try { device.close(); } catch (IOException ignored) { }
            return false;
        }
        port.connect(new Receiver());
        devices.put(id, device);
        ports.put(id, port);
        names.put(id, name);
        sendStatus();
        return true;
    }

    private void close(int id) {
        try {
            MidiOutputPort p = ports.remove(id);
            if (p != null) p.close();
            MidiDevice d = devices.remove(id);
            if (d != null) d.close();
        } catch (IOException ignored) { }
        if (names.remove(id) != null) sendStatus();
    }

    private String nameOf(MidiDeviceInfo info) {
        Bundle props = info.getProperties();
        String n = props.getString(MidiDeviceInfo.PROPERTY_PRODUCT);
        if (n == null) n = props.getString(MidiDeviceInfo.PROPERTY_NAME);
        return n == null ? "Tastiera MIDI" : n;
    }

    private JSObject status() {
        JSObject o = new JSObject();
        JSArray arr = new JSArray();
        for (String n : names.values()) arr.put(n);
        o.put("supported", midiManager != null);
        o.put("devices", arr);
        return o;
    }

    private void sendStatus() {
        notifyListeners("status", status());
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    // ---------- Bluetooth ----------

    private String bleAlias() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? "ble" : "bleLegacy";
    }

    @PluginMethod
    public void scanBle(PluginCall call) {
        if (midiManager == null) { call.reject("Questo telefono non supporta il MIDI."); return; }
        if (getPermissionState(bleAlias()) != PermissionState.GRANTED) {
            requestPermissionForAlias(bleAlias(), call, "scanPerms");
            return;
        }
        doScan(call);
    }

    @PermissionCallback
    private void scanPerms(PluginCall call) {
        if (getPermissionState(bleAlias()) == PermissionState.GRANTED) doScan(call);
        else call.reject("Serve il permesso per i dispositivi nelle vicinanze.");
    }

    private BluetoothAdapter adapter() {
        BluetoothManager bm = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        return bm == null ? null : bm.getAdapter();
    }

    private void doScan(PluginCall call) {
        BluetoothAdapter ad = adapter();
        if (ad == null) { call.reject("Questo telefono non ha il Bluetooth."); return; }
        if (!ad.isEnabled()) { call.reject("Il Bluetooth del telefono è spento: accendilo e riprova."); return; }
        BluetoothLeScanner scanner = ad.getBluetoothLeScanner();
        if (scanner == null) { call.reject("Scansione Bluetooth non disponibile."); return; }
        if (scanning) { call.reject("Sto già cercando…"); return; }

        final Map<String, String> found = new LinkedHashMap<>();
        final ScanCallback cb = new ScanCallback() {
            @Override
            public void onScanResult(int type, ScanResult r) {
                BluetoothDevice d = r.getDevice();
                String name = null;
                ScanRecord rec = r.getScanRecord();
                if (rec != null) name = rec.getDeviceName();
                if (name == null) { try { name = d.getName(); } catch (SecurityException ignored) { } }
                found.put(d.getAddress(), name == null ? "Tastiera MIDI" : name);
            }
        };
        ScanFilter filter = new ScanFilter.Builder().setServiceUuid(new ParcelUuid(MIDI_SERVICE)).build();
        ScanSettings settings = new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build();
        try {
            scanner.startScan(Collections.singletonList(filter), settings, cb);
        } catch (SecurityException e) {
            call.reject("Permesso Bluetooth mancante.");
            return;
        }
        scanning = true;
        handler.postDelayed(() -> {
            try { scanner.stopScan(cb); } catch (Exception ignored) { }
            scanning = false;
            JSArray arr = new JSArray();
            for (Map.Entry<String, String> e : found.entrySet()) {
                JSObject o = new JSObject();
                o.put("address", e.getKey());
                o.put("name", e.getValue());
                arr.put(o);
            }
            JSObject res = new JSObject();
            res.put("devices", arr);
            call.resolve(res);
        }, 10000);
    }

    @PluginMethod
    public void connectBle(PluginCall call) {
        String address = call.getString("address");
        BluetoothAdapter ad = adapter();
        if (midiManager == null || ad == null || address == null) { call.reject("Bluetooth non disponibile."); return; }
        if (getPermissionState(bleAlias()) != PermissionState.GRANTED) { call.reject("Serve il permesso Bluetooth."); return; }
        BluetoothDevice dev;
        String name;
        try {
            dev = ad.getRemoteDevice(address);
            name = dev.getName();
        } catch (Exception e) {
            call.reject("Indirizzo non valido.");
            return;
        }
        final String label = name == null ? "Tastiera Bluetooth" : name;
        midiManager.openBluetoothDevice(dev, device -> {
            if (device == null) { call.reject("La tastiera non risponde."); return; }
            if (attach(device, label)) call.resolve(status());
            else call.reject("La tastiera non manda note.");
        }, handler);
    }

    // ---------- Barre di sistema (tema chiaro / scuro) ----------

    @PluginMethod
    public void setBars(PluginCall call) {
        final boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", true));
        final String color = call.getString("color", "#000000");
        getActivity().runOnUiThread(() -> {
            Window w = getActivity().getWindow();
            WindowInsetsControllerCompat c = WindowCompat.getInsetsController(w, w.getDecorView());
            c.setAppearanceLightStatusBars(!dark);
            c.setAppearanceLightNavigationBars(!dark);
            try { w.getDecorView().setBackgroundColor(Color.parseColor(color)); } catch (Exception ignored) { }
            call.resolve();
        });
    }

    /** Spacchetta i byte MIDI e inoltra note on / note off. */
    private class Receiver extends MidiReceiver {
        private int running = 0;

        @Override
        public void onSend(byte[] msg, int offset, int count, long timestamp) {
            int i = offset;
            int end = offset + count;
            while (i < end) {
                int b = msg[i] & 0xFF;
                int status;
                if (b >= 0x80) {
                    status = b;
                    i++;
                    if (b >= 0xF0) {            // messaggi di sistema: salta
                        if (b < 0xF8) running = 0;
                        continue;
                    }
                    running = status;
                } else {
                    status = running;           // running status
                    if (status == 0) { i++; continue; }
                }
                int cmd = status & 0xF0;
                int len = (cmd == 0xC0 || cmd == 0xD0) ? 1 : 2;
                if (i + len > end) break;
                int d1 = msg[i] & 0x7F;
                int d2 = len == 2 ? (msg[i + 1] & 0x7F) : 0;
                i += len;
                if (cmd == 0x90 || cmd == 0x80) {
                    JSObject ev = new JSObject();
                    ev.put("status", status);
                    ev.put("d1", d1);
                    ev.put("d2", d2);
                    handler.post(() -> notifyListeners("midi", ev));
                }
            }
        }
    }
}
