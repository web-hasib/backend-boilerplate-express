/**
 * List Query Builder
 *
 * Utility for building type-safe query parameters for list/collection endpoints.
 * Handles all three concerns of a list API in one place:
 *
 *   • Pagination  — offset-based (page/limit) or cursor-based (keyset)
 *   • Sorting     — field + direction, with safe defaults
 *   • Filtering   — handled at the call site via Zod-validated query params
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  Strategy           │ Use when                   │ Prisma args            │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │  Offset (page/limit)│ Admin panels, page jumps   │ skip + take            │
 * │  Cursor (keyset)    │ Infinite scroll, feed APIs │ cursor + take          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Note on search: PostgreSQL ILIKE (Prisma `contains: mode: "insensitive"`) +
 * the pg_trgm extension handles application-scale search (100k+ rows) without
 * Elasticsearch. Add Elasticsearch only when you need relevance scoring or
 * cross-index aggregation at millions-of-document scale.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OffsetListQueryInput {
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface OffsetListQueryResult {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface CursorListQueryInput {
  cursor?: string; // ID of the last seen item
  limit?: number | string;
  sortOrder?: "asc" | "desc";
}

export interface CursorListQueryResult {
  cursor: string | undefined;
  limit: number;
  sortOrder: "asc" | "desc";
  /** Prisma args ready to spread directly into findMany() */
  prismaArgs: {
    take: number;
    skip?: number;
    cursor?: { id: string };
  };
}

export interface OffsetListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CursorListMeta {
  nextCursor: string | undefined;
  limit: number;
  hasMore: boolean;
}

// ─── Offset list query ────────────────────────────────────────────────────────

/**
 * Builds Prisma-ready offset list query params (pagination + sort).
 *
 * Use for: admin panels, data tables, any UI with page numbers.
 *
 * When the query schema already coerces and defaults values via Zod
 * (recommended pattern), pass the validated query directly and this function
 * acts as a normaliser with safety clamps.
 *
 * @example
 * const { skip, limit, sortBy, sortOrder } = buildOffsetListQuery(req.query);
 * const users = await prisma.user.findMany({
 *   where,
 *   skip,
 *   take: limit,
 *   orderBy: { [sortBy]: sortOrder },
 * });
 */
export const buildOffsetListQuery = (
  input: OffsetListQueryInput,
  options?: {
    defaultSortBy?: string;
    maxLimit?: number;
    defaultLimit?: number;
  },
): OffsetListQueryResult => {
  const maxLimit = options?.maxLimit ?? 100;
  const defaultLimit = options?.defaultLimit ?? 10;
  const defaultSortBy = options?.defaultSortBy ?? "createdAt";

  // Clamp page ≥ 1 to prevent negative skip values
  const page = Math.max(Number(input.page) || 1, 1);
  // Hard cap to prevent full-table scans via ?limit=999999
  const limit = Math.min(
    Math.max(Number(input.limit) || defaultLimit, 1),
    maxLimit,
  );
  const skip = (page - 1) * limit;
  const sortBy = input.sortBy || defaultSortBy;
  const sortOrder = input.sortOrder === "asc" ? "asc" : "desc";

  return { page, limit, skip, sortBy, sortOrder };
};

// ─── Cursor list query ────────────────────────────────────────────────────────

/**
 * Builds Prisma-ready cursor (keyset) list query params (pagination + sort).
 *
 * Use for: infinite scroll, activity feeds, notification lists, real-time data.
 *
 * Advantages over offset:
 *  - Consistent results even when items are inserted/deleted mid-page
 *  - O(1) performance regardless of how deep into the list you are
 *
 * @example
 * const { prismaArgs, sortOrder } = buildCursorListQuery({ cursor: req.query.cursor, limit: 20 });
 * const posts = await prisma.post.findMany({
 *   ...prismaArgs,
 *   orderBy: { createdAt: sortOrder },
 * });
 * const nextCursor = posts.at(-1)?.id;
 * return { data: posts, meta: buildCursorListMeta(nextCursor, 20, posts.length === 20) };
 */
export const buildCursorListQuery = (
  input: CursorListQueryInput,
  options?: { maxLimit?: number; defaultLimit?: number },
): CursorListQueryResult => {
  const maxLimit = options?.maxLimit ?? 50;
  const defaultLimit = options?.defaultLimit ?? 20;
  const limit = Math.min(
    Math.max(Number(input.limit) || defaultLimit, 1),
    maxLimit,
  );
  const sortOrder = input.sortOrder === "asc" ? "asc" : "desc";

  const prismaArgs: CursorListQueryResult["prismaArgs"] = {
    take: limit,
    ...(input.cursor && {
      skip: 1, // skip the cursor item itself to avoid duplication
      cursor: { id: input.cursor },
    }),
  };

  return { cursor: input.cursor, limit, sortOrder, prismaArgs };
};

// ─── Response meta builders ───────────────────────────────────────────────────

/**
 * Builds a standard offset pagination meta block for API responses.
 * Includes pre-calculated totalPages, hasNextPage, hasPrevPage so the
 * client never has to compute these.
 */
export const buildOffsetListMeta = (
  page: number,
  limit: number,
  total: number,
): OffsetListMeta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});

/**
 * Builds a standard cursor pagination meta block for API responses.
 */
export const buildCursorListMeta = (
  nextCursor: string | undefined,
  limit: number,
  hasMore: boolean,
): CursorListMeta => ({
  nextCursor,
  limit,
  hasMore,
});
