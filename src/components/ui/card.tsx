import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-card border border-line bg-surface shadow-e1", className)}
      {...props}
    />
  );
}

export function Tile({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("rounded-tile border border-line bg-surface", className)} {...props} />
  );
}
