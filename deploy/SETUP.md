# Kerskol - mise en place sur le VPS OVH

Runbook de déploiement de **kerskol.fr** sur le VPS OVH mutualisé avec
kertec.fr. Pile Supabase allégée (3 conteneurs) + mailer, derrière le Nginx de
l'hôte, TLS certbot.

```
Navigateur ──HTTPS──> Nginx (hôte, 80/443)
                        ├── /auth/v1/  ──> 127.0.0.1:9997  kerskol-auth  (GoTrue)
                        ├── /rest/v1/  ──> 127.0.0.1:3001  kerskol-rest  (PostgREST)
                        └── /          ──> /opt/kerskol/frontend/dist (build Vite, SPA)

Réseau interne docker "kerskol_net" (isolé de kertec) :
  kerskol-db (Postgres, aucun port publié)
  kerskol-auth, kerskol-rest (publiés sur 127.0.0.1 uniquement)
  kerskol-mailer (worker outbox -> Gmail, aucun port)
```

> ⚠ **Isolation vis-à-vis de kertec.fr.** Projet compose dédié `kerskol`
> (`-p kerskol`), réseau `kerskol_net`, volume Postgres propre
> (`kerskol-db-data`), **tous les secrets distincts** (surtout `JWT_SECRET`).
> Ports publiés **uniquement sur `127.0.0.1`** et **différents de kertec**
> (kertec occupe 3000, 3422, 5000, 5432, 9999 ; kerskol utilise 3001 et 9997).
> Aucune commande ci-dessous ne touche `/opt/kertec.fr` ni `/opt/supabase`.

---

## 1. DNS

Chez le registrar du domaine `kerskol.fr`, faire pointer l'apex et `www` vers
l'IP du VPS :

| Type | Nom  | Valeur          |
|------|------|-----------------|
| A    | `@`  | `<IP_DU_VPS>`   |
| A    | `www`| `<IP_DU_VPS>`   |

Vérifier la propagation avant certbot :

```bash
dig +short kerskol.fr
dig +short www.kerskol.fr
```

---

## 2. Cloner le dépôt (public) dans /opt/kerskol

Le dépôt est **public** (github.com/kervizic/kerskol) : aucun secret dedans,
clone en HTTPS sans clé.

```bash
sudo mkdir -p /opt/kerskol
sudo chown "$USER":"$USER" /opt/kerskol
git clone https://github.com/kervizic/kerskol.git /opt/kerskol
cd /opt/kerskol
```

---

## 3. Générer les secrets (/opt/kerskol/.env)

```bash
cd /opt/kerskol
./deploy/gen-secrets.sh
```

Le script crée `/opt/kerskol/.env` (**chmod 600**, refuse d'écraser un fichier
existant) et génère :

- `POSTGRES_PASSWORD`
- `JWT_SECRET` (64 caractères)
- `KERSKOL_MAILER_PASSWORD` (mot de passe du rôle `kerskol_mailer`)
- `ANON_KEY` et `SERVICE_ROLE_KEY` : JWT **HS256** signés avec `JWT_SECRET`

> ⚠ Il ne **génère jamais** les identifiants Google/Gmail : ces lignes sont
> laissées vides et se remplissent à la main (sections 4 et 5). Le script
> **n'affiche aucune valeur secrète**.

---

## 4. OAuth Google (connexion du parent)

