

## Plan : Prospection 100% automatisée (zéro intervention)

### Concept

Transformer la prospection en pilote automatique : l'utilisateur configure ses critères une seule fois en haut de la page, puis un cron job quotidien exécute tout automatiquement — recherche de prospects, warm-up, envoi des messages, relances.

### 1. Nouvelle table `prospection_autopilot_config`

Stocke la configuration permanente de l'autopilot prospection :

```sql
- user_id uuid (RLS auth.uid())
- enabled boolean DEFAULT false
- mode text DEFAULT 'profiles' -- 'profiles' | 'commenters' | 'companies'
- search_query text -- mots-clés de recherche
- post_ids text[] DEFAULT '{}' -- IDs de posts pour mode commentaires
- company_keywords text -- mots-clés entreprises
- daily_contact_limit integer DEFAULT 20
- warmup_enabled boolean DEFAULT true
- warmup_delay_hours integer DEFAULT 2
- message_template text -- message initial avec {name}, {headline}
- sequence_steps jsonb DEFAULT '[]' -- [{step_order, delay_days, message_template}]
- offer_description text -- ce qu'on propose
- conversation_guidelines text -- comment converser
- delay_between_messages integer DEFAULT 5
- last_run_at timestamptz
- created_at / updated_at
```

### 2. Nouvelle Edge Function `prospection-autopilot/index.ts`

Orchestrateur principal appelé par cron (quotidien 08:00 UTC). Logique :

1. Récupère tous les `prospection_autopilot_config` où `enabled = true`
2. Pour chaque config :
   - **Mode profiles** : appelle `search-profiles` avec `search_query`
   - **Mode commenters** : appelle `extract-commenters` pour chaque `post_id`
   - **Mode companies** : appelle `search-companies` puis `search-profiles` avec `company_id`
3. Déduplique vs les prospects déjà contactés (`prospection_messages`)
4. Crée automatiquement une campagne + messages
5. Personnalise les messages avec `{name}`, `{headline}` et les `conversation_guidelines`
6. Appelle `prospect-outreach` (avec warm-up si activé)
7. Met à jour `last_run_at`

### 3. Cron job

```sql
-- Quotidien à 08:00 UTC
SELECT cron.schedule('prospection-autopilot-daily', '0 8 * * *', $$
  SELECT net.http_post(
    url:='https://.../functions/v1/prospection-autopilot',
    headers:='{"Authorization": "Bearer ..."}',
    body:='{}'
  );
$$);
```

### 4. Frontend — Section configuration en haut de `ProspectionPage.tsx`

Nouveau panneau "Prospection automatique" en haut de la page avec :

- **Toggle ON/OFF** pour activer/désactiver l'autopilot
- **3 modes** (onglets) : Profils / Commentaires / Entreprises
  - Profils : champ mots-clés de recherche
  - Commentaires : liste d'IDs de posts à surveiller
  - Entreprises : mots-clés entreprises
- **Nombre de contacts/jour** (slider 5-100)
- **Ce que vous proposez** (textarea — injecté dans les messages)
- **Comment converser** (textarea — guidelines pour les relances)
- **Message initial** (textarea avec variables)
- **Relances** (séquences configurables comme actuellement)
- **Warm-up** (toggle + délai)
- **Indicateur** : "Dernière exécution : il y a X heures"

### 5. Personnalisation IA des messages (optionnel mais recommandé)

Utiliser le modèle Lovable AI (Gemini Flash) dans `prospection-autopilot` pour :
- Personnaliser chaque message en fonction du profil du prospect
- Varier les formulations pour éviter la détection de spam
- Intégrer `offer_description` et `conversation_guidelines` dans chaque message

### Fichiers modifiés / créés

| Fichier | Action |
|---------|--------|
| Migration SQL | Créer table `prospection_autopilot_config` |
| `supabase/functions/prospection-autopilot/index.ts` | Créer — orchestrateur cron |
| `src/pages/ProspectionPage.tsx` | Modifier — ajouter panneau config autopilot en haut |
| Cron job SQL (INSERT via insert tool) | Planifier exécution quotidienne |

### Section technique

- La déduplication se fait via une requête `NOT IN (SELECT prospect_linkedin_url FROM prospection_messages WHERE user_id = ...)` pour ne jamais recontacter un prospect
- Les campagnes auto-créées sont nommées avec la date : "Auto — Profils — 16 avr 2026"
- Le cron itère sur tous les users avec `enabled = true` — la fonction utilise `SUPABASE_SERVICE_ROLE_KEY` pour bypasser RLS
- Rate limiting : respecte le `daily_contact_limit` et `delay_between_messages` configurés
- Les 3 modes (profils, commentaires, entreprises) peuvent être activés simultanément avec des configs séparées, ou on garde un seul mode actif à la fois (plus simple pour v1)

