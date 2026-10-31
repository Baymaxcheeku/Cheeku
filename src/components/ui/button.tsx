import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/cn";

/*
 * Primary buttons are not a flat fill: the frames run a vertical gradient from
 * --brand-600 to --brand-800. Measured, see design/SCREEN_INVENTORY.md §1.
 */
const VARIANTS = {
  primary:
    "bg-gradient-to-b from-brand-600 to-brand-800 text-white shadow-e1 hover:brightness-110 active:brightness-95",
  secondary: "bg-surface text-ink-900 border border-line shadow-e1 hover:bg-surface-tint",
  ghost: "text-brand-600 hover:bg-brand-50",
  // Emergency only. Semantic red is never decorative.
  danger: "bg-danger-strong text-white shadow-e1 hover:brightness-110",
} as const;

const SIZES = {
  lg: "h-14 px-7 text-[17px]",
  md: "h-11 px-5 text-[15px]",
  sm: "h-9 px-4 text-[14px]",
} as const;

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  asChild?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "lg",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-pill font-semibold",
        "tappable",
        /*
         * 0.97, not 0.9. The press needs to be felt rather than watched — a
         * primary CTA that visibly shrinks under a thumb reads as flimsy, and
         * this one is often the last thing tapped before medical data is saved.
         */
        "active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