Console Google Cloud (https://console.cloud.google.com) :

1. Créer / sélectionner un projet.
2. **APIs & Services → OAuth consent screen** : type « External », renseigner
   nom d'appli, email de support, domaine `kerskol.fr`. Scopes de base
   (`email`, `profile`, `openid`) — aucune donnée Google supplémentaire.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** :
   - Type : **Web application**.
   - **Authorized redirect URI** :
     ```
     https://kerskol.fr/auth/v1/callback
     ```
4. Récupérer le **Client ID** et le **Client secret**, puis les reporter dans
   `/opt/kerskol/.env` :

```dotenv
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=<client id>
GOTRUE_EXTERNAL_GOOGLE_SECRET=<client secret>
```

> L'inscription email/mot de passe est **désactivée** dans GoTrue
> (`GOTRUE_DISABLE_SIGNUP=true`, `GOTRUE_EXTERNAL_EMAIL_ENABLED=false`) : seul
> le bouton « Se connecter avec Google » du parent fonctionne.

---

## 5. Envoi de mails via Gmail (méthode identique à DICT/kertec)

Kerskol reprend **exactement** la méthode de kertec.fr : **API Gmail via
OAuth2 avec un refresh token**, scope `https://www.googleapis.com/auth/gmail.send`.
**Pas de SMTP, pas de mot de passe d'application.** Côté code, le mailer utilise
`googleapis` (`google.auth.OAuth2` + `gmail.users.messages.send`, message MIME
encodé en base64url), avec un **keep-alive** périodique du refresh token.

### 5.1 Obtenir les identifiants

1. Dans Google Cloud, **activer l'API Gmail** pour le projet.
2. Créer un **OAuth client ID** de type **Desktop app** (ou réutiliser un client
   Web) → `client_id` + `client_secret`.
3. Générer un **refresh token** avec le seul scope `gmail.send`, pour la boîte
   Gmail expéditrice. Deux voies possibles :
   - **OAuth 2.0 Playground** (https://developers.google.com/oauthplayground) :
     activer « Use your own OAuth credentials », saisir client id/secret,
     autoriser le scope `https://www.googleapis.com/auth/gmail.send`, échanger le
     code contre un `refresh_token`.
   - Un petit flux `InstalledAppFlow` local (comme DICT) avec le même scope.

### 5.2 Renseigner le .env

```dotenv
GMAIL_CLIENT_ID=<client id>
GMAIL_CLIENT_SECRET=<client secret>
GMAIL_REFRESH_TOKEN=<refresh token>
MAIL_FROM=<adresse expéditrice, ex. contact@kerskol.fr ou la boîte Gmail>
MAIL_FROM_NAME=Kerskol
```

> ⚠ Le `MAIL_FROM` doit correspondre à la boîte dont provient le refresh token
> (ou une adresse autorisée en « send as » sur cette boîte). Un refresh token
> Gmail expire après ~6 mois d'inactivité : le mailer fait un **keep-alive**
> automatique (`getAccessToken`) pour l'éviter.

---

## 6. Certificats TLS (certbot)

Certbot est déjà installé sur l'hôte (utilisé par kertec). Le vhost HTTP de
kerskol sert déjà le challenge ACME via `/var/www/html`. Émettre le certificat :

```bash
# S'assurer que le vhost HTTP (section 7) est en place et nginx rechargé,
# puis :
sudo certbot certonly --webroot -w /var/www/html \
  -d kerskol.fr -d www.kerskol.fr
```

Les certificats atterrissent dans `/etc/letsencrypt/live/kerskol.fr/`
(`fullchain.pem`, `privkey.pem`), chemins déjà référencés par le vhost. Le
renouvellement automatique de certbot couvre ce nouveau domaine sans action
supplémentaire.

---

## 7. Vhost Nginx + rate limiting

```bash
# Zones de rate limiting (contexte http -> conf.d)
sudo cp /opt/kerskol/deploy/nginx/kerskol-ratelimit.conf \
        /etc/nginx/conf.d/kerskol-ratelimit.conf

# Vhost (lien symbolique versionné)
sudo ln -s /opt/kerskol/deploy/nginx/kerskol.fr.conf \
           /etc/nginx/sites-available/kerskol.fr.conf
sudo ln -s /etc/nginx/sites-available/kerskol.fr.conf \
           /etc/nginx/sites-enabled/

sudo nginx -t && sudo systemctl reload nginx
```

> ⚠ Avant l'émission du certificat (section 6), le bloc `server` HTTPS échouera
> au `nginx -t` car les `.pem` n'existent pas encore. Ordre recommandé :
> 1) mettre en place **uniquement** le bloc HTTP (commenter temporairement les
> blocs 443), 2) `reload`, 3) certbot, 4) réactiver les blocs 443, 5) `reload`.
> Alternative : utiliser `certbot --nginx` qui gère l'insertion.

