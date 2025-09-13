import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import exc
from werkzeug.security import generate_password_hash, check_password_hash
import logging

app = Flask(__name__)
app.config.from_object(os.environ['APP_SETTINGS'])
db = SQLAlchemy(app)

# Simplified models (expand significantly for production)
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), default='pending') # pending, processed, failed


#Example API endpoints (highly simplified)

@app.route('/users', methods=['POST'])
def create_user():
    try:
      data = request.get_json()
      new_user = User(username=data['username'])
      new_user.set_password(data['password'])
      db.session.add(new_user)
      db.session.commit()
      return jsonify({'message': 'User created'}), 201
    except exc.IntegrityError:
      db.session.rollback()
      return jsonify({'error': 'Username already exists'}), 400
    except KeyError as e:
      return jsonify({'error': f'Missing key: {e}'}), 400


@app.route('/payments', methods=['POST'])
def create_payment():
    # Requires authentication and robust validation in a real system.
    data = request.get_json()
    new_payment = Payment(user_id=1, amount=data['amount']) # Replace 1 with authenticated user ID
    db.session.add(new_payment)
    db.session.commit()
    return jsonify({'message': 'Payment created'}), 201


if __name__ == '__main__':
    db.create_all() #Add more error handling, logging and more secure implementation
    app.run(debug=True, host='0.0.0.0')