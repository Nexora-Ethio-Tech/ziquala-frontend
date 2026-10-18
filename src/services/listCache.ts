// Memory only: bounded, short lived, and isolated by the current login session.
const entries = new Map<string, { expires: number; value: Promise<unknown> }>();
let generation = 0;
export const clearListCache = () => { generation += 1; entries.clear(); };
export function cachedList<T>(key: string, load: () => Promise<T>): Promise<T> {
  const scopedKey = `${localStorage.getItem('ziquala_token') || ''}:${key}`;
  const existing = entries.get(scopedKey);
  if (existing && existing.expires > Date.now()) return existing.value as Promise<T>;
  const currentGeneration = generation;
  const value = load().catch(error => {
    if (currentGeneration === generation && entries.get(scopedKey)?.value === value) entries.delete(scopedKey);
    throw error;
  });
  if (entries.size >= 30) entries.delete(entries.keys().next().value!);
  entries.set(scopedKey, { expires: Date.now() + 120_000, value });
  return value;
}
