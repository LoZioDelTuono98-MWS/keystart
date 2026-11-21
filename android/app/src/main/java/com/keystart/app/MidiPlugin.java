package com.keystart.app;

import android.content.Context;
import android.content.pm.PackageManager;
import android.media.midi.MidiDevice;
import android.media.midi.MidiDeviceInfo;
import android.media.midi.MidiManager;
import android.media.midi.MidiOutputPort;
import android.media.midi.MidiReceiver;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Legge le tastiere MIDI collegate (USB) con le API MIDI di Android
 * e manda le note alla parte web come evento "midi".
 */
@CapacitorPlugin(name = "Midi")
public class MidiPlugin extends Plugin {

    private MidiManager midiManager;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<Integer, MidiDevice> devices = new HashMap<>();
    private final Map<Integer, MidiOutputPort> ports = new HashMap<>();
    private final Map<Integer, String> names = new HashMap<>();

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

    private void open(MidiDeviceInfo info) {
        if (info.getOutputPortCount() == 0 || devices.containsKey(info.getId())) return;
        midiManager.openDevice(info, device -> {
            if (device == null) return;
            MidiOutputPort port = device.openOutputPort(0);
            if (port == null) {
                try { device.close(); } catch (IOException ignored) { }
                return;
            }
            port.connect(new Receiver());
            devices.put(info.getId(), device);
            ports.put(info.getId(), port);
            names.put(info.getId(), nameOf(info));
            sendStatus();
        }, handler);
    }

    private void close(int id) {
        try {
            MidiOutputPort p = ports.remove(id);
            if (p != null) p.close();
            MidiDevice d = devices.remove(id);
            if (d != null) d.close();
        } catch (IOException ignored) { }
        names.remove(id);
        sendStatus();
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
