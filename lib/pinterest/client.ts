export const PINTEREST_API = "https://api.pinterest.com/v5";

export type PinterestBoard = {
  id: string;
  name: string;
  description?: string;
  pin_count: number;
  image_thumbnail_url?: string;
  privacy?: "PUBLIC" | "PROTECTED" | "SECRET";
};

export type PinterestPin = {
  id: string;
  title?: string;
  description?: string;
  link?: string;
  board_id: string;
  media?: {
    images?: {
      original?: { url: string; width: number; height: number };
      "1200x"?: { url: string; width: number; height: number };
      "600x"?: { url: string; width: number; height: number };
      "400x300"?: { url: string; width: number; height: number };
    };
  };
};

export function pinImageUrl(pin: PinterestPin): string | null {
  const imgs = pin.media?.images;
  return (
    imgs?.["1200x"]?.url ??
    imgs?.original?.url ??
    imgs?.["600x"]?.url ??
    imgs?.["400x300"]?.url ??
    null
  );
}
