import Image from "next/image";

import { publicMediaUrl } from "@/lib/public-content";
import type { PublicImage } from "@/server/repositories/public-content-repository";

export function ContentCover({
  image,
  priority = false,
}: {
  image: PublicImage | null;
  priority?: boolean;
}) {
  if (!image) return null;
  return (
    <div className="relative aspect-video overflow-hidden bg-slate-200">
      <Image
        alt={image.isDecorative ? "" : (image.altText ?? "")}
        className="object-cover"
        fill
        priority={priority}
        sizes="(max-width: 768px) 100vw, 50vw"
        src={publicMediaUrl(image.id)}
        unoptimized
      />
    </div>
  );
}
