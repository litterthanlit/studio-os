"use client";

/** Plain <img> — full asset, no optimizer; path is replaced when you drop a new PNG in /public */
const MOODBOARD_SRC = "/taste-moodboard-gallery.png";

export function TasteMoodboardGallery() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local static asset
    <img
      src={MOODBOARD_SRC}
      alt="Moodboard reference collage"
      width={520}
      height={566}
      loading="eager"
      decoding="async"
      className="mx-auto block h-auto w-full max-w-[520px] object-contain md:mx-0"
    />
  );
}
