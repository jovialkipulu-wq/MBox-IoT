import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from config import Config
from db import init_mariadb
from routes_auth import auth_bp
from routes_reservations import reservations_bp
from routes_room import room_bp

def create_app():
    # 1. Calcul du chemin vers le dossier 'dist' de React
    # On part de /backend, on remonte d'un niveau, et on va dans /app-react/dist
    current_dir = os.path.dirname(os.path.abspath(__file__))
    dist_path = os.path.join(current_dir, "..", "app-react", "dist")

    # 2. Initialisation de Flask avec le dossier statique pointant vers 'dist'
    app = Flask(__name__, 
                static_folder=dist_path, 
                static_url_path='/')
    
    app.config.from_object(Config)
    CORS(app)

    # Initialisation de la base de données
    init_mariadb(app)

    # 3. Enregistrement des Blueprints (tes routes API)
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(reservations_bp, url_prefix="/api/reservations")
    app.register_blueprint(room_bp, url_prefix="/api/room")

    # Route de santé pour l'API
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "service": "meetingbox-backend"})

    # 4. Route "Catch-all" pour servir le Frontend React
    # Cette route sert les fichiers (js, css, images) s'ils existent, 
    # sinon elle renvoie l'index.html pour que React Router prenne le relais.
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')

    @app.errorhandler(RuntimeError)
    def runtime_error_handler(err):
        return jsonify({"success": False, "error": str(err)}), 500

    return app

if __name__ == "__main__":
    app = create_app()
    # On affiche un petit message pour vérifier le chemin au lancement
    print(f"🚀 Serveur lancé !")
    print(f"📂 Interface React recherchée dans : {os.path.abspath(app.static_folder)}")
    
    app.run(host="0.0.0.0", port=5000, debug=True)