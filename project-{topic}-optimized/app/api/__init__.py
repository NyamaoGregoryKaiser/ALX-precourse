from flask import Blueprint, jsonify

bp = Blueprint('api', __name__)

# Import API routes to register them with the blueprint
from . import auth, scrapers, jobs, results

@bp.route('/')
def index():
    return jsonify({"message": "Welcome to the Web Scraping API!"}), 200
```