import { getDb, type FavoriteKind, type FavoriteRecord } from "../db";
import { enqueueInTransaction } from "../sync/outbox";
import { toFavoritePayload } from "../sync/mappers";

/**
 * Persistence for the two label-favorites lists (workout names, exercise
 * names), with the same data-plus-operation-in-one-transaction rule as
 * sessionsStore.
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
  const tx = db.transaction(["favorites", "outbox"], "readwrite");

  await tx.objectStore("favorites").put(favorite);
  await enqueueInTransaction(tx.objectStore("outbox"), {
    entity: "favorite",
    op: "upsert",
    entityId: favorite.id,
    payload: toFavoritePayload(favorite),
  });

  await tx.done;
}

export async function deleteFavorite(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["favorites", "outbox"], "readwrite");
  const store = tx.objectStore("favorites");

  // Read the row before deleting it: the queued operation needs the kind to
  // know which table the row lives in, and after the delete it is gone.
  const existing = await store.get(id);
  await store.delete(id);

  if (existing) {
    await enqueueInTransaction(tx.objectStore("outbox"), {
      entity: "favorite",
      op: "delete",
      entityId: id,
      payload: { kind: existing.kind },
    });
  }

  await tx.done;
}
