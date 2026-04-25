# MeetingBox IoT

Application web de gestion d'une salle connectée (MeetingBox) au Campus ICAM. Elle combine un tableau de bord IoT en temps réel, un système de réservation de créneaux horaires, etc.

---

## Architecture du projet

Le projet est structuré en trois parties :

| Dossier | Technologie | Rôle |
|---------|-------------|------|
| `backend/` | Python (Flask) + MariaDB | API REST, authentification, gestion des réservations, données capteurs |
| `app-react/` | React + Vite | Application principale — interface utilisateur complète |
| `app/` | TypeScript + Vite | Version prototype/alternative du frontend |

---

## Fonctionnalités

### Tableau de bord IoT (ThingsBoard)
- Intégration d'un dashboard ThingsBoard public en temps réel
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

### Capteurs (simulation)
- Endpoints REST de simulation en attendant l'intégration matérielle (Raspberry Pi)
- Génération de données réalistes (variation douce des valeurs)
- Historique configurable (`/api/sensors/history?sensor=temperature&count=60`)

---

## Démarrage rapide

### Prérequis
- Python 3.10+
- Node.js 18+
- MariaDB (ou MySQL) local

### 1. Base de données

```bash
cd backend
mysql -u root -p < setup_mariadb.sql
```

> Vous pouvez aussi configurer un fichier `.env` dans `backend/` pour surcharger les variables : `MARIADB_HOST`, `MARIADB_PORT`, `MARIADB_USER`, `MARIADB_PASSWORD`, `MARIADB_DATABASE`, `ADMIN_PASSWORD`, `SECRET_KEY`.

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Le serveur Flask démarre sur `http://localhost:5000`.

### 3. Frontend React (principal)

```bash
cd app-react
npm install
npm run dev
```

L'application est accessible sur `http://localhost:5173` (par défaut Vite).

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
| `GET` | `/api/sensors/latest` | Dernières valeurs capteurs |
| `GET` | `/api/sensors/history` | Historique d'un capteur |

---

## Technologies utilisées

- **Frontend** : React 19, Vite, Recharts
- **Backend** : Flask, Flask-CORS, PyMySQL
- **Base de données** : MariaDB
- **IoT / Visualisation** : ThingsBoard (iframe)

---

## Auteur

Développé dans le cadre du projet IoT — Campus ICAM © 2026

