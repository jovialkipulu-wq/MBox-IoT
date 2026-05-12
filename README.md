# MeetingBox IoT

Application web de gestion d'une salle connectée (MeetingBox) au Campus ICAM. Elle combine un tableau de bord IoT en temps réel via ThingsBoard et un système de réservation de créneaux horaires.

---

## Architecture du projet

Le projet est structuré en trois parties :

| Dossier | Technologie | Rôle |
|---------|-------------|------|
| `backend/` | Python (Flask) + MariaDB | API REST, authentification, gestion des réservations |
| `app-react/` | React + Vite | Application principale — interface utilisateur |
| `gateway/` | Python (CircuitPython + MQTT) | Acquisition capteurs et télémétrie ThingsBoard |

---

## Fonctionnalités

### Données capteurs en temps réel (ThingsBoard)
- Intégration d'un dashboard ThingsBoard public
- Affichage des données capteurs : température, humidité, CO₂, luminosité, détection de présence

### Réservation de salle
- Sélection d'une date et d'un créneau horaire (08h00 – 18h00, tranches de 1h)
- Réservation protégée par un **PIN à 4 chiffres**
- Annulation possible uniquement avec le bon PIN
- Vérification des conflits de créneaux (pas de double réservation)

### Panneau Administrateur
- Connexion sécurisée par mot de passe (`ADMIN_PASSWORD`)
- Visualisation de **toutes** les réservations
- Annulation directe sans PIN requis

---

## Démarrage rapide

### Prérequis
- Python 3.10+
- Node.js 18+
- MariaDB (ou MySQL) local

---

## Démarrer sur Windows

### 1) Base de données (MariaDB)
```bat
cd backend
mysql -u root -p < setup_mariadb.sql
```

Optionnel : configurer un fichier `.env` dans `backend/` pour surcharger les variables :
`MARIADB_HOST`, `MARIADB_PORT`, `MARIADB_USER`, `MARIADB_PASSWORD`, `MARIADB_DATABASE`, `ADMIN_PASSWORD`, `SECRET_KEY`.

### 2) Backend (Flask)
```bat
cd backend
pip install -r requirements.txt
python app.py
```

Le serveur démarre sur `http://localhost:5000`.

### 3) Frontend (React)
```bat
cd app-react
npm install
npm run dev
```

L'application est accessible sur `http://localhost:5173` (par défaut Vite).

### 4) Passerelle IoT (Raspberry Pi)
> À exécuter **uniquement sur le Raspberry Pi** connecté aux capteurs.

```bat
cd gateway
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python connect.py
```

---

## Démarrer sur Linux / macOS

### 1) Base de données (MariaDB)
```bash
cd backend
mysql -u root -p < setup_mariadb.sql
```

Optionnel : configurer un fichier `.env` dans `backend/` pour surcharger les variables :
`MARIADB_HOST`, `MARIADB_PORT`, `MARIADB_USER`, `MARIADB_PASSWORD`, `MARIADB_DATABASE`, `ADMIN_PASSWORD`, `SECRET_KEY`.

### 2) Backend (Flask)
```bash
cd backend
pip install -r requirements.txt
python app.py
```

Le serveur démarre sur `http://localhost:5000`.

### 3) Frontend (React)
```bash
cd app-react
npm install
npm run dev
```

L'application est accessible sur `http://localhost:5173` (par défaut Vite).

### 4) Passerelle IoT (Raspberry Pi)
```bash
cd gateway
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python connect.py
```

---

## Liens utiles
- Backend Flask : `http://localhost:5000`
- Frontend React (Vite) : `http://localhost:5173`

---

## Structure de l'API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/health` | Vérification du service |
| `POST` | `/api/auth/admin` | Connexion administrateur |
| `GET` | `/api/reservations?date=YYYY-MM-DD` | Liste des réservations par date |
| `POST` | `/api/reservations` | Créer une réservation |
| `DELETE` | `/api/reservations/<id>` | Annuler avec PIN |
| `GET` | `/api/reservations/admin/all` | Liste complète (admin) |
| `DELETE` | `/api/reservations/admin/<id>` | Annulation admin |

---

## Technologies utilisées

- **Frontend** : React + Vite
- **Backend** : Flask, Flask-CORS
- **Base de données** : MariaDB
- **IoT / Visualisation** : ThingsBoard (iframe)

---

## Auteur

Développé dans le cadre du projet IoT — Campus ICAM © 2026

