

## Plan : Pause/reprise de campagne + verification UI sequences

### Constat UI sequences

L'interface des sequences multi-etapes est fonctionnelle : ajout/suppression de relances, champs delai et message, affichage du StepBadge dans l'historique. Pas de bug visible.

### Ajout : Pause et reprise de campagne

**1. Frontend — `ProspectionPage.tsx`**

- Ajouter un bouton Pause/Reprendre dans chaque `CampaignRow` (visible uniquement pour les campagnes `active` ou `paused`)
- Mutation qui met a jour le `status` de la campagne vers `paused` ou `active`
- Afficher le badge "En pause" avec une icone distincte (Pause/Play)
- Importer les icones `Pause`, `Play` de lucide-react

**2. Edge Function — `prospect-followup/index.ts`**

- Ajouter une verification : ne pas traiter les relances des campagnes avec `status = 'paused'`
- Jointure avec `prospection_campaigns` pour filtrer les messages eligibles

**3. Edge Function — `prospect-outreach/index.ts`**

- Verifier que la campagne n'est pas en pause avant d'envoyer les messages

### Fichiers modifies

| Fichier | Action |
|---------|--------|
| `src/pages/ProspectionPage.tsx` | Boutons pause/reprise dans CampaignRow, badge "En pause" |
| `supabase/functions/prospect-followup/index.ts` | Filtrer les campagnes en pause |
| `supabase/functions/prospect-outreach/index.ts` | Verifier statut avant envoi |

### Section technique

- Le champ `status` sur `prospection_campaigns` accepte deja des valeurs texte libres (`draft`, `active`, `completed`, `error`), donc `paused` fonctionne sans migration
- La mutation pause/reprise utilise `supabase.from("prospection_campaigns").update({ status: "paused" | "active" }).eq("id", campaignId)`
- Dans `prospect-followup`, ajout d'un filtre SQL : joindre `prospection_campaigns` et exclure `status = 'paused'`

