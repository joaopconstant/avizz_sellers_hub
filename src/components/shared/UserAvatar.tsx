import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: { container: "w-8 h-8", image: 32, text: "text-xs" },
  md: { container: "w-10 h-10", image: 40, text: "text-sm" },
  lg: { container: "w-16 h-16", image: 64, text: "text-lg" },
} as const;

interface UserAvatarProps {
  name: string;
  url?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({ name, url, size = "md", className }: UserAvatarProps) {
  const { container, image, text } = SIZE_CLASSES[size];

  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={image}
        height={image}
        className={cn(container, "rounded-full object-cover ring-2 ring-primary/40", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        container,
        text,
        "rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary ring-2 ring-primary/20",
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
