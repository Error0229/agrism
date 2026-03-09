"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

interface CropAvatarProps {
  name: string;
  emoji?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  color?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  priority?: boolean;
}

const SIZE_STYLES = {
  sm: "size-8 rounded-md text-base",
  md: "size-10 rounded-lg text-xl",
  lg: "size-11 rounded-lg text-2xl",
  xl: "size-16 rounded-xl text-4xl",
} as const;

export function CropAvatar({
  name,
  emoji,
  imageUrl,
  thumbnailUrl,
  color,
  size = "md",
  className,
  priority = false,
}: CropAvatarProps) {
  const src = thumbnailUrl || imageUrl || undefined;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const hasImageError = failedSrc === src;
  const isExternalOptimized = src?.includes("media.agrism.catjam.dev") ?? false;
  const isWikimediaImage = src?.includes("upload.wikimedia.org") ?? false;
  const showImage = src && !hasImageError;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-border/60 bg-muted/30",
        SIZE_STYLES[size],
        className,
      )}
      style={{
        backgroundColor: color ? `${color}18` : undefined,
      }}
    >
      {showImage ? (
        <>
          {!loaded && (
            <div className="absolute inset-0 animate-pulse bg-muted/60" />
          )}
          <Image
            src={src}
            alt={`${name} 照片`}
            fill
            className={cn("object-cover transition-opacity duration-200", loaded ? "opacity-100" : "opacity-0")}
            unoptimized={isWikimediaImage || isExternalOptimized}
            sizes={
              size === "sm"
                ? "32px"
                : size === "md"
                  ? "40px"
                  : size === "lg"
                    ? "44px"
                    : "64px"
            }
            priority={priority}
            onLoad={() => setLoaded(true)}
            onError={() => setFailedSrc(src ?? null)}
          />
        </>
      ) : (
        <span aria-hidden="true">{emoji || "🌱"}</span>
      )}
    </div>
  );
}
