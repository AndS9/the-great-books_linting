import os
import base64
import secrets
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, jsonify, render_template, redirect, url_for, make_response
from werkzeug.security import generate_password_hash, check_password_hash
from .extensions import db
from .models import User, Role, House, Stat, Session

web_ui = Blueprint("web_ui", __name__, url_prefix="/")

@web_ui.before_request
def require_auth():
    if request.path in ("/login", "/lord-setup", "/knight-setup") or request.path.startswith("/static"):
        return None
    token = request.cookies.get("token")
    if not token:
        return redirect(url_for("web_ui.login"))
    session_obj = Session.query.filter_by(id=token).first()
    if not session_obj or session_obj.expires_at <= datetime.utcnow():
        return redirect(url_for("web_ui.login"))

@web_ui.route("/")
@web_ui.route("/houses")
def index():
    return render_template("index.html")

@web_ui.route("/knights")
def knights():
    return render_template("knights.html")

@web_ui.route("/lords")
def lords():
    return render_template("lords.html")

@web_ui.route("/login")
def login():
    return render_template("login.html")

@web_ui.route("/profile")
def profile():
    return render_template("profile.html")

@web_ui.route("/lord-setup")
def lord_setup():
    return render_template("lord_setup.html")

@web_ui.route("/knight-setup")
def knight_setup():
    return render_template("knight_setup.html")

api = Blueprint("api", __name__, url_prefix="/api")

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get("token", "")
        if not token:
            return jsonify({"error": "Missing session token"}), 401

        session_obj = Session.query.filter_by(id=token).first()
        if not session_obj or session_obj.expires_at <= datetime.utcnow():
            return jsonify({"error": "Invalid or expired session"}), 401

        current_user = User.query.get(session_obj.user_id)
        if not current_user:
            return jsonify({"error": "User not found"}), 404

        return f(current_user, *args, **kwargs)
    return decorated


@api.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "service": "the-great-books-web"}), 200


@api.route("/roles", methods=["GET"])
def get_roles():
    roles = Role.query.all()
    return jsonify([{"id": r.id, "role_name": r.role_name} for r in roles]), 200


@api.route("/houses", methods=["GET"])
def get_houses():
    houses = House.query.all()
    result = []
    for h in houses:
        lord = User.query.get(h.lord_id) if h.lord_id else None
        result.append({
            "id": h.id,
            "name": h.name,
            "motto": h.motto,
            "lord_id": h.lord_id,
            "lord_name": lord.username if lord else None,
        })
    return jsonify(result), 200


@api.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    role_id = data.get("role_id")

    if not username or not password or not role_id:
        return jsonify({"error": "username, password and role_id are required"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already taken"}), 409

    role = Role.query.get(role_id)
    if not role:
        return jsonify({"error": "Invalid role_id"}), 400

    user = User(
        username=username,
        password=generate_password_hash(password),
        role_id=role.id,
        house_id=None,
        is_white_knight=False,
    )
    db.session.add(user)
    db.session.flush()

    if role.role_name.lower() == "knight":
        stat = Stat(user_id=user.id, strength=10, defense=10, endurance=10)
        db.session.add(stat)

    token = secrets.token_hex(32)
    new_session = Session(
        id=token,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=1),
        ip_address=(request.remote_addr or "")[:15],
    )
    db.session.add(new_session)
    db.session.commit()

    response = make_response(jsonify({
        "message": "Registered successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": role.role_name,
            "house_id": user.house_id,
        }
    }), 201)
    response.set_cookie(
        "token", token,
        httponly=True,
        path="/",
        samesite="Lax",
        max_age=86400
    )
    return response


@api.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = secrets.token_hex(32)
    new_session = Session(
        id=token,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=1),
        ip_address=(request.remote_addr or "")[:15],
    )
    db.session.add(new_session)
    db.session.commit()

    response = make_response(jsonify({
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role.role_name,
            "house_id": user.house_id,
        }
    }), 200)
    response.set_cookie(
        "token", token,
        httponly=True,
        path="/",
        samesite="Lax",
        max_age=86400
    )
    return response


@api.route("/auth/logout", methods=["POST"])
@login_required
def logout(current_user):
    token = request.cookies.get("token", "")
    session = Session.query.filter_by(id=token).first()
    if session:
        session.expires_at = datetime.utcnow()
        db.session.commit()
    response = make_response(jsonify({"message": "Logged out"}), 200)
    response.set_cookie("token", "", max_age=0, path="/", httponly=True, samesite="Lax")
    return response


