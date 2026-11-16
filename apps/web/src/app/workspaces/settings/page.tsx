"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { FormFieldLabel } from "@/components/form-field-label";
import { FadeIn } from "@/components/motion";
import { SETTINGS_FORM_FIELD_INFO } from "@/constants/form-field-info/settings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <FadeIn className="mb-8 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Preferences for your CollabDesk session on this device.
        </p>
      </FadeIn>

      <FadeIn tone="support" delay={0.04} className="max-w-lg">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Appearance</CardTitle>
            <CardDescription>
              Theme also stays available from the header icon.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FormFieldLabel info={SETTINGS_FORM_FIELD_INFO.theme}>
              Theme
            </FormFieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = theme === option.value;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    className={cn(
                      "h-auto flex-col gap-2 py-3 active:scale-[0.97]",
                      selected && "shadow-xs",
                    )}
                    onClick={() => setTheme(option.value)}
                  >
                    <Icon className="size-4" />
                    <span className="text-xs font-medium">{option.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
