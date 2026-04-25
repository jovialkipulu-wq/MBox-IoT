from datetime import datetime, timedelta
import random
from flask import Blueprint, jsonify, request


sensors_bp = Blueprint("sensors", __name__)

_latest_cache = {
    "temperature": 23.2,
    "humidity": 45,
    "co2": 640,
    "light": 320,
    "presence": False,
    "timestamp": datetime.now().isoformat(timespec="seconds"),
}


def _simulate_latest():
    # Simulation douce pour un rendu réaliste en attendant la Raspberry Pi.
    _latest_cache["temperature"] = round(random.uniform(21.0, 25.8), 1)
    _latest_cache["humidity"] = random.randint(35, 60)
    _latest_cache["co2"] = random.randint(500, 1200)
    _latest_cache["light"] = random.randint(120, 600)
    _latest_cache["presence"] = random.choice([True, False, False])
    _latest_cache["timestamp"] = datetime.now().isoformat(timespec="seconds")
    return _latest_cache


@sensors_bp.route("/latest", methods=["GET"])
def latest():
    return jsonify(_simulate_latest())


@sensors_bp.route("/history", methods=["GET"])
def history():
    sensor = request.args.get("sensor", "temperature")
    count = max(5, min(int(request.args.get("count", "60")), 300))

    now = datetime.now()
    base = {"temperature": 23.0, "co2": 700, "humidity": 45, "light": 300}.get(sensor, 1)
    variance = {"temperature": 1.8, "co2": 250, "humidity": 12, "light": 180}.get(sensor, 0.5)
    points = []
    for i in range(count):
        t = now - timedelta(minutes=(count - i))
        val = base + random.uniform(-variance, variance)
        if sensor in ("co2", "light", "humidity"):
            val = int(max(0, val))
        else:
            val = round(val, 2)
        points.append({"time": t.isoformat(timespec="seconds"), "value": val})
    return jsonify({"sensor": sensor, "data": points})
