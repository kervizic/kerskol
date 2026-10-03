// File d'attente des reponses non encore acceptees par le serveur (reseau
// coupe). Persistee en sessionStorage : survit a un rechargement pendant la
// seance. Les reponses portent un UUID CLIENT => rejouer une insertion est sans
// effet (idempotence garantie par la PK de public.reponses).

import type { ReponseInsert } from "./api";

const KEY = "kerskol_reponses_pending";

function read(): ReponseInsert[] {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ReponseInsert[]) : [];
  } catch {
    return [];
  }
}

function write(rows: ReponseInsert[]): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* quota / mode prive : sans impact fonctionnel (perte au pire) */
  }
}

export function enqueueReponse(row: ReponseInsert): void {
  const rows = read();
  if (!rows.some((r) => r.id === row.id)) {
    rows.push(row);
    write(rows);
  }
}

export function pendingCount(): number {
  return read().length;
}

// Rejoue toutes les reponses en attente. Chaque insertion reussie est retiree
// de la file ; en cas d'echec on s'arrete (le reste reste en file).
export async function flushReponses(
  insert: (row: ReponseInsert) => Promise<unknown>
): Promise<void> {
  let rows = read();
  while (rows.length > 0) {
    try {
      await insert(rows[0]);
      rows = rows.slice(1);
      write(rows);
    } catch {
      return; // toujours hors ligne : on garde la file
    }
  }
}
