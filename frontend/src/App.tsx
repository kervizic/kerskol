import { useCallback, useEffect, useState } from "react";
import { Loading, Feedback } from "./components/ui";
import { PublicHome } from "./screens/PublicHome";
import { CreateProfile } from "./screens/CreateProfile";
import { WhoPlays } from "./screens/WhoPlays";
import { Village } from "./screens/Village";
import { ParentSpace } from "./screens/ParentSpace";
import { SessionSoon } from "./screens/SessionSoon";
import {
  ensureFoyer,
  getReferentiel,
  getUser,
  listProfils,
  onAuthChange,
  signOut,
  type Referentiel,
} from "./lib/api";
import { isDemo } from "./lib/demo";
import { getDernierProfil, setDernierProfil } from "./lib/session";
import type { Profil } from "./lib/types";

type Phase =
  | "loading"
  | "public"
  | "onboarding"
  | "who"
  | "village"
  | "session"
  | "parent"
  | "add_child"
  | "error";

export function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [foyerId, setFoyerId] = useState<string | null>(null);
  const [profils, setProfils] = useState<Profil[]>([]);
  const [referentiel, setReferentiel] = useState<Referentiel | null>(null);
  const [current, setCurrent] = useState<Profil | null>(null);

  const bootstrap = useCallback(async () => {
    setPhase("loading");
    try {
      const user = await getUser();
      if (!user) {
        setPhase("public");
        return;
      }
      const fid = await ensureFoyer();
      const [list, ref] = await Promise.all([listProfils(fid), getReferentiel()]);
      setFoyerId(fid);
      setProfils(list);
      setReferentiel(ref);
      setPhase(list.length === 0 ? "onboarding" : "who");
    } catch {
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void bootstrap();
    const off = onAuthChange(() => void bootstrap());
    return off;
  }, [bootstrap]);

  const upsertProfil = useCallback((p: Profil) => {
    setProfils((prev) => {
      const i = prev.findIndex((x) => x.id === p.id);
      if (i === -1) return [...prev, p];
      const copy = prev.slice();
      copy[i] = p;
      return copy;
    });
    setCurrent((c) => (c && c.id === p.id ? p : c));
  }, []);

  function pickChild(p: Profil) {
    setDernierProfil(p.id);
    setCurrent(p);
    setPhase("village");
  }

  async function handleFoyerDeleted() {
    if (!isDemo()) await signOut();
    setFoyerId(null);
    setProfils([]);
    setCurrent(null);
    setPhase("public");
  }

  const banner = isDemo() ? <div className="kk-demo-banner">Mode demo local — donnees fictives</div> : null;

  function content() {
    switch (phase) {
      case "loading":
        return <Loading />;
      case "public":
        return <PublicHome />;
      case "error":
        return (
          <div className="kk-page kk-center">
            <div className="kk-container" style={{ maxWidth: 480 }}>
              <Feedback kind="error">
                Une erreur est survenue au chargement.
              </Feedback>
              <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => void bootstrap()}>
                Reessayer
              </button>
            </div>
          </div>
        );
      case "onboarding":
        return (
          foyerId && referentiel && (
            <CreateProfile
              foyerId={foyerId}
              matieres={referentiel.matieres}
              onDone={(p) => {
                upsertProfil(p);
                setPhase("who");
              }}
            />
          )
        );
      case "add_child":
        return (
          foyerId && referentiel && (
            <CreateProfile
              foyerId={foyerId}
              matieres={referentiel.matieres}
              onCancel={() => setPhase("parent")}
              onDone={(p) => {
                upsertProfil(p);
                setPhase("parent");
              }}
            />
          )
        );
      case "who":
        return (
          <WhoPlays
            profils={profils}
            lastProfilId={getDernierProfil()}
            onPickChild={pickChild}
            onParents={() => setPhase("parent")}
          />
        );
      case "village":
        return (
          current &&
          referentiel && (
            <Village
              profil={current}
              referentiel={referentiel}
              onExit={() => setPhase("who")}
              onStart={() => setPhase("session")}
              onProfilChange={upsertProfil}
            />
          )
        );
      case "session":
        return <SessionSoon surnom={current?.surnom ?? ""} onBack={() => setPhase("village")} />;
      case "parent":
        return (
          foyerId && referentiel && (
            <ParentSpace
              foyerId={foyerId}
              profils={profils}
              matieres={referentiel.matieres}
              onProfilChange={upsertProfil}
              onAddChild={() => setPhase("add_child")}
              onExit={() => setPhase("who")}
              onFoyerDeleted={() => void handleFoyerDeleted()}
            />
          )
        );
      default:
        return <Loading />;
    }
  }

  return (
    <>
      {banner}
      {content()}
    </>
  );
}
