import { useState, useEffect, useCallback } from "react";
import { Favorite } from "../types";
import { generateId } from "../lib/utils";
import type { FavoriteKind, FavoriteRecord } from "../lib/db";
import {
  getFavoritesByKind,
  putFavorite,
  deleteFavorite,
} from "../lib/store/favoritesStore";
import { reportStorageError } from "../lib/store/errors";

/**
 * Generic hook for a named-label favorites list (workout names, exercise
 * names), persisted in IndexedDB and partitioned by `kind`.
 *
 * Takes a `kind` rather than the old raw localStorage key — the storage layout
 * is no longer the caller's business. Return shape is otherwise unchanged.
 *
 * `isLoading` is exposed for symmetry with useWorkoutHistory but nothing needs
 * to consume it: favorites only render inside modals, so a briefly empty list
 * is never visible.
 */
export function useFavoritesList(kind: FavoriteKind) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getFavoritesByKind(kind)
      .then((rows) => {
        if (!cancelled) {
          setFavorites(rows.map(({ id, label }) => ({ id, label })));
        }
      })
      .catch((error) =>
        reportStorageError(`lettura dei preferiti (${kind})`, error)
      )
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [kind]);

  const isFavorite = useCallback(
    (label: string) => {
      const trimmed = label.trim().toLowerCase();
      if (!trimmed) return false;
      return favorites.some((f) => f.label.trim().toLowerCase() === trimmed);
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;

      const existing = favorites.find(
        (f) => f.label.trim().toLowerCase() === trimmed.toLowerCase()
      );

      if (existing) {
        setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
        void deleteFavorite(existing.id).catch((error) =>
          reportStorageError(`rimozione del preferito ${existing.id}`, error)
        );
        return;
      }

      const record: FavoriteRecord = {
        id: generateId(),
        kind,
        label: trimmed,
        createdAt: new Date().toISOString(),
      };
      setFavorites((prev) => [{ id: record.id, label: record.label }, ...prev]);
      void putFavorite(record).catch((error) =>
        reportStorageError(`salvataggio del preferito ${record.id}`, error)
      );
    },
    [favorites, kind]
  );

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    void deleteFavorite(id).catch((error) =>
      reportStorageError(`rimozione del preferito ${id}`, error)
    );
  }, []);

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    removeFavorite,
  };
}
