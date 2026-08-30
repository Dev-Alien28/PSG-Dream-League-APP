# PSG Dream League — App mobile/web

Fan app non officielle du Paris Saint-Germain : ouverture de packs, collection
de cartes, craft/grades, matchs contre bot ou en ligne, tournoi, boutique,
chat multilingue. Adaptation web du bot Discord du même univers.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 18 + TypeScript
- **Supabase** (Postgres + Auth + Realtime) comme unique backend
- Aucune bibliothèque audio externe : les sons sont synthétisés en direct
  (Web Audio API, voir `src/lib/soundEngine.ts`)

## 1. Installation

```bash
npm install
```

Copier `.env.local` (déjà présent) et vérifier qu'il contient bien :

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## 2. Migrations SQL à exécuter (Supabase → SQL Editor)

⚠️ **Obligatoire avant de tester l'appli.** Sans ça, plusieurs fonctionnalités
échouent silencieusement (ou avec une erreur console) car les colonnes/fonctions
qu'elles utilisent n'existent pas encore en base.

Exécuter les fichiers suivants **dans cet ordre**, un par un (copier-coller le
contenu dans une nouvelle requête SQL Editor, puis "Run") :

| # | Fichier | Ajoute |
|---|---------|--------|
| 1 | `supabase_migration_user_teams.sql` | Table `user_teams` — sauvegarde du Builder d'équipe |
| 2 | `supabase_migration_boutique.sql` | Colonnes boost coins x2 + couleurs d'équipe |
| 3 | `supabase_migration_grades.sql` | Colonnes grade/craft + fonction `craft_card_upgrade` |
| 4 | `supabase_migration_pity.sql` | Colonne pity (garantie Legend) |
| 5 | `supabase_migration_sell.sql` | Fonction `sell_card_duplicates` |
| 6 | `supabase_migration_chat_antispam.sql` | Anti-spam serveur du chat |
| 7 | `supabase_migration_milestones.sql` | Jalons + fonction `claim_milestone` |
| 8 | `supabase_migration_formations.sql` | Compositions tactiques premium |
| 9 | `supabase_migration_affiches.sql` | Affiches (fonds de composition) |

Chaque fichier est idempotent (`if not exists`) : les relancer ne casse rien.

Ces migrations supposent que les tables `profiles`, `owned_cards`, `matches`,
`chat_messages` et `story_progress`, ainsi que le trigger `handle_new_user`
(création automatique du profil à l'inscription), existent déjà dans le
projet Supabase — c'est le cas si l'appli fonctionnait déjà avant ces patches.

## 3. Lancer en développement

```bash
npm run dev
```

## 4. Build de production

```bash
npm run build
npm start
```

Le build a été vérifié à chaque étape de ce projet et passe proprement (0
erreur, 0 warning). Seul point qui ne peut pas être vérifié en dehors d'un
environnement avec accès internet complet : le chargement de la police
Google Fonts (`Rajdhani`) — normal en local/production, juste impossible à
tester dans un bac à sable sans accès à `fonts.googleapis.com`.

## 5. Déploiement (recommandé : Vercel)

1. Pousser ce repo sur GitHub/GitLab.
2. Importer le projet dans [Vercel](https://vercel.com/new).
3. Renseigner les deux variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) dans les Project Settings.
4. Déployer — Next.js est détecté automatiquement, aucune config supplémentaire.

## Limites connues / volontairement hors scope

- **Histoire** : l'onglet existe et fonctionne, mais un seul chapitre
  placeholder ("Contenu à venir") est présent — à remplir avec du vrai
  contenu narratif quand prêt (`src/data/story/chapter_N.json`, voir
  `src/lib/storyEngine.ts` pour le format attendu).
- **Affiches** : recréées en dégradés CSS (mêmes thèmes de couleurs que le
  bot) plutôt qu'en images, faute d'avoir les fichiers PNG originaux.
- **Raretés Unique** : le système les gère entièrement (tri, couleurs,
  craft désactivé) mais aucune carte n'existe encore dans ce tier.
- **Cartes Cadeau (Give)** : distribuées uniquement via 3 jalons
  (`src/lib/milestones.ts`), pas par pack aléatoire — comme dans le bot où
  elles sont attribuées à la main pour des événements.

## Structure des données de cartes

Les packs sont des fichiers JSON dans `data/packs/`, agrégés dans
`data/packs/index.ts`. Pour ajouter du contenu (nouvelles cartes, nouveau
pack), suivre le format existant et l'enregistrer dans `allCards`.
