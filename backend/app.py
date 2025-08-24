# import os
# from typing import Set

# from flask import Flask, jsonify, request, make_response
# from flask_cors import CORS
# from dotenv import load_dotenv
# from pymongo import MongoClient

# # Blueprints
# from routes.upload import upload_bp
# from routes.insights import insights_bp
# from routes.auth import auth_bp  # keep import here so it's registered below

# # Load .env variables
# load_dotenv()

# app = Flask(__name__)

# CORS(app, resources={r"/*": {"origins": "*"}})  # relax during testing

# # --------------------------- CORS ---------------------------
# # Allowed dev origins (no wildcard if credentials are enabled)
# ALLOWED_ORIGINS: Set[str] = {
#     "http://localhost:5173",
#     "http://127.0.0.1:5173",
# }

# # Flask-CORS will attach headers for us on normal requests.
# # We also add a tiny preflight handler below to be extra explicit.
# CORS(
#     app,
#     resources={r"/*": {"origins": list(ALLOWED_ORIGINS)}},
#     supports_credentials=True,
#     allow_headers=["Content-Type", "Authorization"],
#     methods=["GET", "POST", "OPTIONS"],
# )

# # Optional tweak: ensure every OPTIONS (preflight) gets a 204 with the right headers.
# @app.before_request
# def handle_cors_preflight():
#     if request.method == "OPTIONS":
#         origin = request.headers.get("Origin", "")
#         resp = make_response("", 204)
#         if origin in ALLOWED_ORIGINS:
#             resp.headers["Access-Control-Allow-Origin"] = origin
#             resp.headers["Vary"] = "Origin"
#             resp.headers["Access-Control-Allow-Credentials"] = "true"
#             resp.headers["Access-Control-Allow-Headers"] = request.headers.get(
#                 "Access-Control-Request-Headers", "Content-Type, Authorization"
#             )
#             resp.headers["Access-Control-Allow-Methods"] = request.headers.get(
#                 "Access-Control-Request-Method", "GET, POST, OPTIONS"
#             )
#         return resp
#     return None

# # Also mirror CORS headers on normal responses (useful if a proxy skips Flask-CORS)
# @app.after_request
# def add_cors_headers(resp):
#     origin = request.headers.get("Origin")
#     if origin in ALLOWED_ORIGINS:
#         resp.headers["Access-Control-Allow-Origin"] = origin
#         resp.headers["Vary"] = "Origin"
#         resp.headers["Access-Control-Allow-Credentials"] = "true"
#     return resp

# # -------------------------- Config --------------------------
# app.config["JWT_SECRET"] = os.getenv("JWT_SECRET", "devsecret")
# app.config["STORAGE_PATH"] = os.getenv("STORAGE_PATH", "./storage")
# os.makedirs(app.config["STORAGE_PATH"], exist_ok=True)

# # ------------------------- Database -------------------------
# mongo = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
# db = mongo.get_database("bizinsights")

# # Attach to app so blueprints can use them
# app.db = db
# app.storage_path = app.config["STORAGE_PATH"]
# app.jwt_secret = app.config["JWT_SECRET"]

# # ------------------------ Blueprints ------------------------
# app.register_blueprint(auth_bp, url_prefix="/auth")
# app.register_blueprint(upload_bp, url_prefix="/upload")

# # Mount insights under /insights (keeps existing /insights/* routes working)
# app.register_blueprint(insights_bp, url_prefix="/insights")

# # ---- Public mirrors for the new “/api/<workspace_id>/…” endpoints ----
# # These reuse the handlers defined inside routes.insights (api_schema, api_distinct, api_series, api_rows)
# app.add_url_rule(
#     "/api/<workspace_id>/schema",
#     view_func=app.view_functions["insights.api_schema"],
#     methods=["GET", "OPTIONS"],
# )
# app.add_url_rule(
#     "/api/<workspace_id>/distinct",
#     view_func=app.view_functions["insights.api_distinct"],
#     methods=["GET", "OPTIONS"],
# )
# app.add_url_rule(
#     "/api/<workspace_id>/series",
#     view_func=app.view_functions["insights.api_series"],
#     methods=["POST", "OPTIONS"],
# )
# app.add_url_rule(
#     "/api/<workspace_id>/rows",
#     view_func=app.view_functions["insights.api_rows"],
#     methods=["POST", "OPTIONS"],
# )

