import { cn } from "@/lib/utils";

interface SpinnerProps {
  label?: string;
  className?: string;
}

export function Spinner({ label, className }: SpinnerProps) {
  return (
    <div className={cn("inline-flex flex-col items-center gap-3", className)}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}
