"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider(props: ThemeProviderProps) {
  const { children, ...rest } = props;
  return <NextThemesProvider {...rest}>{children}</NextThemesProvider>;
}