# # ----------------------- Health Check -----------------------
# @app.get("/health")
# def health():
#     return jsonify(status="ok")

# # ------------------------- Entrypoint ------------------------
# if __name__ == "__main__":
#     # Use 0.0.0.0 so the Vite dev server / browser can reach it
#     app.run(host="0.0.0.0", port=5001, debug=True)


# # backend/app.py
# import os
# from typing import List, Set, Optional

# from flask import Flask, jsonify, request, make_response
# from flask_cors import CORS
# from dotenv import load_dotenv
# from pymongo import MongoClient
# from pymongo.errors import ConfigurationError

# # Blueprints
# from routes.upload import upload_bp
# from routes.insights import insights_bp
# from routes.auth import auth_bp

# # ------------------------------------------------------------
# # Load environment variables
# # ------------------------------------------------------------
# load_dotenv()

# # ------------------------------------------------------------
# # Flask app
# # ------------------------------------------------------------
# app = Flask(__name__)

# # ------------------------------------------------------------
# # CORS (configure by env: ALLOWED_ORIGINS)
# #   Example value on Render:
# #   ALLOWED_ORIGINS=https://YOUR_SITE.netlify.app,http://localhost:5173
# #   You can also set FRONTEND_ORIGIN to add a single origin.
# # ------------------------------------------------------------
# def _parse_origins() -> List[str]:
#     raw = os.getenv("ALLOWED_ORIGINS", "")
#     items = [o.strip() for o in raw.split(",") if o.strip()]

#     # sensible local fallbacks for dev
#     if not items:
#         items = [
#             "http://localhost:5173",
#             "http://127.0.0.1:5173",
#         ]
#         fe = os.getenv("FRONTEND_ORIGIN")
#         if fe:
#             items.append(fe)

#     # de-dupe while preserving order
#     seen: Set[str] = set()
#     uniq: List[str] = []
#     for o in items:
#         if o not in seen:
#             uniq.append(o)
#             seen.add(o)
#     return uniq

# ALLOWED_ORIGINS: List[str] = _parse_origins()

# CORS(
#     app, resources={r"/*": {"origins": "*"}}, supports_credentials=False,
#     supports_credentials=True,
#     allow_headers=["Content-Type", "Authorization"],
#     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
# )


# # Mirror CORS headers on normal responses (helps if a proxy strips them)
# @app.after_request
# def add_cors_headers(resp):
#     origin = request.headers.get("Origin")
#     if origin and origin in ALLOWED_ORIGINS:
#         resp.headers["Access-Control-Allow-Origin"] = origin
#         resp.headers["Vary"] = "Origin"
#         resp.headers["Access-Control-Allow-Credentials"] = "true"
#     return resp

# # Reply to naked OPTIONS quickly (Flask-CORS already handles this; extra safety)
# @app.before_request
# def handle_preflight():
#     if request.method == "OPTIONS":
#         origin = request.headers.get("Origin", "")
#         resp = make_response("", 204)
#         if origin in ALLOWED_ORIGINS:
#             resp.headers["Access-Control-Allow-Origin"] = origin
#             resp.headers["Vary"] = "Origin"
#             resp.headers["Access-Control-Allow-Credentials"] = "true"
#             resp.headers["Access-Control-Allow-Headers"] = request.headers.get(
#                 "Access-Control-Request-Headers", "Content-Type, Authorization"
#             )
#             resp.headers["Access-Control-Allow-Methods"] = request.headers.get(
#                 "Access-Control-Request-Method", "GET, POST, PUT, DELETE, OPTIONS"
#             )
#         return resp
#     return None

# # ------------------------------------------------------------
# # App config
# # ------------------------------------------------------------
# app.config["JWT_SECRET"] = os.getenv("JWT_SECRET", "devsecret_change_me")
# app.config["STORAGE_PATH"] = os.getenv("STORAGE_PATH", "./storage")
# os.makedirs(app.config["STORAGE_PATH"], exist_ok=True)

