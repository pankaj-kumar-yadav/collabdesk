"use client";

import type { Role } from "@collabdesk/shared";
import { ROLE_BADGE_CLASS } from "@/constants/role-badge.constant";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RoleBadgeProps = {
  role: Role;
  className?: string;
};

export function RoleBadge(props: RoleBadgeProps) {
  const { role, className } = props;

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] capitalize",
        ROLE_BADGE_CLASS[role],
        className,
      )}
    >
      {role}
    </Badge>
  );
}
