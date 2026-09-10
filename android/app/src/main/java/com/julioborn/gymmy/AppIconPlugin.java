package com.julioborn.gymmy;

import android.content.ComponentName;
import android.content.pm.PackageManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppIcon")
public class AppIconPlugin extends Plugin {

    private static final String COMPONENT_DEFAULT   = "com.julioborn.gymmy.MainActivityDefault";
    private static final String COMPONENT_SPORTTIME = "com.julioborn.gymmy.MainActivitySporttime";
    private static final String PREFS_NAME          = "AppIconPrefs";
    private static final String PREFS_KEY           = "currentIcon";

    @PluginMethod
    public void setIcon(PluginCall call) {
        String iconName = call.getString("iconName", "default");
        PackageManager pm = getContext().getPackageManager();
        try {
            boolean useSporttime = "Sporttime".equals(iconName);

            pm.setComponentEnabledSetting(
                new ComponentName(getContext(), COMPONENT_SPORTTIME),
                useSporttime
                    ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                    : PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP
            );
            pm.setComponentEnabledSetting(
                new ComponentName(getContext(), COMPONENT_DEFAULT),
                useSporttime
                    ? PackageManager.COMPONENT_ENABLED_STATE_DISABLED
                    : PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP
            );

            getContext()
                .getSharedPreferences(PREFS_NAME, 0)
                .edit()
                .putString(PREFS_KEY, iconName)
                .apply();

            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void getIcon(PluginCall call) {
        String current = getContext()
            .getSharedPreferences(PREFS_NAME, 0)
            .getString(PREFS_KEY, "default");
        JSObject result = new JSObject();
        result.put("iconName", current);
        call.resolve(result);
    }
}
