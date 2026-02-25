"use client";

import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function SettingsPanel() {
  const { settings, updateSettings } = useAppStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Analysis Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">ACOS Target %</label>
            <Input
              type="text"
              inputMode="decimal"
              value={settings.acosTarget}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, "");
                updateSettings({ acosTarget: Number(val) || 0 });
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">Below this = increase bid</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">ACOS Threshold %</label>
            <Input
              type="text"
              inputMode="decimal"
              value={settings.acosThreshold}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, "");
                updateSettings({ acosThreshold: Number(val) || 0 });
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">Above this = lower bid</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Click Threshold</label>
            <Input
              type="text"
              inputMode="numeric"
              value={settings.clickThreshold}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                updateSettings({ clickThreshold: Number(val) || 0 });
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">Min clicks for analysis</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
