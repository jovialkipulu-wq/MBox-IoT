from flask import Blueprint, current_app, jsonify, request


auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/admin", methods=["POST"])
def admin_login():
    payload = request.get_json(silent=True) or {}
    password = payload.get("password", "")
    ok = password and password == current_app.config["ADMIN_PASSWORD"]
    if ok:
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Mot de passe incorrect"}), 401
