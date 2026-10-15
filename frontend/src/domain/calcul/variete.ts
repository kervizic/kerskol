// Alternance des exercices (TS pur, partage composeur + moteur).
//
// Regle dure (prompt Manu, 15/10) : une seance ne doit JAMAIS enchainer deux
// exercices du meme TYPE, ni deux de la meme MATIERE quand une autre matiere
// active reste disponible. Remplace l'ancien « bloc de 2 » (a896644) qui posait
// deux exercices identiques d'affilee.
//
//   * TYPE     = la competence exacte (ex. FR.CONJ.IMPARFAIT). C'est le doublon
//                qu'on interdit : IMPARFAIT puis IMPARFAIT.
//   * MATIERE  = le 1er segment du code (MA, FR, QM, EMC, ST, HIST, GEO...).
//                Comme une meme sous-matiere (domaine) partage la matiere,
//                interdire deux fois la meme MATIERE d'affilee separe aussi les
//                compereces d'un meme domaine (ex. conjugaison) tant qu'une
//                autre matiere reste a placer.
//
// Garantie : si une competence ne depasse pas la moitie des items (vrai des que
// la seance compte au moins deux competences distinctes a 2 items chacune), le
// glouton ci-dessous produit ZERO repetition de type. Une repetition n'apparait
// que lorsqu'elle est INEVITABLE (plus qu'une seule competence / matiere restante).

export interface VarieteItem {
  type: string; // competence exacte
  matiere: string; // 1er segment du code
  niveau: number; // sert de departage (debut facile)
}

// Matiere portee par un code de competence (1er segment : MA, FR, QM, EMC...).
export function exerciceMatiere(code: string): string {
  const i = code.indexOf(".");
  return i === -1 ? code : code.slice(0, i);
}

// Type d'un exercice = la competence exacte (c'est le « meme type » que Manu
// veut ne jamais voir deux fois d'affilee).
export function exerciceType(code: string): string {
  return code;
}

// Reordonne `items` pour qu'aucun exercice consecutif ne partage le meme TYPE,
// ni la meme MATIERE quand c'est evitable. `prev` = cle de l'exercice qui
// PRECEDE la sequence (deja pose / deja repondu cote moteur) ; les premiers
// items evitent de le repeter. Deterministe (aucun alea) : a contraintes egales,
// niveau croissant (debut facile) puis ordre d'origine (stable).
export function alterner<T>(
  items: T[],
  keyOf: (it: T) => VarieteItem,
  prev?: { type: string; matiere: string } | null
): T[] {
  if (items.length <= 1) return items.slice();

  // Index d'origine : departage stable + preservation du determinisme.
  const rest = items.map((it, i) => ({ it, key: keyOf(it), i }));

  // Comptes restants par MATIERE et par TYPE. Le glouton choisit d'abord la
  // MATIERE (la plus representee et differente de la precedente) : c'est la
  // reorganisation classique « most-frequent-first », optimale pour une cle -> la
  // matiere ne se repete que lorsque c'est INEVITABLE. Comme deux items de
  // matieres differentes ont forcement des TYPES differents, alterner les
  // matieres supprime du meme coup les repetitions de type ; il ne reste qu'a
  // eviter le meme type A L'INTERIEUR d'une serie forcee d'une meme matiere.
  const countByMat = new Map<string, number>();
  const countByType = new Map<string, number>();
  for (const r of rest) {
    countByMat.set(r.key.matiere, (countByMat.get(r.key.matiere) ?? 0) + 1);
    countByType.set(r.key.type, (countByType.get(r.key.type) ?? 0) + 1);
  }

  const out: T[] = [];
  let prevType = prev?.type ?? null;
  let prevMat = prev?.matiere ?? null;

  while (rest.length > 0) {
    // 1) Matieres encore disponibles, en evitant la precedente si possible.
    const matsDispo = [...countByMat.entries()].filter(([, n]) => n > 0).map(([m]) => m);
    let matsOk = matsDispo.filter((m) => m !== prevMat);
    if (matsOk.length === 0) matsOk = matsDispo; // repetition de matiere inevitable
    // Matiere la plus representee (faisabilite de l'alternance de matiere).
    let maxMat = -1;
    for (const m of matsOk) maxMat = Math.max(maxMat, countByMat.get(m) ?? 0);
    const matChoisies = new Set(matsOk.filter((m) => (countByMat.get(m) ?? 0) === maxMat));

    // 2) Dans ces matieres, on evite le TYPE precedent si possible.
    let candidats = rest.filter((r) => matChoisies.has(r.key.matiere) && r.key.type !== prevType);
    if (candidats.length === 0) {
      candidats = rest.filter((r) => matChoisies.has(r.key.matiere));
    }

    // 3) Depart : type le plus represente (etale les doublons d'un type), puis
    //    niveau croissant (debut facile), puis ordre d'origine (deterministe).
    candidats.sort((a, b) => {
      const ca = countByType.get(a.key.type) ?? 0;
      const cb = countByType.get(b.key.type) ?? 0;
      if (ca !== cb) return cb - ca;
      if (a.key.niveau !== b.key.niveau) return a.key.niveau - b.key.niveau;
      return a.i - b.i;
    });

    const chosen = candidats[0];
    out.push(chosen.it);
    countByMat.set(chosen.key.matiere, (countByMat.get(chosen.key.matiere) ?? 0) - 1);
    countByType.set(chosen.key.type, (countByType.get(chosen.key.type) ?? 0) - 1);
    rest.splice(rest.indexOf(chosen), 1);
    prevType = chosen.key.type;
    prevMat = chosen.key.matiere;
  }

  return out;
}
