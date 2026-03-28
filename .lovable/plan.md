

## Plan : Refonte affichage publications + Pipeline intelligent + Analyse incrementale

### 1. Page Publications par Profil (refonte ProfileDetail)

**Probleme actuel** : La page ProfileDetail affiche les posts en liste verticale simple, sans structure claire pour naviguer des centaines de publications.

**Solution** : Refondre la page en 3 zones :

- **En-tete profil** : avatar, nom, headline, stats globales (total likes, comments, shares, nombre de posts) + mini-analyse IA du profil (ce qui fait sa viralite)
- **Tableau horizontal des publications** : affichage en tableau (`Table`) avec colonnes : date, apercu contenu (50 chars), likes, comments, shares, impressions, media type, score engagement. Tri par colonne, pagination (20 par page), filtre par type de media
- **Sidebar analyse** : resume automatique des patterns de viralite de ce profil specifique (genere lors de l'extraction)

**Nouvelle edge function `analyze-profile-virality`** : Analyse legere des top posts d'un profil specifique pour identifier ses patterns uniques. Stockage du resultat dans un champ `analysis_summary` (jsonb) sur `tracked_profiles`.

**Migration SQL** : Ajouter colonne `analysis_summary jsonb default '{}'` sur `tracked_profiles`.

### 2. Pipeline fluide Traitement → Strategie → Posts → Planification → Analyse

**Probleme** : Chaque etape est independante, l'utilisateur doit manuellement naviguer et declencher chaque action.

**Solution - Boutons de transition entre pages** :
- Page Traitement : apres analyse, bouton "Generer ma strategie →" qui redirige vers Strategie
- Page Strategie : apres generation, bouton "Creer des posts bases sur cette strategie →" qui redirige vers Posts Suggeres avec pre-selection
- Page Posts Suggeres : bouton "Planifier les posts selectionnes →" qui redirige vers Planifier
- Page Planifier : apres publication, bouton "Voir les performances →" vers Analyser

**3 options de strategie** : Modifier l'edge function `generate-strategy` pour generer 3 variantes :
1. **Agressive** : 5-7 posts/semaine, focus viralite, storytelling + contenu choc
2. **Equilibree** : 3-5 posts/semaine, mix storytelling/tuto/news/viral
3. **Autoritaire** : 2-3 posts/semaine, contenu expert, thought leadership

Chaque variante inclut une repartition des types de contenu :
- Storytelling (histoire personnelle, parcours)
- Viral (hooks forts, controverses, opinions)
- Tuto/How-to (conseils pratiques, methodes)
- News/Actualites (commentaires sur l'actualite du domaine)
- Social proof (resultats, temoignages)

L'utilisateur choisit une variante, elle devient sa strategie active.

### 3. Analyse incrementale (limiter les credits)

**Probleme** : Chaque analyse scanne TOUS les posts de tous les profils, consommant beaucoup de credits IA.

**Solution** :
- Ajouter colonne `last_analyzed_at timestamptz` sur `tracked_profiles`
- Modifier `analyze-virality` : au lieu de prendre les 10 top posts de chaque profil (statique), prendre uniquement les posts publies APRES `last_analyzed_at`
- Si c'est la premiere analyse, prendre les 10 meilleurs (comportement actuel)
- Apres analyse, mettre a jour `last_analyzed_at` sur chaque profil traite
- Modifier `sync-linkedin` : ne synchroniser que les posts recents (derniers 24h par defaut au lieu de 20 posts)
- L'analyse de viralite incrementale fusionne les nouveaux insights avec les precedents plutot que de tout recalculer

**Migration SQL** : Ajouter `last_analyzed_at timestamptz` et `analysis_summary jsonb default '{}'` sur `tracked_profiles`.

### Fichiers a creer/modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter colonnes sur `tracked_profiles` |
| `src/pages/ProfileDetail.tsx` | Refonte complete : tableau horizontal, pagination, sidebar analyse |
| `supabase/functions/analyze-profile-virality/index.ts` | Creer — analyse legere par profil |
| `supabase/functions/analyze-virality/index.ts` | Modifier — mode incremental |
| `supabase/functions/sync-linkedin/index.ts` | Modifier — option sync recent uniquement |
| `supabase/functions/generate-strategy/index.ts` | Modifier — 3 variantes de strategie |
| `src/pages/StrategiePage.tsx` | Afficher 3 options, selection, types de contenu diversifies |
| `src/pages/TraitementPage.tsx` | Ajouter bouton transition vers Strategie |
| `src/pages/SuggestedPostsPage.tsx` | Ajouter bouton transition vers Planifier |
| `src/pages/PlanifierPage.tsx` | Ajouter bouton transition vers Analyser |

### Section technique

- Le tableau des publications utilise les composants `Table` existants avec `useState` pour pagination et tri
- L'analyse par profil utilise Lovable AI (`google/gemini-3-flash-preview`) avec un prompt court (top 5 posts du profil seulement)
- L'analyse incrementale stocke `last_analyzed_at` pour eviter de re-scanner les memes posts
- Les 3 variantes de strategie sont generees dans un seul appel IA avec tool calling pour structurer la sortie
- Les boutons de transition utilisent `useNavigate` avec des query params pour pre-remplir les donnees

