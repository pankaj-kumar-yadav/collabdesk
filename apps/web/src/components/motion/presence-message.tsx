"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_OUT, MOTION_DURATION_S } from "@/lib/motion";
import { cn } from "@/lib/utils";

type PresenceMessageProps = {
  show: boolean;
  children: React.ReactNode;
  className?: string;
};

/** Enter/exit for occasional banners (errors). Symmetric opacity path. */
export function PresenceMessage(props: PresenceMessageProps) {
  const { show, children, className } = props;
  const reduce = useReducedMotion();
  const y = reduce ? 0 : -4;

  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.div
          key="presence-message"
          className={cn(className)}
          initial={{ opacity: 0, y }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y }}
          transition={{
            duration: MOTION_DURATION_S.fast,
            ease: EASE_OUT,
          }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
