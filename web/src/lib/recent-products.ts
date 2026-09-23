const STORAGE_KEY = "dental-recent-products";
const MAX_ITEMS = 5;

export function loadRecentProductNames(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

export function addRecentProductName(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return loadRecentProductNames();

  const prev = loadRecentProductNames();
  const next = [trimmed, ...prev.filter((n) => n !== trimmed)].slice(
    0,
    MAX_ITEMS
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export const RECENT_PRODUCTS_MAX = MAX_ITEMS;
