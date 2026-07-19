package com.roboticsonphone.app;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NbLog")
public class NbLogPlugin extends Plugin {

    private static final String TAG = "NB_UPLOAD";

    @PluginMethod
    public void log(PluginCall call) {
        String level = call.getString("level", "info");
        String message = call.getString("message", "");
        String tag = call.getString("tag", TAG);

        switch (level) {
            case "debug":
                Log.d(tag, message);
                break;
            case "warn":
                Log.w(tag, message);
                break;
            case "error":
                Log.e(tag, message);
                break;
            case "verbose":
                Log.v(tag, message);
                break;
            default:
                Log.i(tag, message);
                break;
        }

        JSObject result = new JSObject();
        result.put("ok", true);
        call.resolve(result);
    }
}
