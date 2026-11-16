import { UserAvatar } from "@/components/user-avatar";

export type CollaborativeEditorPresenceUser = {
  clientId: number;
  id: string;
  name: string;
  color: string;
};

type CollaborativeEditorPresenceProps = {
  presence: CollaborativeEditorPresenceUser[];
};

export function CollaborativeEditorPresence(
  props: CollaborativeEditorPresenceProps,
) {
  const { presence } = props;

  return (
    <div className="border-t border-border/80 bg-background/50 px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Presence</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {presence.length} online
        </p>
      </div>
      {presence.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Waiting for collaborators…
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {presence.map((u) => (
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card py-1 pr-2.5 pl-1 text-xs"
              key={`${u.clientId}-${u.id}`}
            >
              <UserAvatar
                size="sm"
                className="size-5"
                seed={u.id || u.name}
                name={u.name}
                backgroundColor={u.color}
              />
              <span className="max-w-[8rem] truncate">{u.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
