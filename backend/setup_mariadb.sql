-- Créer la base de données si elle n'existe pas
CREATE DATABASE IF NOT EXISTS meetingbox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Supprimer l'utilisateur existant s'il y a des problèmes
DROP USER IF EXISTS 'meetingbox'@'localhost';
FLUSH PRIVILEGES;

-- Créer un nouvel utilisateur avec authentification native
CREATE USER 'meetingbox'@'localhost' IDENTIFIED BY 'meetingbox_password';

-- Donner les droits
GRANT ALL PRIVILEGES ON meetingbox.* TO 'meetingbox'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;

-- Créer les tables
USE meetingbox;

CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reserved_by VARCHAR(120) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    room VARCHAR(16) NOT NULL DEFAULT 'A',
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at DATETIME NULL,
    INDEX idx_reservations_date_status (start_time, status)
);

-- Vérifier
SELECT 'Configuration réussie!' as status;
SELECT COUNT(*) as tables_count FROM information_schema.TABLES WHERE TABLE_SCHEMA='meetingbox';
