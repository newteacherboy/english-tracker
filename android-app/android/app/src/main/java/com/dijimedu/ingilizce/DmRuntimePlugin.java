package com.dijimedu.ingilizce;

import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DmRuntime")
public class DmRuntimePlugin extends Plugin {
    @Override
    public void load() {
        // Capacitor adds this after its native bridge and before the first navigation.
        bridge.injectScriptBeforeLoad("ingilizce/android-runtime.js");
    }
}