# # ------------------------------------------------------------
# # Database (Atlas-friendly)
# #   Works whether DB name is in URI or provided via MONGO_DB.
# #   Avoids truthiness checks that crash with PyMongo Database objects.
# # ------------------------------------------------------------
# mongo_uri = os.getenv("MONGO_URI")
# if not mongo_uri:
#     # Require MONGO_URI for your deployment; avoids silently using localhost.
#     raise RuntimeError(
#         "MONGO_URI is not set. Add it to your environment (e.g., Render env vars)."
#     )

# client = MongoClient(mongo_uri)

# # Try to get the default DB from the URI (e.g., ...mongodb.net/quickinsights?...).
# default_db = None  # type: Optional[object]
# try:
#     default_db = client.get_default_database()
# except ConfigurationError:
#     default_db = None  # URI didn’t include a db name

# # If not in URI, use MONGO_DB or fall back to "quickinsights"
# env_db_name = os.getenv("MONGO_DB")
# if default_db is not None:
#     db = default_db
# else:
#     db = client[env_db_name or "quickinsights"]

# # Make available to blueprints
# app.db = db                                       # type: ignore[attr-defined]
# app.storage_path = app.config["STORAGE_PATH"]     # type: ignore[attr-defined]
# app.jwt_secret = app.config["JWT_SECRET"]         # type: ignore[attr-defined]

# # ------------------------------------------------------------
# # Blueprints
# # ------------------------------------------------------------
# app.register_blueprint(auth_bp, url_prefix="/auth")
# app.register_blueprint(upload_bp, url_prefix="/upload")
# app.register_blueprint(insights_bp, url_prefix="/insights")

# # Public mirrors for /api/<workspace_id>/… endpoints defined in insights_bp
# app.add_url_rule(
#     "/api/<workspace_id>/schema",
#     view_func=app.view_functions["insights.api_schema"],
#     methods=["GET", "OPTIONS"],
# )
# app.add_url_rule(
#     "/api/<workspace_id>/distinct",
#     view_func=app.view_functions["insights.api_distinct"],
#     methods=["GET", "OPTIONS"],
# )
# app.add_url_rule(
#     "/api/<workspace_id>/series",
#     view_func=app.view_functions["insights.api_series"],
#     methods=["POST", "OPTIONS"],
# )
# app.add_url_rule(
#     "/api/<workspace_id>/rows",
#     view_func=app.view_functions["insights.api_rows"],
#     methods=["POST", "OPTIONS"],
# )

# # ------------------------------------------------------------
# # Health check
# # ------------------------------------------------------------
# @app.get("/health")
# def health():
#     return jsonify(status="ok")

# # ------------------------------------------------------------
# # Entrypoint (Gunicorn will import "app"; this block is only for local dev)
# # ------------------------------------------------------------
# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=5001, debug=True)


# backend/app.py
import os
from typing import List, Set, Optional

from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConfigurationError

# Blueprints
from routes.upload import upload_bp
from routes.insights import insights_bp
from routes.auth import auth_bp

# ------------------------------------------------------------
# Load environment variables
# ------------------------------------------------------------
load_dotenv()

# ------------------------------------------------------------
# Flask app
# ------------------------------------------------------------
app = Flask(__name__)

# ------------------------------------------------------------
# CORS (configure by env: ALLOWED_ORIGINS)
#   Example on Render:
#   ALLOWED_ORIGINS=https://YOUR_SITE.netlify.app,http://localhost:5173
#   You can also set FRONTEND_ORIGIN to add a single origin.
# ------------------------------------------------------------
def _parse_origins() -> List[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "")
    items = [o.strip() for o in raw.split(",") if o.strip()]

    # sensible local fallbacks for dev
    if not items:
        items = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
        fe = os.getenv("FRONTEND_ORIGIN")
        if fe:
            items.append(fe.strip())

    # de-dupe while preserving order
    seen: Set[str] = set()
    uniq: List[str] = []
    for o in items:
        if o not in seen:
            uniq.append(o)
            seen.add(o)
    return uniq

