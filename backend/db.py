from datetime import datetime
import pymysql
from influxdb_client import InfluxDBClient


influx_client = None
influx_query_api = None
_mariadb_config = None


def init_mariadb(app):
    global _mariadb_config
    _mariadb_config = {
        "host": app.config["MARIADB_HOST"],
        "port": app.config["MARIADB_PORT"],
        "user": app.config["MARIADB_USER"],
        "password": app.config["MARIADB_PASSWORD"],
        "database": app.config["MARIADB_DATABASE"],
        "charset": "utf8mb4",
        "cursorclass": pymysql.cursors.DictCursor,
        "autocommit": False,
    }
    try:
        conn = pymysql.connect(**_mariadb_config)
        conn.close()
        _create_tables()
    except Exception as exc:
        _mariadb_config = None
        print(f"[WARN] MariaDB indisponible: {exc}")


def get_mariadb():
    if _mariadb_config is None:
        raise RuntimeError(
            "MariaDB non connecte. Verifiez MARIADB_HOST/MARIADB_USER/MARIADB_PASSWORD/MARIADB_DATABASE."
        )
    return pymysql.connect(**_mariadb_config)


def _create_tables():
    conn = get_mariadb()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS reservations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            reserved_by VARCHAR(120) NOT NULL,
            pin_hash VARCHAR(255) NOT NULL,
            room VARCHAR(16) NOT NULL DEFAULT 'A',
            start_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL,
            status ENUM('confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            cancelled_at DATETIME NULL
        )
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_reservations_date_status
        ON reservations (start_time, status)
        """
    )
    conn.commit()
    cur.close()
    conn.close()


def init_influxdb(app):
    global influx_client, influx_query_api
    token = app.config["INFLUXDB_TOKEN"]
    if not token:
        influx_client = None
        influx_query_api = None
        return
    influx_client = InfluxDBClient(
        url=app.config["INFLUXDB_URL"],
        token=token,
        org=app.config["INFLUXDB_ORG"],
    )
    influx_query_api = influx_client.query_api()


def get_influx_query():
    return influx_query_api


def format_dt(value):
    if isinstance(value, datetime):
        return value.isoformat(sep="T", timespec="seconds")
    return value
