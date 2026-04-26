# Plan de nettoyage — MBox-IoT

## Étapes

- [x] 1. Supprimer `app/` (prototype TypeScript Vanilla abandonné)
- [x] 2. Supprimer `Dashboard.js` (racine) — ancien dashboard capteurs locaux
- [x] 3. Supprimer `Dashboard.css` (racine) — CSS de l'ancien dashboard
- [x] 4. Supprimer `app-react/src/App.css` — jamais importé
- [x] 5. Nettoyer `app-react/src/index.css` — retirer styles template Vite inutilisés
- [x] 6. Mettre à jour `README.md` — retirer mention de `app/`
- [x] 7. Retirer `recharts` de `app-react/package.json` — dépendance non utilisée
- [x] 8. Supprimer assets inutilisés (`hero.png`, `react.svg`, `vite.svg`, `icons.svg`)
- [x] 9. Supprimer dossier `app-react/src/assets` vide
- [x] 10. Supprimer `app-react/README.md` — README template Vite inutile
- [x] 11. Vérifier absence de références InfluxDB — aucune trouvée

