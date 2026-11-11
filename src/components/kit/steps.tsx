"use client";

import { Steps } from "@ark-ui/react/steps";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type StepItem = {
  title: string;
  description?: string;
};

/**
 * Reference #1 — Steps (Ark UI), re-skinned to our palette.
 * `blue-600` → sage, `gray-100/200` → cream/warm border, dark mode dropped.
 *
 * Controlled by `current`. Pass `readOnly` for timelines (order tracking)
 * where the steps are informational rather than navigable.
 */
export function ProgressSteps({
  items,
  current,
  onStepChange,
  readOnly = false,
  className,
}: {
  items: StepItem[];
  current: number;
  onStepChange?: (step: number) => void;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <Steps.Root
      count={items.length}
      step={current}
      onStepChange={readOnly ? undefined : (details) => onStepChange?.(details.step)}
      className={cn("w-full", className)}
    >
      <Steps.List className="flex items-center">
        {items.map((item, index) => (
          <Steps.Item
            key={item.title}
            index={index}
            className="relative flex items-center not-last:flex-1"
          >
            <Steps.Trigger
              className={cn(
                "group flex items-center gap-3 rounded-md text-left outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                readOnly && "pointer-events-none cursor-default",
              )}
            >
              <Steps.Indicator
                className={cn(
                  "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors duration-200",
                  "data-complete:border-sage data-complete:bg-sage-ink data-complete:text-white",
                  "data-current:border-sage data-current:bg-sage-ink data-current:text-white",
                  "data-incomplete:border-border data-incomplete:bg-cream data-incomplete:text-muted-foreground",
                )}
              >
                <span className="group-data-complete:hidden">{index + 1}</span>
                <Check className="hidden h-4 w-4 group-data-complete:block" aria-hidden />
              </Steps.Indicator>
              <span className="hidden min-w-0 sm:block">
                <span className="block truncate text-sm font-medium text-foreground">
                  {item.title}
                </span>
                {item.description ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </Steps.Trigger>

            {index < items.length - 1 ? (
              <Steps.Separator className="mx-3 h-0.5 flex-1 rounded-full bg-border data-complete:bg-sage" />
            ) : null}
          </Steps.Item>
        ))}
      </Steps.List>
    </Steps.Root>
  );
}