@api.route("/me", methods=["GET"])
@login_required
def get_me(current_user):
    role_name = current_user.role.role_name.lower() if current_user.role else ""
    is_knight = role_name == "knight"
    
    return jsonify({
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role.role_name,
        "house_id": current_user.house_id,
        "photo_url": current_user.photo_url,
        "is_white_knight": current_user.is_white_knight,
        "stats": {
            "strength": current_user.stats.strength if current_user.stats else 0,
            "defense": current_user.stats.defense if current_user.stats else 0,
            "endurance": current_user.stats.endurance if current_user.stats else 0,
        },
        "gossip_key": current_user.stats.key if (is_knight and current_user.stats) else None,
        "next_key": current_user.stats.next_key.isoformat() if (is_knight and current_user.stats and current_user.stats.next_key) else None,
        "gossip_target_id": current_user.stats.gossip_target_id if (is_knight and current_user.stats) else None,
    }), 200


@api.route("/me/gossip-key", methods=["POST"])
@login_required
def update_gossip_key(current_user):
    role_name = current_user.role.role_name.lower() if current_user.role else ""
    if role_name != "knight":
        return jsonify({"error": "Only knights can generate a gossip key."}), 403
    
    stat = current_user.stats
    if not stat:
        stat = Stat(user_id=current_user.id)
        db.session.add(stat)
    
    now = datetime.utcnow()
    if stat.next_key and now < stat.next_key:
        remaining = stat.next_key - now
        hours, remainder = divmod(int(remaining.total_seconds()), 3600)
        minutes = remainder // 60
        return jsonify({
            "error": f"Key cannot be updated yet. Try again in {hours}h {minutes}m.",
            "next_key": stat.next_key.isoformat()
        }), 429
    
    stat.key = secrets.token_hex(8)
    stat.next_key = now + timedelta(days=1)
    stat.gossip_target_id = None
    db.session.commit()
    
    return jsonify({
        "message": "Gossip key updated",
        "gossip_key": stat.key,
        "next_key": stat.next_key.isoformat()
    }), 200


@api.route("/houses/<int:house_id>/members", methods=["GET"])
@login_required
def get_house_members(current_user, house_id):
    if current_user.house_id != house_id:
        return jsonify({"error": "Access denied. You can only view members of your own house."}), 403

    members = User.query.filter_by(house_id=house_id).all()
    result = []
    for m in members:
        result.append({
            "id": m.id,
            "username": m.username,
            "role": m.role.role_name,
            "stats": {
                "strength": m.stats.strength if m.stats else 0,
                "defense": m.stats.defense if m.stats else 0,
                "endurance": m.stats.endurance if m.stats else 0,
            }
        })
    return jsonify(result), 200


@api.route("/houses/<int:house_id>", methods=["PUT", "PATCH"])
@login_required
def update_house(current_user, house_id):
    house = House.query.get(house_id)
    if not house:
        return jsonify({"error": "House not found"}), 404

    user_role = current_user.role.role_name.lower() if current_user.role else ""
    is_house_lord = user_role == "noble" or house.lord_id == current_user.id

    if current_user.house_id != house_id or not is_house_lord:
        return jsonify({"error": "Access denied. Only lords of this house can edit its info."}), 403

    data = request.get_json() or {}

    if "name" in data:
        new_name = str(data["name"]).strip()
        if not new_name:
            return jsonify({"error": "House name cannot be empty"}), 400
        if len(new_name) > 50:
            return jsonify({"error": "House name must be 50 characters or fewer"}), 400
        existing = House.query.filter(House.name == new_name, House.id != house_id).first()
        if existing:
            return jsonify({"error": "A house with this name already exists"}), 409
        house.name = new_name

    if "motto" in data:
        new_motto = str(data["motto"]).strip()
        if len(new_motto) > 100:
            return jsonify({"error": "Motto must be 100 characters or fewer"}), 400
        house.motto = new_motto if new_motto else None

    db.session.commit()

    return jsonify({
        "message": "House info updated successfully",
        "house": {
            "id": house.id,
            "name": house.name,
            "motto": house.motto,
            "lord_id": house.lord_id,
        }
    }), 200


@api.route("/knights", methods=["GET"])
@login_required
def get_knights(current_user):
    knight_role = Role.query.filter(db.func.lower(Role.role_name) == "knight").first()
    if not knight_role:
        return jsonify([]), 200
    
    knights = User.query.filter_by(role_id=knight_role.id).all()
    viewer_role = current_user.role.role_name.lower() if current_user.role else ""
    revealed_target_id = current_user.stats.gossip_target_id if current_user.stats else None
    
    result = []
    for k in knights:
        is_same_house = (current_user.house_id is not None and current_user.house_id == k.house_id)
        is_revealed = (viewer_role == "knight" and revealed_target_id == k.id)
        can_see_stats = k.is_white_knight or (k.id == current_user.id) or is_revealed or is_same_house
        
        result.append({
            "id": k.id,
            "username": k.username,
            "role": k.role.role_name,
            "house_id": k.house_id,
            "photo_url": k.photo_url,
            "is_white_knight": k.is_white_knight,
            "stats": {
                "strength": k.stats.strength,
                "defense": k.stats.defense,
                "endurance": k.stats.endurance,
            } if (can_see_stats and k.stats) else None
        })
        
    return jsonify(result), 200


