import os
from pathlib import Path


def _load_dotenv():
    env_path = Path(__file__).with_name(".env")
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


_load_dotenv()


class Config:
    MARIADB_HOST = os.getenv("MARIADB_HOST", "localhost")
    MARIADB_PORT = int(os.getenv("MARIADB_PORT", "3306"))
    MARIADB_USER = os.getenv("MARIADB_USER", "meetingbox")
    MARIADB_PASSWORD = os.getenv("MARIADB_PASSWORD", "meetingbox_password")
    MARIADB_DATABASE = os.getenv("MARIADB_DATABASE", "meetingbox")

    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    DEBUG = os.getenv("FLASK_DEBUG", "1") == "1"
