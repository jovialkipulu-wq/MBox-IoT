from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from db import init_mariadb
from routes_auth import auth_bp
from routes_reservations import reservations_bp
from routes_sensors import sensors_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)

    init_mariadb(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(reservations_bp, url_prefix="/api/reservations")
    app.register_blueprint(sensors_bp, url_prefix="/api/sensors")

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "service": "meetingbox-backend"})

    @app.errorhandler(RuntimeError)
    def runtime_error_handler(err):
        return jsonify({"success": False, "error": str(err)}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
