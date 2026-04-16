

## Plan : Statistiques de prospection + Page Formulaire & Gestion de leads

### Vue d'ensemble

Deux ajouts majeurs :
1. **Section "Statistiques & Performance"** en bas de la page Prospection existante
2. **Nouvelle page "/leads"** pour créer des formulaires partageables et gérer les leads entrants en temps réel

---

### 1. Section Statistiques & Performance (bas de ProspectionPage)

Ajout d'une section après l'historique des campagnes avec :

**KPIs globaux** (cards en grille) :
- Taux d'acceptation moyen (accepted / sent)
- Taux de réponse moyen (replied / sent)
- Nombre total de prospects contactés
- Campagnes actives

**Graphique d'évolution** : courbe des messages envoyés/réponses/acceptations par semaine (recharts, déjà installé)

**Notes clés & axes d'amélioration** : analyse automatique basée sur les données :
- Si taux d'acceptation < 20% → suggestion warm-up
- Si taux de réponse < 10% → suggestion personnalisation IA
- Si mode commentaires non utilisé → suggestion diversification
- Comparaison des performances par mode (profils vs commentaires vs entreprises)

Pas de nouvelle table nécessaire — calcul à la volée depuis `prospection_campaigns` et `prospection_messages`.

---

### 2. Nouvelle page : Formulaire & Gestion de leads (/leads)

**Nouvelle table `lead_forms`** :
```
id, user_id, name, description, fields_config (jsonb),
form_slug (unique, pour URL publique), is_active, created_at, updated_at
```

**Nouvelle table `leads`** :
```
id, user_id, form_id (FK lead_forms), data (jsonb — réponses du formulaire),
status (new/contacted/qualified/converted/lost), notes, source,
linkedin_url, email, phone, company, created_at, updated_at
```

**Edge Function `submit-lead-form`** : endpoint public (pas de JWT) qui reçoit les soumissions de formulaire et insère dans `leads`.

**Frontend — `/leads`** avec 2 onglets :
- **Formulaires** : créer/modifier des formulaires (champs personnalisables : texte, email, téléphone, sélection), copier le lien public, toggle actif/inactif
- **Leads** : tableau temps réel (Supabase Realtime) avec filtres par statut, formulaire source, date. Actions : changer statut, ajouter notes, voir détails

**Page publique du formulaire** : route `/form/:slug` (non protégée) qui affiche le formulaire et envoie les données via l'edge function.

---

### 3. Navigation

Ajouter `/leads` dans le sidebar sous "Automation" avec l'icône `ClipboardList` et le label "Leads".

---

### Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Tables `lead_forms` + `leads` + RLS + Realtime |
| `supabase/functions/submit-lead-form/index.ts` | Créer — soumission publique |
| `src/pages/LeadsPage.tsx` | Créer — formulaires + gestion leads |
| `src/pages/PublicFormPage.tsx` | Créer — formulaire public |
| `src/pages/ProspectionPage.tsx` | Modifier — ajouter section stats en bas |
| `src/App.tsx` | Ajouter routes `/leads` et `/form/:slug` |
| `src/components/layout/AppSidebar.tsx` | Ajouter lien Leads |

### Section technique

- Les stats de prospection sont calculées côté client depuis les données déjà fetchées (campaigns + messages) — pas de nouvelle requête
- Les "notes clés" sont des règles conditionnelles simples basées sur les taux calculés
- Le formulaire public utilise `form_slug` comme identifiant URL-friendly (généré automatiquement)
- Les leads utilisent Supabase Realtime (`ALTER PUBLICATION supabase_realtime ADD TABLE public.leads`) pour mise à jour instantanée
- L'edge function `submit-lead-form` est publique (pas de JWT) mais valide le `form_slug` et vérifie `is_active`
- `fields_config` stocke la structure du formulaire en JSON : `[{name, type, label, required}]`

