from flask import Flask
from .config import Config
from .extensions import db, cors
from .routes import api
from .models import Role, House


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    cors.init_app(app)
    app.register_blueprint(api)

    with app.app_context():
        db.create_all()
        _seed_initial_data()

    return app


def _seed_initial_data():
    if Role.query.count() == 0:
        for name in ["noble", "knight", "commonfolk"]:
            db.session.add(Role(role_name=name))
        db.session.commit()

    if House.query.count() == 0:
        for house_name in ["Stark", "Lannister", "Targaryen", "Baratheon"]:
            db.session.add(House(name=house_name))
        db.session.commit()