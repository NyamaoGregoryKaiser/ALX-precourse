import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from flask_httpauth import HTTPBasicAuth


load_dotenv()
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
migrate = Migrate(app, db)
auth = HTTPBasicAuth()

# User model (Simplified for brevity)
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)

# Task Model
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(120), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    user = db.relationship('User', backref=db.backref('tasks', lazy=True))


# Database setup
@app.before_first_request
def create_tables():
    db.create_all()

# Authentication
users = {
    "admin": generate_password_hash("admin")
}

@auth.verify_password
def verify_password(username, password):
    if username in users and check_password_hash(users.get(username), password):
        return username
    return None

#API endpoints (simplified for brevity)

@app.route('/tasks', methods=['GET', 'POST'])
@auth.login_required
def tasks():
    if request.method == 'POST':
        data = request.get_json()
        new_task = Task(description=data['description'], user_id=1) # Assuming user 1 is logged in
        db.session.add(new_task)
        db.session.commit()
        return jsonify({'message': 'Task created'}), 201
    tasks = Task.query.all()
    return jsonify([{'id': task.id, 'description': task.description, 'completed': task.completed} for task in tasks])


@app.route('/tasks/<int:task_id>', methods=['GET', 'PUT', 'DELETE'])
@auth.login_required
def task(task_id):
    task = Task.query.get_or_404(task_id)
    if request.method == 'GET':
        return jsonify({'id': task.id, 'description': task.description, 'completed': task.completed})
    elif request.method == 'PUT':
        data = request.get_json()
        task.description = data['description']
        task.completed = data.get('completed', task.completed)
        db.session.commit()
        return jsonify({'message': 'Task updated'})
    elif request.method == 'DELETE':
        db.session.delete(task)
        db.session.commit()
        return jsonify({'message': 'Task deleted'}), 204

if __name__ == '__main__':
    app.run(debug=True)