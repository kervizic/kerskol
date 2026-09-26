# Kerskol

« Kerskol » signifie *la maison de l'école* en breton.

Kerskol est une application web éducative (PWA) destinée à une enfant de CE2,
couvrant maths, français, géométrie, résolution de problèmes et anglais.
Le domaine de production sera **kerskol.fr**.

## Objectif

Proposer des exercices ludiques et progressifs adaptés au niveau CE2, avec un
suivi de progression simple, sans complexité inutile ni collecte de données
superflue.

## Stack prévue

- **Frontend** : React + Vite, packagé en PWA (installable, fonctionnement
  hors-ligne partiel).
- **Backend** : Supabase allégé, auto-hébergé sur un VPS OVH, composé de
  3 conteneurs :
  - `postgres` (base de données),
  - `gotrue` (authentification),
  - `postgrest` (API REST générée depuis le schéma Postgres).
- **Reverse proxy** : Caddy, qui remplace Kong devant les services Supabase
  (TLS automatique, routage simple).
- **Authentification** : connexion Google réservée au parent. Les profils
  enfants sont créés localement dans l'application (surnom + avatar), sans
  compte ni identifiant propre.

## Principes RGPD

- Aucune donnée d'identification sur l'enfant n'est stockée : seuls le
  surnom, l'avatar choisi et la progression pédagogique sont conservés.
- Aucun traceur ni service tiers (pas d'analytics externe, pas de pixel
  publicitaire).
- Polices et bibliothèques front-end auto-hébergées (pas de CDN tiers).
- Le compte Google du parent sert uniquement à l'authentification ; aucune
  donnée de profil Google au-delà du strict nécessaire n'est conservée.

## Sécurité

**Aucun secret n'est commité dans ce dépôt.** Le fichier `.env.example`
liste uniquement les noms de variables attendues, avec des valeurs vides ou
des placeholders (`CHANGEME`). Les véritables secrets (mots de passe,
clés JWT, clés API, identifiants OAuth Google) vivent uniquement dans un
fichier `.env` présent sur le VPS de production, jamais versionné.

## Structure du dépôt

- `frontend/` : application React + Vite (PWA).
- `supabase/migrations/` : migrations SQL du schéma Postgres.
- `supabase/seed/` : données d'amorçage (contenus pédagogiques, etc.).
- `deploy/` : scripts et configuration de déploiement (Caddy, Docker, etc.).
- `docs/` : documentation technique et fonctionnelle.

## État du projet

Squelette initial. Le code applicatif sera développé dans une itération
ultérieure.
