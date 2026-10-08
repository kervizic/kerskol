// Tests du SEQUENCEUR avec horloge SIMULEE (deterministe) + lecteur factice.

import { describe, it, expect } from "vitest";
import {
  Sequenceur,
  planifier,
  pauseParDefaut,
  type Horloge,
  type Lecteur,
} from "./sequencer";
import type { MotTiming } from "./timings";
import type { Segment } from "./grouping";

// --- Horloge simulee : on avance le temps a la main ---
function horlogeSimulee() {
  let t = 0;
  let prochainId = 1;
  const taches = new Map<number, { echeance: number; cb: () => void }>();
  const horloge: Horloge = {
    maintenant: () => t,
    programmer: (ms, cb) => {
      const id = prochainId++;
      taches.set(id, { echeance: t + Math.max(0, ms), cb });
      return id;
    },
    annuler: (id) => {
      taches.delete(id);
    },
  };
  function avancer(ms: number) {
    const cible = t + ms;
    // execute les taches dans l'ordre d'echeance jusqu'a la cible
    for (;;) {
      let prochain: number | null = null;
      let echeanceMin = Infinity;
      for (const [id, tache] of taches) {
        if (tache.echeance <= cible && tache.echeance < echeanceMin) {
          echeanceMin = tache.echeance;
          prochain = id;
        }
      }
      if (prochain === null) break;
      const tache = taches.get(prochain)!;
      taches.delete(prochain);
      t = tache.echeance;
      tache.cb();
    }
    t = cible;
  }
  return { horloge, avancer, get taillefile() { return taches.size; } };
}

// lecteur factice : enregistre les appels jouer/pause/stop
function lecteurFactice() {
  const appels: string[] = [];
  const lecteur: Lecteur = {
    jouer: (d, f, v) => appels.push(`jouer(${d},${f},${v})`),
    pause: () => appels.push("pause"),
    stop: () => appels.push("stop"),
  };
  return { lecteur, appels };
}

// 3 mots -> 2 segments : [m0,m1] puis [m2]
function fixture() {
  const mots: MotTiming[] = [
    { mot: "a", debut_ms: 0, fin_ms: 300, index: 0 },
    { mot: "b", debut_ms: 300, fin_ms: 600, index: 1 },
    { mot: "c", debut_ms: 650, fin_ms: 1000, index: 2 },
  ];
  const map = new Map(mots.map((m) => [m.index, m]));
  const segments: Segment[] = [{ tokens: [0, 1] }, { tokens: [2] }];
  return { mots, map, segments };
}

describe("planifier (pur)", () => {
  it("place segments, mots et fin aux bons temps", () => {
    const { map, segments } = fixture();
    const plan = planifier(segments, map, 200, 1);
    // segment 0 : 0..600 (duree 600) ; +200 pause => segment 1 a 800
    // segment 1 : 650..1000 (duree 350) ; +200 => fin a 800+350+200 = 1350
    expect(plan).toEqual([
      { type: "segment", tMs: 0, segmentIndex: 0 },
      { type: "mot", tMs: 0, segmentIndex: 0, motIndex: 0 },
      { type: "mot", tMs: 300, segmentIndex: 0, motIndex: 1 },
      { type: "segment", tMs: 800, segmentIndex: 1 },
      { type: "mot", tMs: 800, segmentIndex: 1, motIndex: 2 },
      { type: "fin", tMs: 1350, segmentIndex: 2 },
    ]);
  });

  it("vitesse 0.9 etire les durees", () => {
    const { map, segments } = fixture();
    const plan = planifier(segments, map, 0, 0.9);
    const seg1 = plan.find((e) => e.type === "segment" && e.segmentIndex === 1)!;
    // duree seg0 = 600/0.9 = 666.67
    expect(seg1.tMs).toBeCloseTo(600 / 0.9, 5);
  });
});

describe("Sequenceur (horloge simulee)", () => {
  it("enchaine les segments avec silences et surligne les mots", () => {
    const { map, segments } = fixture();
    const h = horlogeSimulee();
    const l = lecteurFactice();
    const segmentsVus: number[] = [];
    const motsVus: Array<[number, number]> = []; // [temps, index]
    let finAppelee = false;

    const s = new Sequenceur(segments, map, {
      pauseMs: 200,
      vitesse: 1,
      horloge: h.horloge,
      lecteur: l.lecteur,
      onSegment: (i) => segmentsVus.push(i),
      onMot: (i) => motsVus.push([h.horloge.maintenant(), i]),
      onFin: () => {
        finAppelee = true;
      },
    });

    s.demarrer();
    expect(segmentsVus).toEqual([0]);
    expect(l.appels[0]).toBe("jouer(0,600,1)");
    h.avancer(0); // vidange les timers a echeance 0 (comme setTimeout(…,0) reel)
    expect(motsVus).toEqual([[0, 0]]); // mot 0 surligne a t=0

    h.avancer(300); // surlignage mot 1
    expect(motsVus).toEqual([[0, 0], [300, 1]]);

    h.avancer(300); // t=600 fin audio seg0, mais pause de 200 -> seg1 a t=800
    expect(segmentsVus).toEqual([0]);

    h.avancer(200); // t=800 -> segment 1
    expect(segmentsVus).toEqual([0, 1]);
    expect(l.appels).toContain("jouer(650,1000,1)");

    h.avancer(350 + 200); // fin segment 1 + pause -> fin
    expect(finAppelee).toBe(true);
    expect(s.etat).toBe("arret");
  });

  it("pause coupe le lecteur et les timers ; reprendre rejoue le segment courant", () => {
    const { map, segments } = fixture();
    const h = horlogeSimulee();
    const l = lecteurFactice();
    const segmentsVus: number[] = [];
    const s = new Sequenceur(segments, map, {
      pauseMs: 200,
      vitesse: 1,
      horloge: h.horloge,
      lecteur: l.lecteur,
      onSegment: (i) => segmentsVus.push(i),
    });

    s.demarrer();
    s.pause();
    expect(s.etat).toBe("pause");
    expect(l.appels).toContain("pause");
    const avant = h.taillefile;
    expect(avant).toBe(0); // tous les timers annules

    // le temps passe : rien ne bouge
    h.avancer(10000);
    expect(segmentsVus).toEqual([0]);

    s.reprendre();
    expect(s.etat).toBe("lecture");
    expect(segmentsVus).toEqual([0, 0]); // segment 0 rejoue
  });

  it("recommencer repart du debut ; stop remet a zero", () => {
    const { map, segments } = fixture();
    const h = horlogeSimulee();
    const l = lecteurFactice();
    const segmentsVus: number[] = [];
    const s = new Sequenceur(segments, map, {
      pauseMs: 0,
      vitesse: 1,
      horloge: h.horloge,
      lecteur: l.lecteur,
      onSegment: (i) => segmentsVus.push(i),
    });
    s.demarrer();
    h.avancer(600); // passe au segment 1
    expect(s.segmentCourant).toBe(1);
    s.recommencer();
    expect(s.segmentCourant).toBe(0);
    s.stop();
    expect(s.etat).toBe("arret");
    expect(l.appels).toContain("stop");
  });
});

describe("pauseParDefaut", () => {
  it("decroit du CP au CM", () => {
    expect(pauseParDefaut("cp")).toBeGreaterThan(pauseParDefaut("ce2"));
    expect(pauseParDefaut("ce2")).toBeGreaterThan(pauseParDefaut("cm"));
  });
});
