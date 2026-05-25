from app.extensions import db
from app.models import User # Import models so Flask-Migrate can detect them

# This file primarily serves to hold the db and migrate instances,
# and ensure models are imported for migrations.
# Actual migration commands are run via Flask-Migrate CLI.

# Example of how you'd interact with the DB in a service:
# from app.models import User
# def create_user(username, email, password):
#     new_user = User(username=username, email=email, password=password)
#     db.session.add(new_user)
#     db.session.commit()
#     return new_user