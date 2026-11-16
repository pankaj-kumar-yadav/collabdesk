export const APP_ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  WORKSPACES: "/workspaces",
  SETTINGS: "/workspaces/settings",
  workspace: (workspaceId: string) => `/workspaces/${workspaceId}` as const,
} as const;
