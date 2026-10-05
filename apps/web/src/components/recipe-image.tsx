import Image from "next/image";
import { CookingPot } from "lucide-react";
import type { MealType } from "@weeko/engine";
import type { RecipePhoto } from "@/lib/photos";
import { cx } from "./ui";

const tint: Record<MealType, string> = {
  breakfast: "from-miel-soft to-abricot-soft",
  lunch: "from-basilic-soft to-eau-soft",
  dinner: "from-basilic-soft to-miel-soft",
  snack: "from-abricot-soft to-eau-soft",
};

/** Recipe photo, or a soft placeholder while photos are being collected. */
export function RecipeImage({
  photo,
  meal = "lunch",
  className,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority,
  thumb,
}: {
  photo?: RecipePhoto;
  meal?: MealType;
  className?: string;
  sizes?: string;
  priority?: boolean;
  thumb?: boolean;
}) {
  if (photo) {
    return (
      <div className={cx("relative overflow-hidden bg-line", className)}>
        {/* Unsplash photos are served straight from their CDN, as their API terms require. */}
        <Image src={thumb ? photo.thumb : photo.url} alt={photo.alt} fill sizes={sizes} className="object-cover" priority={priority} unoptimized={photo.source === "unsplash"} />
      </div>
    );
  }
  return (
    <div className={cx("grid place-items-center bg-gradient-to-br", tint[meal], className)} aria-hidden>
      <CookingPot className="size-8 text-basilic/60" />
    </div>
  );
}

export function PhotoCredit({ photo, label }: { photo?: RecipePhoto; label: string }) {
  if (!photo) return null;
  return (
    <p className="text-xs text-muted">
      {label}{" "}
      <a href={photo.photographerUrl} target="_blank" rel="noreferrer" className="underline">{photo.photographer}</a>{" "}
      · <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="underline">{photo.source === "unsplash" ? "Unsplash" : "Pexels"}</a>
    </p>
  );
}
