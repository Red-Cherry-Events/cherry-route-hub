export type EntrantIdentity = { id: string; full_name: string; id_number_hash: string | null }

/** Email identifies a household, not a person. Never replace a different ID. */
export function matchEntrantIdentity(rows: EntrantIdentity[], name: string, idHash: string | null): string | null {
  const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase()
  const matches = rows.filter(row => idHash && row.id_number_hash
    ? row.id_number_hash === idHash
    : normalize(row.full_name) === normalize(name))
  return matches.length === 1 ? matches[0]?.id ?? null : null
}