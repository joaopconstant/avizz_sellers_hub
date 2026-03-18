import { cn } from "@/lib/utils";

interface EmptyStateProps {
  message: string;
  hint?: string;
  className?: string;
}

export function EmptyState({ message, hint, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">{message}</p>
      {hint && (
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      )}
    </div>
  );
}
