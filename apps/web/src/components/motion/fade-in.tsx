"use client";

import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT, MOTION_DURATION_S } from "@/lib/motion";
import { cn } from "@/lib/utils";

type FadeInProps = {
  children: React.ReactNode;
  className?: string;
  /** Slightly shorter travel for support content. */
  tone?: "lead" | "support";
  delay?: number;
};

export function FadeIn(props: FadeInProps) {
  const { children, className, tone = "lead", delay = 0 } = props;
  const reduce = useReducedMotion();
  const y = reduce ? 0 : tone === "lead" ? 8 : 6;
  const scale = reduce ? 1 : tone === "lead" ? 0.98 : 1;

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y, scale }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: MOTION_DURATION_S.enter,
        ease: EASE_OUT,
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}
