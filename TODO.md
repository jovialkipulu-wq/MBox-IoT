# Plan : Étendre le ThingsBoard sur toute la largeur

## Problème
La section ThingsBoard (`#data`) est limitée par `.section { max-width: 1100px; margin: 0 auto; }`. L'iframe fait `width: 100%` mais reste confinée dans un conteneur de 1100px max.

## Étapes

- [x] **Dashboard.jsx** : Ajouter une classe modificateur `section-wide` à la section `#data` (ThingsBoard)
- [x] **Dashboard.css** : 
   - Créer la classe `.section-wide` qui supprime `max-width` et met les marges à 0
   - L'iframe wrap (`tb-iframe-wrap`) occupera 100% de la largeur
   - Augmenter la hauteur de l'iframe (`tb-iframe`) à `75vh` pour un meilleur rendu

## Fichiers modifiés
- `app-react/src/Dashboard.jsx`
- `app-react/src/Dashboard.css`

