```python
from faker import Faker
import random
import datetime
from sqlalchemy.exc import IntegrityError
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.post import Post, PostStatus
from app.models.media import Media, MediaType
from app.extensions import db

fake = Faker()

def seed_data(app, num_users=10, num_categories=5, num_posts_per_user=5, num_media_per_user=3):
    """
    Seeds the database with sample data.
    """
    with app.app_context():
        app.logger.info("Starting database seeding...")

        # Ensure all tables exist
        db.create_all()

        # 1. Create Media Types
        media_types_data = [
            {'name': 'image', 'description': 'Image files (JPEG, PNG, GIF)'},
            {'name': 'video', 'description': 'Video files (MP4, AVI, MOV)'},
            {'name': 'document', 'description': 'Document files (PDF, DOCX)'},
        ]
        media_types = {}
        for mt_data in media_types_data:
            media_type = MediaType.query.filter_by(name=mt_data['name']).first()
            if not media_type:
                media_type = MediaType(**mt_data)
                db.session.add(media_type)
                app.logger.info(f"Created Media Type: {media_type.name}")
            media_types[media_type.name] = media_type
        db.session.commit()

        # 2. Create Admin User
        admin_user = User.query.filter_by(username='admin').first()
        if not admin_user:
            admin_user = User(
                username='admin',
                email='admin@example.com',
                password='adminpassword', # Use a strong password in production
                role=UserRole.ADMIN
            )
            db.session.add(admin_user)
            db.session.commit()
            app.logger.info("Created Admin User: admin@example.com")
        else:
            app.logger.info("Admin user already exists.")

        # 3. Create Editor User
        editor_user = User.query.filter_by(username='editor').first()
        if not editor_user:
            editor_user = User(
                username='editor',
                email='editor@example.com',
                password='editorpassword',
                role=UserRole.EDITOR
            )
            db.session.add(editor_user)
            db.session.commit()
            app.logger.info("Created Editor User: editor@example.com")
        else:
            app.logger.info("Editor user already exists.")

        # 4. Create other Users
        users = [admin_user, editor_user]
        for _ in range(num_users - len(users)):
            while True:
                username = fake.user_name()
                email = fake.unique.email()
                if not User.query.filter_by(username=username).first() and \
                   not User.query.filter_by(email=email).first():
                    break
            user = User(
                username=username,
                email=email,
                password='password123',
                role=random.choice([UserRole.USER, UserRole.EDITOR]) # Mix of user and editor roles
            )
            users.append(user)
            db.session.add(user)
        try:
            db.session.commit()
            app.logger.info(f"Created {len(users) - 2} additional users.")
        except IntegrityError:
            db.session.rollback()
            app.logger.warning("Could not create some users due to integrity error (e.g., duplicate username/email).")
        
        # Ensure 'users' list contains committed objects
        users = User.query.all()


        # 5. Create Categories
        categories = []
        for _ in range(num_categories):
            while True:
                name = fake.unique.word().capitalize() + " Category"
                slug = name.replace(" ", "-").lower()
                if not Category.query.filter_by(slug=slug).first():
                    break
            category = Category(
                name=name,
                slug=slug,
                description=fake.sentence()
            )
            categories.append(category)
            db.session.add(category)
        try:
            db.session.commit()
            app.logger.info(f"Created {len(categories)} categories.")
        except IntegrityError:
            db.session.rollback()
            app.logger.warning("Could not create some categories due to integrity error (e.g., duplicate slug).")
        
        # Ensure 'categories' list contains committed objects
        categories = Category.query.all()

        # 6. Create Media Items for each user
        media_items = []
        for user in users:
            for _ in range(num_media_per_user):
                filename = fake.file_name(category='image')
                filepath = f"/uploads/{user.username}/{filename}"
                media_type = random.choice(list(media_types.values()))
                media = Media(
                    filename=filename,
                    filepath=filepath,
                    uploader_id=user.id,
                    media_type_id=media_type.id,
                    alt_text=fake.sentence(),
                    caption=fake.text(max_nb_chars=100),
                    filesize=random.randint(10000, 5000000), # 10KB to 5MB
                    width=random.choice([800, 1024, 1280]),
                    height=random.choice([600, 768, 960])
                )
                media_items.append(media)
                db.session.add(media)
        try:
            db.session.commit()
            app.logger.info(f"Created {len(media_items)} media items.")
        except IntegrityError:
            db.session.rollback()
            app.logger.warning("Could not create some media items due to integrity error.")
        
        media_items = Media.query.all() # Refresh media items after commit

        # 7. Create Posts for each user
        posts = []
        for user in users:
            if user.role == UserRole.USER: # Only editors and admins can create posts
                continue

            user_media = [m for m in media_items if m.uploader_id == user.id] or media_items[:5] # Fallback to some media
            
            for _ in range(num_posts_per_user):
                title = fake.sentence(nb_words=6)
                slug = title.lower().replace(" ", "-").strip(".").replace(",", "") + "-" + fake.slug()
                content = fake.paragraphs(nb=random.randint(3, 10), ext_word_list=None)
                content = "\n\n".join(content)
                summary = fake.text(max_nb_chars=200)
                status = random.choice([PostStatus.DRAFT, PostStatus.PUBLISHED, PostStatus.ARCHIVED])
                
                # Assign a random category if available
                category = random.choice(categories) if categories else None
                category_id = category.id if category else None

                # Assign a random featured image
                featured_image_url = random.choice(user_media).filepath if user_media else None

                post = Post(
                    title=title,
                    slug=slug,
                    content=content,
                    summary=summary,
                    author_id=user.id,
                    category_id=category_id,
                    status=status,
                    featured_image_url=featured_image_url
                )
                if status == PostStatus.PUBLISHED:
                    post.published_at = fake.date_time_between(start_date="-1y", end_date="now")

                # Attach some random media assets
                if user_media and random.random() > 0.3: # Attach media to 70% of posts
                    num_assets = random.randint(1, min(3, len(user_media)))
                    selected_assets = random.sample(user_media, num_assets)
                    for asset in selected_assets:
                        post.media_assets.append(asset)
                
                posts.append(post)
                db.session.add(post)
        try:
            db.session.commit()
            app.logger.info(f"Created {len(posts)} posts.")
        except IntegrityError as e:
            db.session.rollback()
            app.logger.error(f"Could not create some posts due to integrity error: {e}")

        app.logger.info("Database seeding completed.")

if __name__ == '__main__':
    # This block allows you to run seed_db.py directly for quick testing
    # Make sure your .env is configured or DATABASE_URL is set.
    from app import create_app
    app = create_app()
    seed_data(app)
```