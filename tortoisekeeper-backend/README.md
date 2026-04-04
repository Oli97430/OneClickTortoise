# TortoiseKeeper Backend

Ce backend Express permet la synchronisation réseau des fiches tortues, photos (base64) et poids pour l'application TortoiseKeeper.

## Installation

1. Ouvre un terminal dans le dossier `tortoisekeeper-backend`.
2. Installe les dépendances :
   ```bash
   npm install
   ```

## Configuration

Créez un fichier `.env` dans le dossier `tortoisekeeper-backend` avec les variables suivantes :

```env
PORT=4000
AUTH_USER=admin
AUTH_PASS=tortue2025
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

Si le fichier `.env` n'existe pas, les valeurs par défaut seront utilisées.

## Lancement

```bash
npm start
```

- L'API sera accessible sur `http://<ip-de-ton-pc>:4000` pour tous les appareils du réseau local.
- Une route `/health` est disponible pour vérifier l'état du serveur.

## Authentification
- Toutes les modifications (ajout/édition/suppression) nécessitent une authentification HTTP Basic.
- Les identifiants sont configurés via les variables d'environnement `AUTH_USER` et `AUTH_PASS`.

## Endpoints

### Tortues
- `GET /api/tortoises` : liste des tortues
- `POST /api/tortoises` : ajout (auth requis, validation des données)
- `PUT /api/tortoises/:id` : modification (auth requis, validation des données)
- `DELETE /api/tortoises/:id` : suppression (auth requis, supprime aussi les données associées)

### Photos
- `GET /api/photos` : liste des photos
- `POST /api/photos` : ajout (auth requis, validation des données)
- `PUT /api/photos/:id` : modification (auth requis)
- `DELETE /api/photos/:id` : suppression (auth requis)

### Poids
- `GET /api/weights` : liste des poids
- `POST /api/weights` : ajout (auth requis, validation des données)
- `PUT /api/weights/:id` : modification (auth requis)
- `DELETE /api/weights/:id` : suppression (auth requis)

### Mesures
- `GET /api/measurements` : liste des mesures
- `POST /api/measurements` : ajout (auth requis, validation des données)
- `PUT /api/measurements/:id` : modification (auth requis)
- `DELETE /api/measurements/:id` : suppression (auth requis)

### Santé
- `GET /health` : vérifie l'état du serveur

## Validation des données

Le backend valide maintenant toutes les données avant de les enregistrer :

- **Tortues** : nom, date de naissance, espèce et sexe requis
- **Poids** : ID de tortue, date et poids positif requis
- **Photos** : ID de tortue, URL et date requis
- **Mesures** : ID de tortue, date, longueur et largeur positives requises

## Gestion d'erreurs

- Toutes les routes sont protégées contre les erreurs asynchrones
- Les messages d'erreur sont structurés en JSON
- Les erreurs sont loggées dans la console en développement
- Les erreurs 401 retournent un message clair pour l'authentification

## CORS

- Par défaut, seules les origines configurées dans `CORS_ORIGINS` sont autorisées
- En développement, toutes les origines sont autorisées si `NODE_ENV=development`
- La configuration CORS peut être personnalisée via la variable d'environnement

## Stockage
- Toutes les données sont dans `data.json` (créé automatiquement).
- Les photos sont stockées en base64 dans ce fichier.
- La structure des données est validée à chaque lecture.

## Sécurité
- Ce backend est prévu pour un usage local/réseau domestique, pas pour l'internet public.
- Les credentials doivent être changés en production via les variables d'environnement.
- Ne commitez jamais le fichier `.env` contenant les mots de passe.

---

Pour toute question ou adaptation, demande à Cascade !
