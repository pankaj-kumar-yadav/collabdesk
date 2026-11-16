"use client";

import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type CollaborativeEditorPresenceUser = {
  clientId: number;
  id: string;
  name: string;
  color: string;
};

type CollaborativeEditorPresenceProps = {
  presence: CollaborativeEditorPresenceUser[];
  localUserId: string | null;
};

export function CollaborativeEditorPresence(
  props: CollaborativeEditorPresenceProps,
) {
  const { presence, localUserId } = props;

  // Keep self near the end (rightmost), Figma-style.
  const ordered = [...presence].sort((a, b) => {
    const aSelf = a.id === localUserId ? 1 : 0;
    const bSelf = b.id === localUserId ? 1 : 0;
    return aSelf - bSelf;
  });

  return (
    <Card className="gap-0 rounded-full py-0 shadow-xs">
      <CardContent className="flex items-center gap-2 px-2.5 py-1">
        {presence.length === 0 ? (
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            Waiting for collaborators…
          </p>
        ) : (
          <TooltipProvider delayDuration={200}>
            <div
              className="flex items-center"
              aria-label={`${presence.length} online`}
            >
              {ordered.map((u, index) => {
                const isSelf = Boolean(localUserId) && u.id === localUserId;
                const label = isSelf ? `${u.name} (me)` : u.name;
                return (
                  <Tooltip key={`${u.clientId}-${u.id}`}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "relative rounded-full outline-none transition-transform duration-150 ease-out",
                          "hover:z-20 hover:scale-105 focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-ring",
                          index > 0 && "-ml-1.5",
                        )}
                        style={{ zIndex: index + 1 }}
                        aria-label={label}
                      >
                        <UserAvatar
                          size="sm"
                          className="size-6 ring-2 ring-card"
                          seed={u.id || u.name}
                          name={u.name}
                          backgroundColor={u.color}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6}>
                      {label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        )}
        <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          {presence.length} online
        </span>
      </CardContent>
    </Card>
  );
}