ALLOWED_ORIGINS: List[str] = _parse_origins()

# Single, correct CORS initialization
CORS(
    app,
    resources={r"/*": {"origins": ALLOWED_ORIGINS}},
    supports_credentials=False,  # set True only if you use cookies
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)

# Mirror CORS headers on normal responses (helps if a proxy strips them)
@app.after_request
def add_cors_headers(resp):
    origin = request.headers.get("Origin")
    if origin and origin in ALLOWED_ORIGINS:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        # flip to "true" only if supports_credentials=True above and you use cookies
        resp.headers["Access-Control-Allow-Credentials"] = "false"
    return resp

# Reply to naked OPTIONS quickly (extra safety; Flask-CORS already handles it)
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        origin = request.headers.get("Origin", "")
        resp = make_response("", 204)
        if origin in ALLOWED_ORIGINS:
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Vary"] = "Origin"
            resp.headers["Access-Control-Allow-Credentials"] = "false"
            resp.headers["Access-Control-Allow-Headers"] = request.headers.get(
                "Access-Control-Request-Headers", "Content-Type, Authorization"
            )
            resp.headers["Access-Control-Allow-Methods"] = request.headers.get(
                "Access-Control-Request-Method", "GET, POST, PUT, DELETE, OPTIONS"
            )
        return resp
    return None

# ------------------------------------------------------------
# App config
# ------------------------------------------------------------
app.config["JWT_SECRET"] = os.getenv("JWT_SECRET", "devsecret_change_me")
app.config["STORAGE_PATH"] = os.getenv("STORAGE_PATH", "./storage")
os.makedirs(app.config["STORAGE_PATH"], exist_ok=True)

# ------------------------------------------------------------
# Database (Atlas-friendly)
#   Works whether DB name is in URI or provided via MONGO_DB.
#   Avoids truthiness checks that crash with PyMongo Database objects.
# ------------------------------------------------------------
mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    # Require MONGO_URI for your deployment; avoids silently using localhost.
    raise RuntimeError(
        "MONGO_URI is not set. Add it to your environment (e.g., Render env vars)."
    )

client = MongoClient(mongo_uri)

# Try to get the default DB from the URI (e.g., ...mongodb.net/quickinsights?...).
default_db: Optional[object] = None
try:
    default_db = client.get_default_database()
except ConfigurationError:
    default_db = None  # URI didn’t include a db name

# If not in URI, use MONGO_DB or fall back to "quickinsights"
env_db_name = os.getenv("MONGO_DB")
if default_db is not None:
    db = default_db
else:
    db = client[env_db_name or "quickinsights"]

# Make available to blueprints
app.db = db                                       # type: ignore[attr-defined]
app.storage_path = app.config["STORAGE_PATH"]     # type: ignore[attr-defined]
app.jwt_secret = app.config["JWT_SECRET"]         # type: ignore[attr-defined]

# ------------------------------------------------------------
# Blueprints
# ------------------------------------------------------------
app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(upload_bp, url_prefix="/upload")
app.register_blueprint(insights_bp, url_prefix="/insights")

# Public mirrors for /api/<workspace_id>/… endpoints defined in insights_bp
app.add_url_rule(
    "/api/<workspace_id>/schema",
    view_func=app.view_functions["insights.api_schema"],
    methods=["GET", "OPTIONS"],
)
app.add_url_rule(
    "/api/<workspace_id>/distinct",
    view_func=app.view_functions["insights.api_distinct"],
    methods=["GET", "OPTIONS"],
)
app.add_url_rule(
    "/api/<workspace_id>/series",
    view_func=app.view_functions["insights.api_series"],
    methods=["POST", "OPTIONS"],
)
app.add_url_rule(
    "/api/<workspace_id>/rows",
    view_func=app.view_functions["insights.api_rows"],
    methods=["POST", "OPTIONS"],
)

# ------------------------------------------------------------
# Health check
# ------------------------------------------------------------
@app.get("/health")
def health():
    return jsonify(status="ok")

# ------------------------------------------------------------
# Entrypoint (Gunicorn will import "app"; this block is only for local dev)
# ------------------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
