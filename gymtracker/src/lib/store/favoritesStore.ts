import { getDb, type FavoriteKind, type FavoriteRecord } from "../db";

/**
 * Persistence for the two label-favorites lists (workout names, exercise names).
 *
 * Ordering is newest-first by `createdAt`, matching the previous localStorage
 * behavior where toggleFavorite prepended.
 */

export async function getFavoritesByKind(
  kind: FavoriteKind
): Promise<FavoriteRecord[]> {
  const db = await getDb();
  const rows = await db.getAllFromIndex("favorites", "by-kind", kind);
  return rows.sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)
  );
}

export async function putFavorite(favorite: FavoriteRecord): Promise<void> {
  const db = await getDb();
  await db.put("favorites", favorite);
}

export async function deleteFavorite(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("favorites", id);
}
