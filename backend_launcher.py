import os
import sys
from waitress import serve

def get_runtime_base_dir():
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

RUNTIME_BASE_DIR = get_runtime_base_dir()

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ems_system.settings")

if RUNTIME_BASE_DIR not in sys.path:
    sys.path.insert(0, RUNTIME_BASE_DIR)

# Fallbacks only (Electron should pass these in packaged mode)
os.environ.setdefault("EMS_DB_PATH", os.path.join(RUNTIME_BASE_DIR, "db.sqlite3"))
os.environ.setdefault("EMS_MEDIA_ROOT", os.path.join(RUNTIME_BASE_DIR, "media"))

print("=== EMS Backend Launcher ===")
print("Frozen:", getattr(sys, "frozen", False))
print("sys._MEIPASS:", getattr(sys, "_MEIPASS", None))
print("Runtime base dir:", RUNTIME_BASE_DIR)
print("EMS_DB_PATH from env:", os.environ.get("EMS_DB_PATH"))
print("EMS_MEDIA_ROOT from env:", os.environ.get("EMS_MEDIA_ROOT"))
print("DJANGO_SETTINGS_MODULE:", os.environ.get("DJANGO_SETTINGS_MODULE"))
print("============================")

from ems_system.wsgi import application

if __name__ == "__main__":
    serve(application, host="127.0.0.1", port=8000, threads=8)