Rappel du routage assuré par le vhost : `/auth/v1/` → 9997, `/rest/v1/` → 3001,
`/` → `/opt/kerskol/frontend/dist` (fallback SPA). `index.html` et `sw.js` sans
cache, assets hashés en cache long, CSP stricte, HSTS, `frame-ancestors 'none'`,
`limit_req` (plus strict sur `/auth/v1/`).

---

## 8. Premier démarrage

```bash
cd /opt/kerskol/deploy
docker compose -p kerskol up -d --build
```

Au **premier** démarrage, `deploy/initdb/01-roles.sh` aligne les mots de passe
des rôles Supabase (`authenticator`, `supabase_auth_admin`) sur
`POSTGRES_PASSWORD`. Ensuite, appliquer les migrations et activer le mailer :

```bash
cd /opt/kerskol
./deploy/deploy.sh
```

`deploy.sh` : `git pull`, `compose up -d`, migrations en attente (table
`schema_migrations`), activation du rôle `kerskol_mailer` (LOGIN + mot de passe
depuis `.env`), build du front s'il existe, `nginx -t` puis `reload`.

---

## 9. Vérifications

```bash
# Conteneurs up + healthy
docker compose -p kerskol ps

# API auth (health) via nginx
curl -si https://kerskol.fr/auth/v1/health | head -n 5

# API REST joignable (401/200 attendu, pas 502)
curl -si https://kerskol.fr/rest/v1/ | head -n 5

# En-têtes de sécurité présents
curl -sI https://kerskol.fr/ | grep -iE 'strict-transport|content-security|x-content-type'

# Migrations enregistrées
docker compose -p kerskol exec -T -e PGPASSWORD="$(grep '^POSTGRES_PASSWORD=' /opt/kerskol/.env | cut -d= -f2-)" \
  kerskol-db psql -U postgres -d postgres -c "SELECT version FROM public.schema_migrations ORDER BY version;"

# Logs du mailer (aucun email en clair ne doit apparaître)
docker compose -p kerskol logs --tail=50 kerskol-mailer
```

Test de bout en bout du mailer (après opt-in d'un parent) : insérer une ligne
d'outbox avec le `SERVICE_ROLE_KEY` (l'outbox est fermée à anon/authenticated) —
voir `supabase/migrations/0001_mail_outbox.sql` pour la structure.

---

## 10. Sauvegardes (cron)

```bash
# Test manuel
/opt/kerskol/deploy/backup.sh

# Cron quotidien 03:30 (rotation 14 jours, /opt/kerskol/backups)
( crontab -l 2>/dev/null; \
  echo "30 3 * * * /opt/kerskol/deploy/backup.sh >> /var/log/kerskol-backup.log 2>&1" ) \
  | crontab -
```

---

## 11. Rollback

Désactiver kerskol **sans jamais toucher kertec** :

```bash
# 1. Retirer le vhost (le site ne répond plus, kertec intact)
sudo rm -f /etc/nginx/sites-enabled/kerskol.fr.conf
sudo nginx -t && sudo systemctl reload nginx

# 2. Arrêter la pile kerskol (projet ciblé, kertec non affecté)
cd /opt/kerskol/deploy
docker compose -p kerskol down

# Les données Postgres persistent dans le volume kerskol-db-data.
# Pour repartir : docker compose -p kerskol up -d
```

> ⚠ Ne **jamais** lancer `docker compose down -v` (supprimerait le volume et
> donc les données). Ne jamais utiliser `docker compose down` sans `-p kerskol`
> depuis un autre dossier : cela pourrait cibler une autre pile.

Retour à une version antérieure du code : `git -C /opt/kerskol checkout <tag>`
puis `./deploy/deploy.sh`.

---

## 12. Rappels d'isolation (checklist)

- [ ] Projet compose `-p kerskol` sur **toutes** les commandes.
- [ ] Réseau `kerskol_net` dédié.
- [ ] Volume `kerskol-db-data` dédié.
- [ ] `JWT_SECRET`, `POSTGRES_PASSWORD` et toutes les clés **distincts** de kertec.
- [ ] Ports publiés sur `127.0.0.1` uniquement, hors 3000/3422/5000/5432/9999.
- [ ] Aucun `docker.sock` monté, aucun `privileged`, `no-new-privileges` partout.
- [ ] `/opt/kertec.fr` et `/opt/supabase` **jamais** modifiés.

