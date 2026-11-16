"use client";

import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT, MOTION_DURATION_S, staggerDelay } from "@/lib/motion";
import { cn } from "@/lib/utils";

type StaggerRootProps = {
  children: React.ReactNode;
  className?: string;
};

/** Container only — no parent entrance (choreograph: one entrance per container). */
export function StaggerRoot(props: StaggerRootProps) {
  const { children, className } = props;
  return <div className={cn(className)}>{children}</div>;
}

type StaggerItemProps = {
  children: React.ReactNode;
  className?: string;
  index: number;
};

export function StaggerItem(props: StaggerItemProps) {
  const { children, className, index } = props;
  const reduce = useReducedMotion();
  const y = reduce ? 0 : index === 0 ? 8 : 5;

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: MOTION_DURATION_S.enter,
        ease: EASE_OUT,
        delay: reduce ? 0 : staggerDelay(index),
      }}
    >
      {children}
    </motion.div>
  );
}
