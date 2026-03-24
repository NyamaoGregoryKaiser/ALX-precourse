import pytest
from app.models import User, Content, Category, Tag
from app.extensions import db
from app.schemas import UserSchema, ContentSchema, CategorySchema, TagSchema
from datetime import datetime

# Initialize schemas for direct interaction
user_schema = UserSchema()
content_schema = ContentSchema()
category_schema = CategorySchema()
tag_schema = TagSchema()

def test_user_creation_and_retrieval(flask_app, init_database):
    with flask_app.app_context():
        # Create a user
        new_user_data = {
            'username': 'testuser1',
            'email': 'test1@example.com',
            'password': 'strongpassword',
            'role': 'author'
        }
        new_user = user_schema.load(new_user_data)
        new_user.set_password(new_user_data['password'])
        db.session.add(new_user)
        db.session.commit()

        # Retrieve the user
        retrieved_user = User.query.filter_by(email='test1@example.com').first()
        assert retrieved_user is not None
        assert retrieved_user.username == 'testuser1'
        assert retrieved_user.email == 'test1@example.com'
        assert retrieved_user.check_password('strongpassword')
        assert retrieved_user.role == 'author'

def test_content_lifecycle_with_relationships(flask_app, init_database, sample_users, sample_categories, sample_tags):
    with flask_app.app_context():
        author = sample_users['author']
        tech_cat = sample_categories['tech']
        python_tag = sample_tags['python']
        flask_tag = sample_tags['flask']

        # 1. Create content
        content_data = {
            'title': 'Integrate Flask and SQLAlchemy',
            'body': 'Detailed steps to set up Flask with SQLAlchemy and manage models.',
            'user_id': author.id,
            'category_id': tech_cat.id,
            'tag_ids': [python_tag.id, flask_tag.id],
            'status': 'draft',
            'is_featured': False
        }
        new_content = content_schema.load(content_data)
        db.session.add(new_content)
        db.session.commit()

        assert new_content.id is not None
        assert new_content.slug == 'integrate-flask-and-sqlalchemy'
        assert new_content.author.id == author.id
        assert new_content.category.id == tech_cat.id
        assert len(new_content.tags) == 2
        assert new_content.status == 'draft'

        # 2. Retrieve content with relationships (query optimization example)
        retrieved_content = Content.query.options(
            db.joinedload(Content.author),
            db.joinedload(Content.category),
            db.joinedload(Content.tags)
        ).get(new_content.id)

        assert retrieved_content is not None
        assert retrieved_content.author.username == author.username
        assert retrieved_content.category.name == tech_cat.name
        assert retrieved_content.tags[0].name in ['Python', 'Flask']
        assert retrieved_content.tags[1].name in ['Python', 'Flask']

        # 3. Update content
        update_data = {
            'title': 'Advanced Flask and SQLAlchemy Integration',
            'status': 'published',
            'is_featured': True,
            'category_id': None, # Remove category
            'tag_ids': [python_tag.id] # Remove flask_tag
        }
        updated_content = content_schema.load(update_data, instance=retrieved_content, partial=True)
        updated_content.publish() # Manually call publish method to set published_at
        db.session.commit()

        assert updated_content.title == 'Advanced Flask and SQLAlchemy Integration'
        assert updated_content.slug == 'advanced-flask-and-sqlalchemy-integration' # Slug should update
        assert updated_content.status == 'published'
        assert updated_content.is_featured is True
        assert updated_content.category is None # Category removed
        assert len(updated_content.tags) == 1
        assert updated_content.tags[0].name == 'Python'
        assert updated_content.published_at is not None

        # 4. Delete content
        db.session.delete(updated_content)
        db.session.commit()
        assert Content.query.get(new_content.id) is None
        assert Tag.query.get(python_tag.id) is not None # Tags should not be deleted

def test_category_content_relationship_deletion(flask_app, init_database, sample_users, sample_categories):
    with flask_app.app_context():
        author = sample_users['author']
        tech_cat = sample_categories['tech']
        
        content = Content(
            title='Test Content for Category',
            body='Some body',
            user_id=author.id,
            category_id=tech_cat.id,
            status='draft'
        )
        db.session.add(content)
        db.session.commit()

        assert tech_cat.contents.count() == 1

        # Attempt to delete category without removing content (should fail if integrity constraint, or simply disallow)
        # Our API/admin logic will prevent this, but direct ORM delete would set FK to NULL or cascade
        # By default, SQLAlchemy ForeignKeys are ON DELETE NO ACTION unless specified.
        # So deleting category with content still linked will raise an error.
        with pytest.raises(Exception): # Will be IntegrityError in actual PostgreSQL
            db.session.delete(tech_cat)
            db.session.commit()

        db.session.rollback() # Rollback the failed delete

        # Disassociate content from category
        content.category_id = None
        db.session.commit()

        assert tech_cat.contents.count() == 0

        # Now category can be deleted
        db.session.delete(tech_cat)
        db.session.commit()
        assert Category.query.get(tech_cat.id) is None

def test_user_content_relationship_deletion(flask_app, init_database, sample_users):
    with flask_app.app_context():
        author = sample_users['author']
        
        content1 = Content(title='User Content 1', body='Body', user_id=author.id, status='draft')
        content2 = Content(title='User Content 2', body='Body', user_id=author.id, status='draft')
        db.session.add_all([content1, content2])
        db.session.commit()

        assert author.contents.count() == 2

        # Delete user - associated content foreign key will be affected.
        # By default, SQLAlchemy sets `nullable=False` on `user_id` in Content, so deleting user will raise error.
        # This is good: prevents orphaned content. Admin must reassign or delete content first.
        with pytest.raises(Exception): # Will be IntegrityError in actual PostgreSQL
            db.session.delete(author)
            db.session.commit()

        db.session.rollback() # Rollback the failed delete

        # Reassign content to another user or delete it first
        editor = sample_users['editor']
        content1.user_id = editor.id
        content2.user_id = editor.id
        db.session.commit()

        assert author.contents.count() == 0
        assert editor.contents.count() == 2

        # Now author can be deleted
        db.session.delete(author)
        db.session.commit()
        assert User.query.get(author.id) is None
```