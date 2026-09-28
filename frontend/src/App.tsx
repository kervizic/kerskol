import { useCallback, useEffect, useRef, useState } from "react";
import { Loading, Feedback } from "./components/ui";
import { PublicHome } from "./screens/PublicHome";
import { CreateProfile } from "./screens/CreateProfile";
import { WhoPlays } from "./screens/WhoPlays";
import { Village } from "./screens/Village";
import { ParentSpace } from "./screens/ParentSpace";
import { Session } from "./screens/Session";
import { ChildTheme } from "./components/ChildTheme";
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
import { authAction } from "./lib/authReset";
import { setDernierProfil } from "./lib/session";
import type { Avatar, Profil } from "./lib/types";

// --- Petit routeur (history API), sans dependance ------------------------
// Routes : / (accueil public ou selection), /creer-profil, /reglages,
// /enfant/<uuid>/village, /enfant/<uuid>/seance. On utilise l'UUID du profil
// (jamais le surnom : donnee personnelle). index.html est servi en fallback SPA
// par nginx : ces routes profondes repondent donc 200.
function currentPath(): string {
  try {
    return window.location.pathname;
  } catch {
    return "/";
  }
}
const CHILD_RE = /^\/enfant\/([^/]+)\/(village|seance)$/;

export function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [foyerId, setFoyerId] = useState<string | null>(null);
  const [profils, setProfils] = useState<Profil[]>([]);
  const [referentiel, setReferentiel] = useState<Referentiel | null>(null);
  const [error, setError] = useState(false);
  const [path, setPath] = useState(currentPath);

  const running = useRef(false);
  const currentUserId = useRef<string | null>(null);

  const navigate = useCallback((to: string, replace = false) => {
    try {
      if (to !== window.location.pathname) {
        if (replace) window.history.replaceState(null, "", to);
        else window.history.pushState(null, "", to);
      }
    } catch {
      /* ignore */
    }
    setPath(to);
  }, []);

  const bootstrap = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setError(false);
    try {
      const user = await getUser();
      currentUserId.current = user?.id ?? null;
      if (!user) {
        setAuthed(false);
        setProfils([]);
        setFoyerId(null);
        setReady(true);
        return;
      }
      const fid = await ensureFoyer();
      const [list, ref] = await Promise.all([listProfils(fid), getReferentiel()]);
      setFoyerId(fid);
      setProfils(list);
      setReferentiel(ref);
      setAuthed(true);
      setReady(true);
    } catch (e) {
      console.error("bootstrap a echoue", e);
      setError(true);
      setReady(true);
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    void bootstrap();
    const off = onAuthChange((event, userId) => {
      const action = authAction(currentUserId.current, event, userId);
      if (action === "signed_out") {
        currentUserId.current = null;
        setAuthed(false);
        setProfils([]);
        setFoyerId(null);
        navigate("/");
      } else if (action === "user_changed") {
        void bootstrap();
      }
      // "ignore" (meme utilisateur : TOKEN_REFRESHED, focus...) : rien.
    });
    const onPop = () => setPath(currentPath());
    window.addEventListener("popstate", onPop);
    return () => {
      off();
      window.removeEventListener("popstate", onPop);
    };
  }, [bootstrap, navigate]);

  // Redirections coherentes (apres chargement) : profil obligatoire, et acces a
  // un profil hors du foyer -> retour a la selection.
  useEffect(() => {
    if (!ready || !authed) return;
    if (profils.length === 0) {
      if (path !== "/creer-profil") navigate("/creer-profil", true);
      return;
    }
    const m = path.match(CHILD_RE);
    if (m && !profils.some((p) => p.id === m[1])) navigate("/", true);
  }, [ready, authed, profils, path, navigate]);

  // Report des maj de version (app-version.js) hors des ecrans a saisie/seance.
  useEffect(() => {
    const busy =
      path === "/creer-profil" ||
      path === "/reglages" ||
      /^\/enfant\/[^/]+\/seance$/.test(path);
    window.Kerskol?.version?.setBusy?.(busy);
    // A chaque changement d'ecran : on verifie /version.json. Si non occupe et
    // qu'une nouvelle version existe, app-version.js l'applique (transition).
    if (!busy) window.Kerskol?.version?.check?.();
  }, [path]);

  const upsertProfil = useCallback((p: Profil) => {
    setProfils((prev) => {
      const i = prev.findIndex((x) => x.id === p.id);
      if (i === -1) return [...prev, p];
      const copy = prev.slice();
      copy[i] = p;
      return copy;
    });
  }, []);

  function pickChild(p: Profil) {
    setDernierProfil(p.id);
    navigate(`/enfant/${p.id}/village`);
  }

  async function handleFoyerDeleted() {
    if (!isDemo()) await signOut();
    setAuthed(false);
    setFoyerId(null);
    setProfils([]);
    navigate("/");
  }

  const banner = isDemo() ? (
    <div className="kk-demo-banner">Mode demo local — donnees fictives</div>
  ) : null;

  function content() {
    if (!ready) return <Loading />;
    if (error) {
      return (
        <div className="kk-page kk-center">
          <div className="kk-container" style={{ maxWidth: 480 }}>
            <Feedback kind="error">Une erreur est survenue au chargement.</Feedback>
            <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => void bootstrap()}>
              Réessayer
            </button>
          </div>
        </div>
      );
    }
    if (!authed) return <PublicHome />;
    if (!foyerId || !referentiel) return <Loading />;

    if (path === "/creer-profil") {
      const first = profils.length === 0;
      return (
        <CreateProfile
          foyerId={foyerId}
          matieres={referentiel.matieres}
          onCancel={first ? undefined : () => navigate("/reglages")}
          onDone={(p) => {
            upsertProfil(p);
            navigate(first ? "/" : "/reglages");
          }}
        />
      );
    }

    if (path === "/reglages") {
      return (
        <ParentSpace
          foyerId={foyerId}
          profils={profils}
          matieres={referentiel.matieres}
          onProfilChange={upsertProfil}
          onAddChild={() => navigate("/creer-profil")}
          onExit={() => navigate("/")}
          onFoyerDeleted={() => void handleFoyerDeleted()}
        />
      );
    }

    const m = path.match(CHILD_RE);
    if (m) {
      const prof = profils.find((p) => p.id === m[1]);
      if (!prof) return <Loading />; // l'effet de redirection renvoie a "/"
      const couleur = (prof.avatar as Avatar)?.couleur || "#E06A00";
      if (m[2] === "village") {
        return (
          <ChildTheme couleur={couleur}>
            <Village
              profil={prof}
              referentiel={referentiel}
              onExit={() => navigate("/")}
              onStart={() => navigate(`/enfant/${prof.id}/seance`)}
              onProfilChange={upsertProfil}
            />
          </ChildTheme>
        );
      }
      return (
        <ChildTheme couleur={couleur}>
          <Session
            profil={prof}
            referentiel={referentiel}
            onExit={() => navigate(`/enfant/${prof.id}/village`)}
            onProfilChange={upsertProfil}
          />
        </ChildTheme>
      );
    }

    // "/" ou route inconnue -> selection de profil.
    return (
      <WhoPlays profils={profils} onPickChild={pickChild} onReglages={() => navigate("/reglages")} />
    );
  }

  return (
    <>
      {banner}
      {content()}
    </>
  );
}
