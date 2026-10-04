import { useCallback, useEffect, useRef, useState } from "react";
import { Loading, Feedback } from "./components/ui";
import { PublicHome } from "./screens/PublicHome";
import { CreateProfile } from "./screens/CreateProfile";
import { WhoPlays } from "./screens/WhoPlays";
import { Village } from "./screens/Village";
import { ParentSpace } from "./screens/ParentSpace";
import { Session } from "./screens/Session";
import { DefiChrono } from "./screens/DefiChrono";
import { LinkCode } from "./screens/LinkCode";
import { ChildTheme } from "./components/ChildTheme";
import {
  ensureFoyer,
  getProfilById,
  getReferentiel,
  getUser,
  listProfils,
  onAuthChange,
  statutLienEnfant,
  signOut,
  type Referentiel,
} from "./lib/api";
import { resolveEntry, villageRoute, type EntryMode } from "./lib/bootstrap";
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
const CHILD_RE = /^\/enfant\/([^/]+)\/(village|seance|defi)$/;

export function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [foyerId, setFoyerId] = useState<string | null>(null);
  const [mode, setMode] = useState<EntryMode>("parent");
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
      // AVANT tout creer_foyer : on demande l'etat du compte (lien enfant ?).
      const [entry, ref] = await Promise.all([
        resolveEntry({ statutLienEnfant, getProfilById, ensureFoyer, listProfils }),
        getReferentiel(),
      ]);
      setFoyerId(entry.foyerId);
      setMode(entry.mode);
      setProfils(entry.profils);
      setReferentiel(ref);
      setAuthed(true);
      setReady(true);
      if (entry.route) navigate(entry.route, true);
    } catch (e) {
      console.error("bootstrap a echoue", e);
      setError(true);
      setReady(true);
    } finally {
      running.current = false;
    }
  }, [navigate]);

  useEffect(() => {
    void bootstrap();
    const off = onAuthChange((event, userId) => {
      const action = authAction(currentUserId.current, event, userId);
      if (action === "signed_out") {
        currentUserId.current = null;
        setAuthed(false);
        setProfils([]);
        setFoyerId(null);
        setMode("parent");
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
    // Modes sans foyer (lien en attente, inscriptions fermees, email non
    // confirme) : aucune redirection de profil a appliquer.
    if (mode === "child_pending" || mode === "inscriptions_fermees" || mode === "email_non_confirme") {
      return;
    }
    // Enfant relie : il reste cantonne a SON village (aucun ecran parent).
    if (mode === "child") {
      const childId = profils[0]?.id;
      if (!childId || path === "/reglages") return; // /reglages : message dans content()
      const m = path.match(CHILD_RE);
      if (!m || m[1] !== childId) navigate(villageRoute(childId), true);
      return;
    }
    if (profils.length === 0) {
      if (path !== "/creer-profil") navigate("/creer-profil", true);
      return;
    }
    const m = path.match(CHILD_RE);
    if (m && !profils.some((p) => p.id === m[1])) navigate("/", true);
  }, [ready, authed, mode, profils, path, navigate]);

  // Report des maj de version (app-version.js) hors des ecrans a saisie/seance.
  useEffect(() => {
    const busy =
      path === "/creer-profil" ||
      path === "/reglages" ||
      /^\/enfant\/[^/]+\/(seance|defi)$/.test(path);
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

    // Lien enfant en attente : ecran neutre de saisie du code (sans foyer).
    if (mode === "child_pending") {
      return (
        <LinkCode
          onValidated={() => void bootstrap()}
          onRefused={() => void handleFoyerDeleted()}
        />
      );
    }

    // Inscriptions fermees jusqu'au lancement public.
    if (mode === "inscriptions_fermees") {
      return (
        <div className="kk-page kk-center">
          <div className="kk-container" style={{ maxWidth: 480, textAlign: "center" }}>
            <h1>Les inscriptions ne sont pas encore ouvertes</h1>
            <p className="kk-muted">
              Kerskol n'est pas encore ouvert au public. Revenez bientôt&nbsp;!
            </p>
            <button
              className="kk-btn kk-btn--accent kk-btn--block"
              onClick={() => void handleFoyerDeleted()}
            >
              Se déconnecter
            </button>
          </div>
        </div>
      );
    }

    // Email non confirme : la validation du lien enfant est impossible.
    if (mode === "email_non_confirme") {
      return (
        <div className="kk-page kk-center">
          <div className="kk-container" style={{ maxWidth: 480, textAlign: "center" }}>
            <h1>Confirme ton adresse e-mail</h1>
            <p className="kk-muted">
              Confirme d'abord ton adresse e-mail, puis reconnecte-toi pour continuer.
            </p>
            <button
              className="kk-btn kk-btn--accent kk-btn--block"
              onClick={() => void handleFoyerDeleted()}
            >
              Se déconnecter
            </button>
          </div>
        </div>
      );
    }

    if (!foyerId || !referentiel) return <Loading />;

    // Enfant relie : acces limite a son village. /reglages -> message simple.
    if (mode === "child") {
      const prof = profils[0];
      if (path === "/reglages") {
        return (
          <div className="kk-page kk-center">
            <div className="kk-container" style={{ maxWidth: 480, textAlign: "center" }}>
              <h1>Espace parent</h1>
              <p className="kk-muted">
                Cet espace est réservé aux parents. Demande à un parent de gérer les réglages.
              </p>
              <button
                className="kk-btn kk-btn--accent kk-btn--block"
                onClick={() => navigate(prof ? villageRoute(prof.id) : "/")}
              >
                Retour à mon village
              </button>
            </div>
          </div>
        );
      }
      const m = path.match(CHILD_RE);
      if (!prof || !m || m[1] !== prof.id) return <Loading />; // redirection en cours
      // sinon : le bloc CHILD_RE ci-dessous rend le village / la seance
    }

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
              onDefi={() => navigate(`/enfant/${prof.id}/defi`)}
              onProfilChange={upsertProfil}
            />
          </ChildTheme>
        );
      }
      if (m[2] === "defi") {
        return (
          <ChildTheme couleur={couleur}>
            <DefiChrono
              profil={prof}
              onExit={() => navigate(`/enfant/${prof.id}/village`)}
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
