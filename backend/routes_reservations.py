from datetime import datetime
from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash
from db import format_dt, get_mariadb


reservations_bp = Blueprint("reservations", __name__)


def _parse_iso(dt_string):
    return datetime.fromisoformat(dt_string.replace("Z", "+00:00"))


@reservations_bp.route("", methods=["GET"])
def list_by_date():
    date_str = request.args.get("date")
    if not date_str:
        return jsonify({"error": "date query param required"}), 400

    conn = get_mariadb()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, room, reserved_by, start_time, end_time, status
        FROM reservations
        WHERE DATE(start_time) = %s
        ORDER BY start_time
        """,
        (date_str,),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    for row in rows:
        row["start_time"] = format_dt(row["start_time"])
        row["end_time"] = format_dt(row["end_time"])
    return jsonify(rows)


@reservations_bp.route("", methods=["POST"])
def create_reservation():
    payload = request.get_json(silent=True) or {}
    required = ["reserved_by", "pin", "start_time", "end_time"]
    if any(not payload.get(k) for k in required):
        return jsonify({"success": False, "error": "Champs manquants"}), 400
    if len(str(payload["pin"])) != 4 or not str(payload["pin"]).isdigit():
        return jsonify({"success": False, "error": "PIN invalide"}), 400

    room = payload.get("room", "A")
    start_dt = _parse_iso(payload["start_time"])
    end_dt = _parse_iso(payload["end_time"])
    if end_dt <= start_dt:
        return jsonify({"success": False, "error": "Plage horaire invalide"}), 400

    conn = get_mariadb()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id FROM reservations
        WHERE room = %s
          AND status = 'confirmed'
          AND start_time < %s
          AND end_time > %s
        LIMIT 1
        """,
        (room, end_dt, start_dt),
    )
    conflict = cur.fetchone()
    if conflict:
        cur.close()
        conn.close()
        return jsonify({"success": False, "error": "Créneau déjà réservé"}), 409

    pin_hash = generate_password_hash(str(payload["pin"]), method="scrypt")
    cur.execute(
        """
        INSERT INTO reservations (reserved_by, pin_hash, room, start_time, end_time, status)
        VALUES (%s, %s, %s, %s, %s, 'confirmed')
        """,
        (payload["reserved_by"].strip(), pin_hash, room, start_dt, end_dt),
    )
    conn.commit()
    reservation_id = cur.lastrowid
    cur.close()
    conn.close()
    return jsonify({"success": True, "id": reservation_id}), 201


@reservations_bp.route("/<int:reservation_id>", methods=["DELETE"])
def cancel_with_pin(reservation_id):
    payload = request.get_json(silent=True) or {}
    pin = str(payload.get("pin", ""))
    if len(pin) != 4 or not pin.isdigit():
        return jsonify({"success": False, "error": "PIN invalide"}), 400

    conn = get_mariadb()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, pin_hash, status FROM reservations WHERE id = %s LIMIT 1
        """,
        (reservation_id,),
    )
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({"success": False, "error": "Réservation introuvable"}), 404
    if row["status"] != "confirmed":
        cur.close()
        conn.close()
        return jsonify({"success": False, "error": "Réservation déjà annulée"}), 400
    if not check_password_hash(row["pin_hash"], pin):
        cur.close()
        conn.close()
        return jsonify({"success": False, "error": "PIN incorrect"}), 403

    cur.execute(
        """
        UPDATE reservations
        SET status='cancelled', cancelled_at=NOW()
        WHERE id=%s
        """,
        (reservation_id,),
    )
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True})


@reservations_bp.route("/admin/all", methods=["GET"])
def admin_list_all():
    conn = get_mariadb()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, room, reserved_by, start_time, end_time, status, created_at, cancelled_at
        FROM reservations
        ORDER BY start_time DESC
        """
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    for row in rows:
        row["start_time"] = format_dt(row["start_time"])
        row["end_time"] = format_dt(row["end_time"])
        row["created_at"] = format_dt(row["created_at"])
        row["cancelled_at"] = format_dt(row["cancelled_at"])
    return jsonify(rows)


@reservations_bp.route("/admin/<int:reservation_id>", methods=["DELETE"])
def admin_cancel(reservation_id):
    conn = get_mariadb()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE reservations
        SET status='cancelled', cancelled_at=NOW()
        WHERE id=%s AND status='confirmed'
        """,
        (reservation_id,),
    )
    conn.commit()
    changed = cur.rowcount
    cur.close()
    conn.close()
    if changed == 0:
        return jsonify({"success": False, "error": "Réservation introuvable"}), 404
    return jsonify({"success": True})
