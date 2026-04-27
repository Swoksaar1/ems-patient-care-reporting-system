import os
import sys
from pathlib import Path

from waitress import serve


def get_runtime_base_dir():
    """
    If packaged by PyInstaller:
        returns folder beside ems_backend.exe

    If development:
        returns project root folder where backend_launcher.py is located
    """
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent

    return Path(__file__).resolve().parent


RUNTIME_BASE_DIR = get_runtime_base_dir()

# Make sure Django can find ems_system and reports
if str(RUNTIME_BASE_DIR) not in sys.path:
    sys.path.insert(0, str(RUNTIME_BASE_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ems_system.settings")

# These are fallback only.
# Electron main.js should pass the real live db path.
os.environ.setdefault("EMS_DB_PATH", str(RUNTIME_BASE_DIR / "db.sqlite3"))
os.environ.setdefault("EMS_MEDIA_ROOT", str(RUNTIME_BASE_DIR / "media"))

HOST = os.environ.get("EMS_BACKEND_HOST", "127.0.0.1")
PORT = int(os.environ.get("EMS_BACKEND_PORT", "8000"))

print("=== EMS Backend Launcher ===")
print("Frozen:", getattr(sys, "frozen", False))
print("sys._MEIPASS:", getattr(sys, "_MEIPASS", None))
print("Runtime base dir:", RUNTIME_BASE_DIR)
print("EMS_DB_PATH:", os.environ.get("EMS_DB_PATH"))
print("EMS_MEDIA_ROOT:", os.environ.get("EMS_MEDIA_ROOT"))
print("DJANGO_SETTINGS_MODULE:", os.environ.get("DJANGO_SETTINGS_MODULE"))
print("Serving at:", f"http://{HOST}:{PORT}")
print("============================")

from ems_system.wsgi import application


if __name__ == "__main__":
    serve(
        application,
        host=HOST,
        port=PORT,
        threads=8,
    )