const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type StickerItem = {
  name: string;
  url: string;
};

export type StickerListResponse = {
  total: number;
  offset: number;
  limit: number;
  items: StickerItem[];
};

export function stickerImageUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${API_URL}${path}`;
}

export async function fetchStickers(
  offset: number,
  limit: number,
): Promise<StickerListResponse> {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  const response = await fetch(`${API_URL}/api/v1/stickers?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stickers: ${response.status}`);
  }
  return response.json();
}

export type StickerSearchItem = StickerItem & {
  score: number;
  nsfw_score?: number | null;
};

export type StickerSearchResponse = {
  query: string;
  total_indexed: number;
  items: StickerSearchItem[];
};

export async function searchStickers(query: string): Promise<StickerSearchResponse> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${API_URL}/api/v1/search?${params}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : `Busca falhou: ${response.status}`;
    throw new Error(detail);
  }
  return response.json();
}
