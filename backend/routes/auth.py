from flask import Blueprint, request, jsonify, current_app
import bcrypt, jwt, datetime

auth_bp = Blueprint('auth', __name__)

def _token_for(user_id: str):
    return jwt.encode(
        {
            "sub": str(user_id),
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=2),
        },
        current_app.jwt_secret,
        algorithm="HS256",
    )

@auth_bp.post("/register")
def register():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify(error="email and password required"), 400

    if current_app.db.users.find_one({"email": email}):
        return jsonify(error="email already registered"), 409

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    res = current_app.db.users.insert_one({"email": email, "password": hashed})
    return jsonify(token=_token_for(res.inserted_id)), 201

@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = current_app.db.users.find_one({"email": email})
    if not user:
        return jsonify(error="invalid credentials"), 401
    if not bcrypt.checkpw(password.encode(), user["password"].encode()):
        return jsonify(error="invalid credentials"), 401
    return jsonify(token=_token_for(user["_id"]))
