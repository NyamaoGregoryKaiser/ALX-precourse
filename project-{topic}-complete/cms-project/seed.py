import os
from datetime import datetime, timedelta
from app import create_app
from app.extensions import db
from app.models import User, Content, Category, Tag

# Create Flask app context
app = create_app()

def seed_data():
    with app.app_context():
        db.create_all() # Ensure tables are created

        print("Seeding database...")

        # --- Users ---
        if not User.query.filter_by(email='admin@example.com').first():
            admin_user = User(username='admin', email='admin@example.com', role='admin')
            admin_user.set_password('adminpass')
            db.session.add(admin_user)
            print("Added admin user.")
        else:
            admin_user = User.query.filter_by(email='admin@example.com').first()
            print("Admin user already exists.")

        if not User.query.filter_by(email='editor@example.com').first():
            editor_user = User(username='editor', email='editor@example.com', role='editor')
            editor_user.set_password('editorpass')
            db.session.add(editor_user)
            print("Added editor user.")
        else:
            editor_user = User.query.filter_by(email='editor@example.com').first()
            print("Editor user already exists.")

        if not User.query.filter_by(email='author@example.com').first():
            author_user = User(username='author', email='author@example.com', role='author')
            author_user.set_password('authorpass')
            db.session.add(author_user)
            print("Added author user.")
        else:
            author_user = User.query.filter_by(email='author@example.com').first()
            print("Author user already exists.")

        db.session.commit() # Commit users first to get their IDs

        # --- Categories ---
        category_tech = Category.query.filter_by(name='Technology').first()
        if not category_tech:
            category_tech = Category(name='Technology', description='Articles about software, hardware, and tech news.')
            db.session.add(category_tech)
            print("Added Technology category.")

        category_lifestyle = Category.query.filter_by(name='Lifestyle').first()
        if not category_lifestyle:
            category_lifestyle = Category(name='Lifestyle', description='Content on health, wellness, and daily living.')
            db.session.add(category_lifestyle)
            print("Added Lifestyle category.")

        db.session.commit() # Commit categories

        # --- Tags ---
        tag_python = Tag.query.filter_by(name='Python').first()
        if not tag_python:
            tag_python = Tag(name='Python')
            db.session.add(tag_python)
            print("Added Python tag.")

        tag_flask = Tag.query.filter_by(name='Flask').first()
        if not tag_flask:
            tag_flask = Tag(name='Flask')
            db.session.add(tag_flask)
            print("Added Flask tag.")

        tag_webdev = Tag.query.filter_by(name='Web Development').first()
        if not tag_webdev:
            tag_webdev = Tag(name='Web Development')
            db.session.add(tag_webdev)
            print("Added Web Development tag.")

        tag_health = Tag.query.filter_by(name='Health').first()
        if not tag_health:
            tag_health = Tag(name='Health')
            db.session.add(tag_health)
            print("Added Health tag.")

        db.session.commit() # Commit tags

        # --- Content ---
        if not Content.query.filter_by(title='Getting Started with Flask').first():
            content1 = Content(
                title='Getting Started with Flask',
                body='Flask is a micro-framework for Python based on Werkzeug, Jinja 2 and good intentions. '
                     'It\'s often used for smaller applications, APIs, and microservices.',
                status='published',
                is_featured=True,
                user_id=author_user.id,
                category=category_tech,
                tags=[tag_python, tag_flask, tag_webdev]
            )
            content1.publish() # Manually set published_at
            db.session.add(content1)
            print("Added 'Getting Started with Flask' content.")

        if not Content.query.filter_by(title='The Benefits of a Healthy Diet').first():
            content2 = Content(
                title='The Benefits of a Healthy Diet',
                body='A balanced diet is essential for good health and well-being. '
                     'It provides your body with the necessary nutrients, vitamins, and minerals.',
                status='published',
                is_featured=False,
                user_id=editor_user.id,
                category=category_lifestyle,
                tags=[tag_health]
            )
            content2.publish()
            db.session.add(content2)
            print("Added 'The Benefits of a Healthy Diet' content.")

        if not Content.query.filter_by(title='Future of AI in Content Creation').first():
            content3 = Content(
                title='Future of AI in Content Creation',
                body='Artificial intelligence is rapidly transforming various industries, '
                     'including content creation. AI tools can assist with generating ideas, '
                     'drafting text, and even translating content.',
                status='draft', # This content is a draft
                is_featured=False,
                user_id=author_user.id,
                category=category_tech,
                tags=[tag_python]
            )
            db.session.add(content3)
            print("Added 'Future of AI in Content Creation' content (draft).")

        db.session.commit()

        print("Database seeding complete!")

if __name__ == '__main__':
    seed_data()
```