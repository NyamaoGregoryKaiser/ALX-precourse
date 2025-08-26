```python
import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import BadRequest
import logging

# Configuration
app = Flask(__name__)
app.config.from_object(os.environ.get('APP_SETTINGS', 'config.DevelopmentConfig'))
db = SQLAlchemy(app)
ma = Marshmallow(app)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


# Models
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    completed = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f'<Task {self.title}>'

# Schemas
class TaskSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Task
        include_fk = True
        load_instance = True


# Routes
@app.route('/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.all()
    return jsonify(TaskSchema(many=True).dump(tasks))


@app.route('/tasks', methods=['POST'])
def create_task():
    try:
        data = request.get_json()
        task = TaskSchema().load(data)
        db.session.add(task)
        db.session.commit()
        return jsonify(TaskSchema().dump(task)), 201
    except BadRequest as e:
        return jsonify({'error': str(e)}), 400
    except IntegrityError as e:
        return jsonify({'error': 'Task with this title already exists'}), 409


@app.route('/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    task = Task.query.get_or_404(task_id)
    return jsonify(TaskSchema().dump(task))


@app.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    try:
        data = request.get_json()
        updated_task = TaskSchema().load(data, instance=task)
        db.session.commit()
        return jsonify(TaskSchema().dump(updated_task))
    except BadRequest as e:
        return jsonify({'error': str(e)}), 400


@app.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted'}), 204


if __name__ == '__main__':
    app.run(debug=True)
```