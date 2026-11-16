import { createAuthClient } from "better-auth/react";
import { getApiUrl, getToken, setToken } from "./api";

export const authClient = createAuthClient({
  baseURL: getApiUrl(),
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => getToken() ?? "",
    },
    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get("set-auth-token");
      if (authToken) setToken(authToken);
    },
  },
});
