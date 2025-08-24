# import os
# from flask import Flask, jsonify
# from flask_cors import CORS
# from dotenv import load_dotenv
# from pymongo import MongoClient
# from routes.upload import upload_bp
# from routes.insights import insights_bp


# # Load .env variables
# load_dotenv()

# app = Flask(__name__)

# # CORS (allow localhost frontend during dev)
# CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

# # Config
# app.config["JWT_SECRET"] = os.getenv("JWT_SECRET", "devsecret")
# app.config["STORAGE_PATH"] = os.getenv("STORAGE_PATH", "./storage")
# os.makedirs(app.config["STORAGE_PATH"], exist_ok=True)

# # Database
# mongo = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
# db = mongo.get_database("bizinsights")

# # Attach to app so blueprints can use them
# app.db = db
# app.storage_path = app.config["STORAGE_PATH"]
# app.jwt_secret = app.config["JWT_SECRET"]

# # --- Blueprints ---
# from routes.auth import auth_bp  # noqa: E402

# app.register_blueprint(auth_bp, url_prefix="/auth")
# app.register_blueprint(upload_bp, url_prefix='/upload')
# app.register_blueprint(insights_bp, url_prefix='/insights')


# # Health check route
# @app.get("/health")
# def health():
#     return jsonify(status="ok")


# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=5001, debug=True)


import os
from typing import Set

from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
from dotenv import load_dotenv
from pymongo import MongoClient

# Blueprints
from routes.upload import upload_bp
from routes.insights import insights_bp
from routes.auth import auth_bp  # keep import here so it's registered below

# Load .env variables
load_dotenv()

app = Flask(__name__)

# --------------------------- CORS ---------------------------
# Allowed dev origins (no wildcard if credentials are enabled)
ALLOWED_ORIGINS: Set[str] = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}

# Flask-CORS will attach headers for us on normal requests.
# We also add a tiny preflight handler below to be extra explicit.
CORS(
    app,
    resources={r"/*": {"origins": list(ALLOWED_ORIGINS)}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "OPTIONS"],
)

# Optional tweak: ensure every OPTIONS (preflight) gets a 204 with the right headers.
@app.before_request
def handle_cors_preflight():
    if request.method == "OPTIONS":
        origin = request.headers.get("Origin", "")
        resp = make_response("", 204)
        if origin in ALLOWED_ORIGINS:
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Vary"] = "Origin"
            resp.headers["Access-Control-Allow-Credentials"] = "true"
            resp.headers["Access-Control-Allow-Headers"] = request.headers.get(
                "Access-Control-Request-Headers", "Content-Type, Authorization"
            )
            resp.headers["Access-Control-Allow-Methods"] = request.headers.get(
                "Access-Control-Request-Method", "GET, POST, OPTIONS"
            )
        return resp
    return None

# Also mirror CORS headers on normal responses (useful if a proxy skips Flask-CORS)
@app.after_request
def add_cors_headers(resp):
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Credentials"] = "true"
    return resp

# -------------------------- Config --------------------------
app.config["JWT_SECRET"] = os.getenv("JWT_SECRET", "devsecret")
app.config["STORAGE_PATH"] = os.getenv("STORAGE_PATH", "./storage")
os.makedirs(app.config["STORAGE_PATH"], exist_ok=True)

# ------------------------- Database -------------------------
mongo = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
db = mongo.get_database("bizinsights")

# Attach to app so blueprints can use them
app.db = db
app.storage_path = app.config["STORAGE_PATH"]
app.jwt_secret = app.config["JWT_SECRET"]

# ------------------------ Blueprints ------------------------
app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(upload_bp, url_prefix="/upload")

# Mount insights under /insights (keeps existing /insights/* routes working)
app.register_blueprint(insights_bp, url_prefix="/insights")

# ---- Public mirrors for the new “/api/<workspace_id>/…” endpoints ----
# These reuse the handlers defined inside routes.insights (api_schema, api_distinct, api_series, api_rows)
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

# ----------------------- Health Check -----------------------
@app.get("/health")
def health():
    return jsonify(status="ok")

# ------------------------- Entrypoint ------------------------
if __name__ == "__main__":
    # Use 0.0.0.0 so the Vite dev server / browser can reach it
    app.run(host="0.0.0.0", port=5001, debug=True)
