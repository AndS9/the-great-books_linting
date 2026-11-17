from datetime import datetime
from .extensions import db


class Role(db.Model):
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    role_name = db.Column(db.String(50), unique=True, nullable=False)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False)
    house_id = db.Column(db.Integer, db.ForeignKey("houses.id"), nullable=True)

    role = db.relationship("Role", backref="users")
    stats = db.relationship("Stat", backref="user", uselist=False, cascade="all, delete-orphan")


class House(db.Model):
    __tablename__ = "houses"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    lord_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)


class Stat(db.Model):
    __tablename__ = "stats"

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), primary_key=True)
    strength = db.Column(db.Integer, default=10)
    defense = db.Column(db.Integer, default=10)
    endurance = db.Column(db.Integer, default=10)


class Session(db.Model):
    __tablename__ = "sessions"

    id = db.Column(db.String(128), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(15))