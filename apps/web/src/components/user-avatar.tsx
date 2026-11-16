"use client";

import { useMemo } from "react";
import { colorForUserId } from "@collabdesk/shared";
import { dicebearAvatarDataUri } from "@/lib/dicebear-avatar";
import { userInitials } from "@/lib/user-initials";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type UserAvatarProps = {
  seed: string;
  name?: string;
  size?: "default" | "sm" | "lg";
  className?: string;
  fallbackClassName?: string;
  backgroundColor?: string;
};

export function UserAvatar(props: UserAvatarProps) {
  const {
    seed,
    name,
    size = "default",
    className,
    fallbackClassName,
    backgroundColor,
  } = props;

  const resolvedSeed = seed || name || "collabdesk";
  const resolvedBackground =
    backgroundColor ?? colorForUserId(resolvedSeed);

  const src = useMemo(
    () =>
      dicebearAvatarDataUri({
        seed: resolvedSeed,
        backgroundColor: resolvedBackground,
      }),
    [resolvedBackground, resolvedSeed],
  );

  const label = name?.trim() || seed;
  const initials = userInitials(label);

  return (
    <Avatar size={size} className={className}>
      <AvatarImage src={src} alt={label} />
      <AvatarFallback className={cn(fallbackClassName)}>{initials}</AvatarFallback>
    </Avatar>
  );
}