---

## 13. Checklist sécurité VPS

- [ ] **Pare-feu UFW** : n'ouvrir que 22, 80, 443.
      ```bash
      sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
      sudo ufw enable
      ```
      (Les ports docker de kerskol étant en `127.0.0.1`, ils ne sont de toute
      façon pas exposés.)
- [ ] **SSH par clé uniquement** : `PasswordAuthentication no`, `PermitRootLogin no`.
- [ ] **CrowdSec** ou **fail2ban** actif (protection bruteforce SSH + web).
- [ ] **Mises à jour automatiques** : `unattended-upgrades` activé.
- [ ] **RLS Postgres** : vérifier que `mail_outbox` est bien fermée à
      anon/authenticated et que `parent_preferences` n'expose que la ligne du
      parent connecté (les policies sont posées par la migration 0001).
- [ ] `.env` en **chmod 600**, jamais committé, jamais affiché.
- [ ] Sauvegardes testées (restauration `gunzip -c ... | psql`).

---

## 14. Versionning et mise à jour fiable entre versions

Objectif : à chaque déploiement, tous les navigateurs passent proprement à la
nouvelle version, sans jamais servir un mélange ancien/nouveau, et sans couper
une séance d'enfant en cours.

### Génération de version

`deploy.sh` calcule à chaque déploiement :

```
APP_VERSION = <hash court du commit>-<horodatage UTC>   # ex. fa9d33a-20260926T140512Z
```

Cette version est écrite :

- dans `frontend/dist/version.json` (servi en `Cache-Control: no-store`) ;
- dans `<meta name="app-version" content="...">` de `index.html` (injectée par
  `build-front.sh` en remplaçant le marqueur `__APP_VERSION__`).

### Empreinte des assets (cache)

`deploy/build-front.sh` construit `frontend/dist` avec des **noms empreintés par
hash de contenu** :

| Fichier source | Servi sous | Cache |
|---|---|---|
| `theme/tokens.css` | `theme/tokens.<hash>.css` | `immutable`, 1 an |
| `theme/app-version.js` | `theme/app-version.<hash>.js` | `immutable`, 1 an |
| `theme/fonts/Andika-*.woff2` | `theme/fonts/Andika-*.<hash>.woff2` | `immutable`, 1 an |
| `placeholder/index.html` | `index.html` | `no-cache, no-store` |
| (généré) | `version.json` | `no-store` |

Le nom changeant avec le contenu, le cache long `immutable` ne peut jamais
servir un ancien asset. Règle vhost (`deploy/nginx/kerskol.fr.conf`) :
`location ^~ /theme/` → immutable ; `location = /version.json` et
`location = /index.html` → no-store/no-cache.

### Client (`frontend/theme/app-version.js`)

Chargé par la page (`<script defer src="/theme/app-version.js">`), expose
`window.Kerskol.version` :

- vérifie `/version.json` toutes les 5 min, au `visibilitychange` (retour au
  premier plan) et à l'événement `online` ;
- `setBusy(true|false)` : pendant une séance, la mise à jour est **reportée**
  jusqu'à `setBusy(false)` ;
- `onBeforeUpdate(fn)` : tâches exécutées avant rechargement (attente ≤ 5 s) ;
- séquence : `onBeforeUpdate` → vidage `Cache Storage` → désenregistrement des
  service workers → `location.reload()` ; anti-boucle via `sessionStorage`.

Exemple d'intégration côté application (future) :

```js
// Début d'une séance : ne pas interrompre l'enfant.
window.Kerskol.version.setBusy(true);
// Avant tout rechargement : pousser les réponses en attente.
window.Kerskol.version.onBeforeUpdate(async () => { await flushPendingAnswers(); });
// Fin de séance : autorise l'application d'une éventuelle mise à jour.
window.Kerskol.version.setBusy(false);
```

### Compatibilité build Vite (futur)

Vite produit déjà des noms empreintés dans `/assets/`. Le futur build devra en
plus : émettre `version.json` (fait par `deploy.sh` dans les deux branches),
injecter `<meta name="app-version">` et inclure `app-version.js`. Les
conventions de cache ci-dessus restent valables.
