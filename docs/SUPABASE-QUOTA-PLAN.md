# Supabase — pourquoi le quota explose et comment l'arrêter définitivement

*Mis à jour : juillet 2026. Contexte : le projet a été suspendu 2 fois pour
« Edge Functions Invocations Exceeded » alors que le site a peu de trafic.*

## Diagnostic (preuves : logs 7 jours, `public.csv` + `v3.csv`)

1. **Le site public n'est PAS le problème.** Quelques lectures par heure.
   Depuis, un cache client (`cachedGet`, TTL 5 min) réduit encore ces appels.
2. **La synchronisation Logicom est la charge.** L'app de sync sur le PC
   serveur tourne 24 h/24 et envoie **un `PUT /wp-json/wc/v3/products/<id>`
   par produit**, en balayages complets du catalogue (IDs séquentiels
   303→341, 352→382, 427→589…), que le produit ait changé ou non. Chaque
   requête = 1 invocation facturée. C'est la seule source soutenue 24/7.
3. **Point clé : un rate-limiter ne réduit PAS les invocations.** Une requête
   rejetée en 429 est déjà comptée. La seule solution est d'**appeler moins**.
4. **Pourquoi ça a récidivé :** les correctifs (rate-limits, cache headers,
   endpoint batch) sont dans git mais **la fonction n'a jamais été redéployée**
   (impossible projet en pause) et **l'app de sync n'a jamais été reconfigurée**.
   Rien n'a donc changé en production → même consommation → re-dépassement.

## Checklist de sortie de crise (dans l'ordre)

1. **Régler la facture / désactiver le Spend Cap** → le projet se réactive.
2. **Déployer immédiatement la fonction** (rate-limits + cache headers +
   endpoint batch deviennent effectifs) :
   `supabase functions deploy make-server-0c561120`
3. **Reconfigurer la sync Logicom (le vrai levier, ÷100) :**
   - utiliser `POST /wp-json/wc/v3/products/batch` avec
     `{ "update": [ …jusqu'à 100 produits… ] }` → 1 invocation au lieu de 100 ;
   - n'envoyer **que les produits modifiés** (suivi de la date de modification
     côté Logicom) ;
   - passer la cadence à **15–30 min** (ou heures ouvrées uniquement via le
     Planificateur de tâches Windows) — à défaut de batch, cela seul ÷3 à ÷5.
4. **Optionnel :** proxy Cloudflare (gratuit) devant `/public/*` avec cache
   60 s → les bots ne consomment plus d'invocations.
5. **Réactiver le Spend Cap** une fois stabilisé.

## Base de données à soi (sans Supabase) — options

- **A. Auto-héberger l'API sur le PC serveur existant** (celui de la sync,
  déjà allumé 24/7). La fonction edge est du **Hono** : elle se porte quasi
  1:1 en Node/Bun + **SQLite** (le KV devient une table clé/valeur). Exposer
  au public via **Cloudflare Tunnel** (gratuit, HTTPS, pas d'IP fixe requise).
  - − : sauvegardes, coupures de courant/PC, sécurité et l'authentification
    admin à remplacer (JWT simple) ; le Storage (documents devis) à re-faire
    sur disque.
- **B. VPS à ~5 $/mois** (Hetzner/Contabo) avec la même stack, ou
  **Supabase self-hosted (Docker)** pour garder Auth + Storage identiques —
  plus lourd à administrer.
- **C. Rester sur Supabase** : une fois la sync corrigée (étape 3), le quota
  Pro (2 M invocations) est très largement suffisant — c'est l'option la
  moins chère en temps.

**Recommandation :** C d'abord (corriger la sync coûte 0 DA), A en projet
moyen terme si l'indépendance devient prioritaire — la migration du code est
simple et peut être faite sur demande.
