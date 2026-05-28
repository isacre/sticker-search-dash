"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchStickers,
  searchStickers,
  stickerImageUrl,
  type StickerItem,
  type StickerSearchItem,
} from "@/lib/api";

const COLUMNS = 6;
const ROW_HEIGHT = 160;
const PAGE_SIZE = 120;
const LOAD_AHEAD_ROWS = 4;

function StickerScores({
  score,
  nsfwScore,
}: {
  score: number;
  nsfwScore?: number | null;
}) {
  return (
    <div className="flex w-full shrink-0 items-center justify-between gap-1 px-0.5">
      <span className="text-xs font-bold tabular-nums text-fuchsia-600">
        {score.toFixed(3)}
      </span>
      {nsfwScore != null ? (
        <span className="text-xs font-bold tabular-nums text-orange-600">
          {nsfwScore.toFixed(2)}
        </span>
      ) : (
        <span className="text-[10px] text-zinc-400">—</span>
      )}
    </div>
  );
}

export function StickerGrid() {
  const parentRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StickerSearchItem[] | null>(
    null,
  );
  const [searching, setSearching] = useState(false);
  const [total, setTotal] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [items, setItems] = useState<StickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const loadedCountRef = useRef(0);
  const totalRef = useRef(0);

  const rowCount =
    loadedCount > 0 ? Math.ceil(loadedCount / COLUMNS) : 0;
  const hasMore = total > 0 && loadedCount < total;

  const loadMore = useCallback(async () => {
    const offset = loadedCountRef.current;
    if (loadingRef.current) return;
    if (totalRef.current > 0 && offset >= totalRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchStickers(offset, PAGE_SIZE);
      totalRef.current = data.total;
      setTotal(data.total);

      const nextCount = offset + data.items.length;
      loadedCountRef.current = nextCount;
      setLoadedCount(nextCount);
      setItems((prev) => [...prev, ...data.items]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar stickers",
      );
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const maybeLoadMore = useCallback(
    (lastVisibleRow: number) => {
      if (totalRef.current === 0 && loadedCountRef.current === 0) return;
      if (loadedCountRef.current >= totalRef.current && totalRef.current > 0) {
        return;
      }

      const loadedRows = Math.ceil(loadedCountRef.current / COLUMNS);
      if (lastVisibleRow >= loadedRows - LOAD_AHEAD_ROWS) {
        void loadMore();
      }
    },
    [loadMore],
  );

  const runSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const data = await searchStickers(q);
      setSearchResults(data.items);
    } catch (err) {
      setSearchResults(null);
      setError(
        err instanceof Error ? err.message : "Erro na busca",
      );
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      loadingRef.current = true;
      try {
        const data = await fetchStickers(0, PAGE_SIZE);
        if (cancelled) return;
        totalRef.current = data.total;
        setTotal(data.total);
        loadedCountRef.current = data.items.length;
        setLoadedCount(data.items.length);
        setItems(data.items);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Erro ao carregar stickers",
        );
      } finally {
        loadingRef.current = false;
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: LOAD_AHEAD_ROWS,
    onChange: (instance) => {
      const virtualItems = instance.getVirtualItems();
      if (virtualItems.length === 0) return;
      const lastRow = virtualItems[virtualItems.length - 1]!.index;
      maybeLoadMore(lastRow);
    },
  });

  useEffect(() => {
    if (loading) return;
    const virtualItems = virtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;
    const lastRow = virtualItems[virtualItems.length - 1]!.index;
    maybeLoadMore(lastRow);
  }, [loading, loadedCount, virtualizer, maybeLoadMore]);

  const displayItems: (StickerItem & { score?: number })[] =
    searchResults ?? items;
  const isSearchMode = searchResults !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <header className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Stickers</h1>
          <p className="text-sm text-zinc-500">
            {isSearchMode
              ? `${searchResults.length} resultado(s) para “${searchQuery.trim()}”`
              : total > 0
                ? `${loadedCount.toLocaleString("pt-BR")} / ${total.toLocaleString("pt-BR")} carregados`
                : "Carregando catálogo…"}
          </p>
        </div>
        <form
          className="flex w-full max-w-md gap-2 sm:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch();
          }}
        >
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar figurinhas…"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {searching ? "…" : "Buscar"}
          </button>
          {isSearchMode && (
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600"
              onClick={() => {
                setSearchQuery("");
                setSearchResults(null);
              }}
            >
              Limpar
            </button>
          )}
        </form>
        {!isSearchMode && loading && hasMore && (
          <span className="text-sm text-zinc-400">Carregando mais…</span>
        )}
      </header>

      {error && (
        <p className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {isSearchMode ? (
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-2">
          {searchResults.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">Nenhum resultado.</p>
          ) : (
            <div className="grid grid-cols-6 gap-2">
              {displayItems.map((item) => (
                <div
                  key={item.name}
                  className="flex min-h-[140px] flex-col items-center gap-0.5"
                  title={item.name}
                >
                  <img
                    src={stickerImageUrl(item.url)}
                    alt={item.name}
                    loading="lazy"
                    className="min-h-0 flex-1 w-full object-contain"
                  />
                  {isSearchMode && "score" in item && (
                    <StickerScores
                      score={(item as StickerSearchItem).score}
                      nsfwScore={(item as StickerSearchItem).nsfw_score}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      <div
        ref={parentRef}
        className="min-h-0 flex-1 overflow-auto rounded-xl border border-zinc-200 bg-zinc-50"
      >
        {rowCount === 0 && loading ? (
          <div className="grid grid-cols-6 gap-1 p-2">
            {Array.from({ length: PAGE_SIZE }, (_, i) => (
              <div
                key={`skeleton-${i}`}
                className="aspect-square animate-pulse rounded-lg bg-zinc-200"
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const rowIndex = virtualRow.index;
              const rowTop = virtualRow.start;

              return (
                <div
                  key={virtualRow.key}
                  className="absolute left-0 grid w-full grid-cols-6 gap-1 px-2"
                  style={{
                    height: ROW_HEIGHT,
                    transform: `translateY(${rowTop}px)`,
                  }}
                >
                  {Array.from({ length: COLUMNS }, (_, columnIndex) => {
                    const itemIndex = rowIndex * COLUMNS + columnIndex;
                    if (itemIndex >= loadedCount) {
                      return (
                        <div key={`empty-${rowIndex}-${columnIndex}`} />
                      );
                    }

                    const item = items[itemIndex];
                    return (
                      <div
                        key={item.name}
                        className="flex h-full min-h-0 items-center justify-center"
                      >
                        <img
                          src={stickerImageUrl(item.url)}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
