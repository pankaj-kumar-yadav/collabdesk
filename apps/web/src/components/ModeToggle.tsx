"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EASE_OUT, MOTION_DURATION_S } from "@/lib/motion";

export function ModeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="relative overflow-hidden"
          aria-label="Toggle theme"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={isDark ? "moon" : "sun"}
              className="inline-flex"
              initial={{
                opacity: 0,
                rotate: reduce ? 0 : isDark ? 45 : -45,
                scale: reduce ? 1 : 0.92,
              }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{
                opacity: 0,
                rotate: reduce ? 0 : isDark ? -45 : 45,
                scale: reduce ? 1 : 0.92,
              }}
              transition={{
                duration: MOTION_DURATION_S.fast,
                ease: EASE_OUT,
              }}
            >
              {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </motion.span>
          </AnimatePresence>
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