@api.route("/lords", methods=["GET"])
@login_required
def get_lords(current_user):
    noble_role = Role.query.filter(db.func.lower(Role.role_name) == "noble").first()
    if not noble_role:
        return jsonify([]), 200

    lords = User.query.filter_by(role_id=noble_role.id).all()
    return jsonify([
        {
            "id": l.id,
            "username": l.username,
            "role": l.role.role_name,
            "house_id": l.house_id,
            "photo_url": l.photo_url,
            "stats": None
        }
        for l in lords
    ]), 200


@api.route("/gossip", methods=["POST"])
@login_required
def use_gossip(current_user):
    viewer_role = current_user.role.role_name.lower() if current_user.role else ""
    if viewer_role != "knight":
        return jsonify({"error": "Only knights can use gossip."}), 403

    data = request.get_json() or {}
    provided_key = str(data.get("key", "")).strip()
    target_id = data.get("target_id")

    if not provided_key or not target_id:
        return jsonify({"error": "Both gossip key and target_id are required."}), 400

    stat = current_user.stats
    if not stat or not stat.key:
        return jsonify({"error": "You do not have an active gossip key. Generate one in your Profile first."}), 400

    if stat.next_key and datetime.utcnow() >= stat.next_key:
        return jsonify({"error": "Your gossip key has expired. Update it in your Profile."}), 400

    if not secrets.compare_digest(stat.key, provided_key):
        return jsonify({"error": "Invalid gossip key."}), 403

    if stat.gossip_target_id is not None:
        return jsonify({"error": "You have already used your gossip key for today."}), 429

    target = User.query.get(target_id)
    if not target or not target.role or target.role.role_name.lower() != "knight":
        return jsonify({"error": "Target knight not found."}), 404

    if current_user.house_id is not None and target.house_id == current_user.house_id:
        return jsonify({"error": "You already know the stats of knights from your own house."}), 400

    stat.gossip_target_id = target.id
    db.session.commit()

    return jsonify({
        "message": f"Combat stats revealed for {target.username}.",
        "target_id": target.id,
        "stats": {
            "strength": target.stats.strength if target.stats else 0,
            "defense": target.stats.defense if target.stats else 0,
            "endurance": target.stats.endurance if target.stats else 0,
        }
    }), 200


def save_uploaded_photo(photo, user_id):
    if not photo or not photo.filename:
        return None
    ext = photo.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("png", "jpg", "jpeg", "webp"):
        return None
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
    raw_bytes = photo.read()
    if not raw_bytes:
        return None
    encoded = base64.b64encode(raw_bytes).decode("ascii")
    return f"data:{mime};base64,{encoded}"


@api.route("/lords/setup", methods=["POST"])
@login_required
def setup_lord(current_user):
    if current_user.role.role_name.lower() != "noble":
        return jsonify({"error": "Only lords can access this"}), 403

    house_raw = (request.form.get("house_id") or "").strip()
    photo = request.files.get("photo")

    if not house_raw:
        return jsonify({"error": "House is required"}), 400

    house = House.query.get(int(house_raw))
    if not house:
        return jsonify({"error": "House not found"}), 404

    photo_url = save_uploaded_photo(photo, current_user.id)
    if not photo_url:
        return jsonify({"error": "Valid photo (png, jpg, webp) is required"}), 400

    current_user.photo_url = photo_url
    current_user.house_id = house.id
    if not house.lord_id:
        house.lord_id = current_user.id

    db.session.commit()
    return jsonify({"message": "Lord profile saved"}), 200


@api.route("/knights/setup", methods=["POST"])
@login_required
def setup_knight(current_user):
    if current_user.role.role_name.lower() != "knight":
        return jsonify({"error": "Only knights can access this"}), 403

    is_white_knight = request.form.get("is_white_knight") == "true"
    house_raw = (request.form.get("house_id") or "").strip()
    photo = request.files.get("photo")

    try:
        strength = int(request.form.get("strength", 10))
        defense = int(request.form.get("defense", 10))
        endurance = int(request.form.get("endurance", 10))
    except ValueError:
        return jsonify({"error": "Stats must be numbers"}), 400

    photo_url = save_uploaded_photo(photo, current_user.id)
    if not photo_url:
        return jsonify({"error": "Valid photo (png, jpg, webp) is required"}), 400

    current_user.photo_url = photo_url
    current_user.is_white_knight = is_white_knight

    if is_white_knight:
        current_user.house_id = None
    elif house_raw:
        house = House.query.get(int(house_raw))
        if not house:
            return jsonify({"error": "House not found"}), 404
        current_user.house_id = house.id
    else:
        return jsonify({"error": "Great House is required for sworn knights"}), 400

    if not current_user.stats:
        current_user.stats = Stat(user_id=current_user.id)

    current_user.stats.strength = strength
    current_user.stats.defense = defense
    current_user.stats.endurance = endurance

    db.session.commit()
    return jsonify({"message": "Knight profile saved"}), 200