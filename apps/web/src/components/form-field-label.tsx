"use client";

import { CircleHelp } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type FormFieldLabelProps = {
  htmlFor?: string;
  required?: boolean;
  info?: string;
  className?: string;
  children: React.ReactNode;
};

export function FormFieldLabel(props: FormFieldLabelProps) {
  const { htmlFor, required = false, info, className, children } = props;

  return (
    <Label htmlFor={htmlFor} className={cn("gap-1.5", className)}>
      <span className="inline-flex items-center gap-1">
        {children}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      {info ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Field info"
            >
              <CircleHelp className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            {info}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </Label>
  );
}
