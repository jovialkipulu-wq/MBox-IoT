from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify, request
from db import get_mariadb

room_bp = Blueprint("room", __name__)

# Stockage en mémoire de l'état d'occupation (capteur PIR)
# Structure: {"occupied": bool, "last_seen": "ISO8601"}
_occupancy_state = {
    "occupied": False,
    "last_seen": None,
}

# ID de la réservation dont la présence a été validée au moins une fois
_presence_validated_for = None

# Délai de grâce (en minutes) avant annulation automatique si aucune présence
GRACE_PERIOD_MINUTES = 30


def _get_active_reservation():
    """Récupère la réservation active en cours (si elle existe)."""
    from db import get_mariadb

    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")

    conn = get_mariadb()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, reserved_by, start_time, end_time
        FROM reservations
        WHERE DATE(start_time) = %s
          AND status = 'confirmed'
          AND start_time <= %s
          AND end_time > %s
        ORDER BY start_time
        LIMIT 1
        """,
        (today_str, now, now),
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row


def _cancel_reservation(reservation_id):
    """Annule une réservation (statut 'cancelled')."""
    from db import get_mariadb
    conn = get_mariadb()
    cur = conn.cursor()
    cur.execute(
        "UPDATE reservations SET status = 'cancelled' WHERE id = %s",
        (reservation_id,),
    )
    conn.commit()
    cur.close()
    conn.close()


@room_bp.route("/occupancy", methods=["GET"])
def get_occupancy():
    """Retourne l'état d'occupation actuel de la salle."""
    return jsonify({
        "occupied": _occupancy_state["occupied"],
        "last_seen": _occupancy_state["last_seen"],
    })


@room_bp.route("/occupancy", methods=["POST"])
def set_occupancy():
    """Met à jour l'état d'occupation (appelé par la passerelle ou simulation)."""
    global _presence_validated_for

    payload = request.get_json(silent=True) or {}
    occupied = bool(payload.get("occupied", False))
    _occupancy_state["occupied"] = occupied
    _occupancy_state["last_seen"] = datetime.now(timezone.utc).isoformat()

    # Récupérer la réservation active
    row = _get_active_reservation()

    if occupied and row:
        # Présence détectée : on valide la réservation en cours
        _presence_validated_for = row["id"]
    elif not occupied and row:
        # Pas de présence détectée : vérifier si on dépasse le délai de grâce
        start_dt = row["start_time"]
        if isinstance(start_dt, str):
            start_dt = datetime.fromisoformat(start_dt.replace("Z", "+00:00"))

        minutes_since_start = (datetime.now() - start_dt).total_seconds() / 60.0

        if (
            _presence_validated_for != row["id"]
            and minutes_since_start > GRACE_PERIOD_MINUTES
        ):
            # Annulation automatique : délai dépassé sans présence validée
            _cancel_reservation(row["id"])
            # Réinitialiser le flag pour éviter toute confusion
            if _presence_validated_for == row["id"]:
                _presence_validated_for = None
            return jsonify({
                "success": True,
                "occupied": occupied,
                "auto_cancelled": True,
                "message": "Réservation annulée automatiquement (absence > 15min)",
            })

    return jsonify({"success": True, "occupied": occupied})


@room_bp.route("/status", methods=["GET"])
def get_room_status():
    """
    Calcule le statut global de la salle pour le frontend StatusBar.
    Status: 'free' | 'reserved' | 'occupied'
    """
    global _presence_validated_for

    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")

    conn = get_mariadb()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, reserved_by, start_time, end_time
        FROM reservations
        WHERE DATE(start_time) = %s
          AND status = 'confirmed'
          AND start_time <= %s
          AND end_time > %s
        ORDER BY start_time
        LIMIT 1
        """,
        (today_str, now, now),
    )
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        # Pas de réservation active : réinitialiser le flag
        _presence_validated_for = None
        return jsonify({"status": "free", "reservation": None})

    start_dt = row["start_time"]
    if isinstance(start_dt, str):
        start_dt = datetime.fromisoformat(start_dt.replace("Z", "+00:00"))

    minutes_since_start = (now - start_dt).total_seconds() / 60.0
    minutes_until_forfeit = max(0, GRACE_PERIOD_MINUTES - minutes_since_start)

    # Présence détectée dans les 15 premières minutes ?
    last_seen = _occupancy_state["last_seen"]
    presence_in_window = False
    if _occupancy_state["occupied"] and last_seen:
        last_seen_dt = datetime.fromisoformat(last_seen.replace("Z", "+00:00"))
        if start_dt <= last_seen_dt <= start_dt + timedelta(minutes=GRACE_PERIOD_MINUTES):
            presence_in_window = True
            _presence_validated_for = row["id"]

    if _presence_validated_for == row["id"] or (presence_in_window and minutes_since_start <= GRACE_PERIOD_MINUTES):
        status = "occupied"
    else:
        status = "reserved"

    return jsonify({
        "status": status,
        "grace_period_minutes": GRACE_PERIOD_MINUTES,
        "minutes_since_start": round(minutes_since_start, 1),
        "minutes_until_forfeit": round(minutes_until_forfeit, 1),
        "reservation": {
            "id": row["id"],
            "reserved_by": row["reserved_by"],
            "start_time": row["start_time"].isoformat() if isinstance(row["start_time"], datetime) else row["start_time"],
            "end_time": row["end_time"].isoformat() if isinstance(row["end_time"], datetime) else row["end_time"],
        },
    })
