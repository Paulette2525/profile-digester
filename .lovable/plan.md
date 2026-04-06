

## Plan : Mise à jour des identifiants Unipile

### Ce qui sera fait

Remplacement des deux secrets backend existants par les nouvelles valeurs :

- **UNIPILE_DSN** → `api36.unipile.com:16657`
- **UNIPILE_API_KEY** → `reuMSnDU.0vp1crNgOeJh/zRb+b1fty3OAmYhtv59+ESPdfJqZOA=`

Ces secrets sont utilisés par toutes les Edge Functions qui communiquent avec Unipile : `connect-linkedin`, `disconnect-linkedin`, `check-linkedin-connection`, `search-profiles`, `prospect-outreach`, `fetch-post-stats`, `publish-scheduled-post`, `sync-linkedin`, `fetch-profile-posts`, `fetch-account-stats`, `auto-engage-comments`.

### Etapes

1. Mettre à jour le secret `UNIPILE_DSN` avec la nouvelle valeur
2. Mettre à jour le secret `UNIPILE_API_KEY` avec la nouvelle valeur
3. Tester la connexion en appelant `check-linkedin-connection` pour vérifier que les nouveaux identifiants fonctionnent

### Aucun fichier à modifier

Le code des Edge Functions utilise déjà `Deno.env.get("UNIPILE_DSN")` et `Deno.env.get("UNIPILE_API_KEY")` — seuls les secrets changent, pas le code.

