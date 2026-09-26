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
- **Reverse proxy** : Nginx (sur l'hote du VPS, mutualise avec kertec.fr),
  qui remplace Kong devant les services Supabase. TLS via certbot. Routage :
  `/auth/v1/` vers GoTrue, `/rest/v1/` vers PostgREST, `/` vers le build Vite
  statique (fallback SPA).
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
- `deploy/` : configuration et scripts de déploiement (docker-compose, Nginx,
  génération de secrets, sauvegarde, déploiement). Voir `deploy/SETUP.md`.
- `mailer/` : service worker qui envoie les mails aux parents via Gmail
  (OAuth2) en consommant une file d'attente (outbox).
- `docs/` : documentation technique et fonctionnelle.

## Déploiement

Le déploiement complet sur le VPS OVH (pile Docker Supabase allégée, vhost
Nginx, mailer) est décrit pas à pas dans **[`deploy/SETUP.md`](deploy/SETUP.md)**.

En résumé :

1. Cloner le dépôt (public) dans `/opt/kerskol`.
2. Lancer `deploy/gen-secrets.sh` (génère `/opt/kerskol/.env`), puis compléter
   à la main les identifiants Google OAuth et Gmail.
3. Configurer le vhost Nginx et les certificats certbot.
4. `deploy/deploy.sh` : démarrage des conteneurs, migrations, build front,
   rechargement Nginx.

Projet isolé de kertec.fr : projet compose `kerskol`, réseau `kerskol_net`,
Postgres dédié, secrets distincts, ports publiés uniquement sur `127.0.0.1`.

Le versionnage du front (affichage de la version en production) est prévu dans
une itération ultérieure, sur le principe de l'`app-version.js` de kertec.fr
mais avec une version **générée au build**.

## Mails aux parents

Kerskol peut envoyer aux parents un **résumé hebdomadaire** et des **messages
de service**, uniquement si le parent a **activé** cette option (opt-in
explicite, désactivé par défaut — voir `parent_preferences`).

- L'envoi passe par une file d'attente **outbox** (`mail_outbox`) consommée par
  le service `mailer`. Aucun email de destinataire n'est stocké dans l'outbox :
  il est résolu dans `auth.users` au moment de l'envoi.
- Transport : API Gmail via **OAuth2** (même méthode que kertec.fr), jamais SMTP.
- RGPD : les mails ne contiennent rien sur l'enfant au-delà du **surnom** et de
  la **progression**. Aucun traceur, aucune image externe.

## État du projet

Squelette initial. Le code applicatif sera développé dans une itération
ultérieure.
