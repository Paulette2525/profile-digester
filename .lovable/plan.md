

## Refonte UI : Sidebar + Pages allegees + Performance

### Probleme actuel
- Navigation horizontale avec 7 items qui ne scale pas
- Pages chargent toutes les donnees d'un coup (pas de lazy loading)
- Contenu dense et non collapse sur certaines pages
- Pas de structure sidebar adaptee a l'ajout de futures fonctionnalites

### Proposition

```text
┌──────────────┬──────────────────────────────────┐
│              │                                  │
│  [Logo]      │   Contenu de la page             │
│              │                                  │
│  Dashboard   │                                  │
│  Traitement  │                                  │
│  Posts       │                                  │
│  Planifier   │                                  │
│  Analyser    │                                  │
│              │                                  │
│  ─────────   │                                  │
│  Profils     │                                  │
│  Config      │                                  │
│              │                                  │
│  [collapse]  │                                  │
└──────────────┴──────────────────────────────────┘
```

### Changements prevus

**1. Sidebar collapsible (remplace la navbar horizontale)**
- Creer `AppSidebar.tsx` avec `Sidebar` de shadcn (deja installe)
- Groupes : "Workflow" (Dashboard, Traitement, Posts, Planifier, Analyser) et "Gestion" (Profils, Config)
- Mode mini (icones seules) quand collapse
- Modifier `AppLayout.tsx` pour utiliser `SidebarProvider` + `SidebarTrigger` dans un header minimal
- Indicateur LinkedIn dans le sidebar

**2. Lazy loading des pages**
- `React.lazy()` + `Suspense` pour toutes les routes dans `App.tsx`
- Reduit le bundle initial et accelere le premier rendu

**3. Pages allegees**
- **TraitementPage** : Sections "Charts" et "Facteurs" dans des `Collapsible` (fermes par defaut apres la premiere consultation)
- **SuggestedPostsPage** : Pagination des posts (10 par page au lieu de tout afficher)
- **PlanifierPage** : Limiter l'affichage initial a 10 items par section avec "Voir plus"
- **AnalyserPage** : Idem, limiter a 10 posts avec "Voir plus"
- **Index (Dashboard)** : Limiter les posts recents a 10 avec "Voir plus"

**4. Optimisation des requetes React Query**
- Ajouter `staleTime: 5 * 60 * 1000` sur les requetes principales pour eviter les re-fetch inutiles
- Ajouter `refetchOnWindowFocus: false` sur les queries lourdes

### Fichiers modifies
- `src/components/layout/AppLayout.tsx` — refonte avec SidebarProvider
- `src/components/layout/AppSidebar.tsx` — nouveau fichier sidebar
- `src/App.tsx` — lazy loading des routes
- `src/pages/Index.tsx` — pagination posts + staleTime
- `src/pages/TraitementPage.tsx` — sections collapsibles + staleTime
- `src/pages/SuggestedPostsPage.tsx` — pagination + staleTime
- `src/pages/PlanifierPage.tsx` — "voir plus" + staleTime
- `src/pages/AnalyserPage.tsx` — "voir plus" + staleTime

### Ordre d'implementation
1. Creer AppSidebar + refactorer AppLayout
2. Lazy loading dans App.tsx
3. Optimiser chaque page (pagination, collapsibles, staleTime)

