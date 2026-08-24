import { useState, useEffect, useCallback } from "react";
import { Favorite } from "../types";
import { generateId } from "../lib/utils";

/**
 * Generic hook for a named-label favorites list (e.g. workout names,
 * exercise names), with localStorage persistence keyed by `storageKey`.
 * Mirrors useWorkoutHistory's structure.
 */
export function useFavoritesList(storageKey: string) {
  const [favorites, setFavorites] = useState<Favorite[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist favorites to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(favorites));
  }, [storageKey, favorites]);

  const isFavorite = useCallback(
    (label: string) => {
      const trimmed = label.trim().toLowerCase();
      if (!trimmed) return false;
      return favorites.some((f) => f.label.trim().toLowerCase() === trimmed);
    },
    [favorites]
  );

  const toggleFavorite = useCallback((label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    setFavorites((prev) => {
      const existing = prev.find(
        (f) => f.label.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) {
        return prev.filter((f) => f.id !== existing.id);
      }
      return [{ id: generateId(), label: trimmed }, ...prev];
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    removeFavorite,
  };
}
