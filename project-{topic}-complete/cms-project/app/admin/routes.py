from flask import render_template, redirect, url_for, flash, request, current_app
from flask_login import login_user, logout_user, login_required, current_user
from flask_principal import Identity, AnonymousIdentity, identity_changed, identity_loaded, RoleNeed, UserNeed
from flask import session # Using Flask session for simplicity in admin UI, JWT for API
from flask_jwt_extended import create_access_token # For admin to get API token if needed
from app.admin import bp
from app.extensions import db, bcrypt, principals, admin_permission, editor_permission, author_permission
from app.models import User, Content, Category, Tag
from app.schemas import UserSchema, ContentSchema, CategorySchema, TagSchema
from app.utils import slugify_content_title # Example for a utility


# Flask-Principal integration for role-based access in admin panel
@identity_loaded.connect_via(current_app._get_current_object())
def on_identity_loaded(sender, identity):
    # Set the identity user object
    identity.user = current_user

    # Add the UserNeed to the identity
    if hasattr(current_user, 'id'):
        identity.provides.add(UserNeed(current_user.id))

    # Add the RoleNeed to the identity
    if hasattr(current_user, 'role'):
        identity.provides.add(RoleNeed(current_user.role))

# Basic login for admin panel (using session)
@bp.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('admin.dashboard'))

    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):
            # Store user ID in session
            session['user_id'] = user.id
            session['user_role'] = user.role # Store role for principals
            flash(f'Logged in as {user.username}', 'success')

            # Tell Flask-Principal the identity changed
            identity_changed.send(current_app._get_current_object(), identity=Identity(user.id))

            current_app.logger.info(f"Admin login successful for user: {user.username}")
            return redirect(url_for('admin.dashboard'))
        else:
            flash('Invalid email or password', 'danger')
            current_app.logger.warning(f"Admin login failed for email: {email}")
    return render_template('admin/login.html', title='Admin Login')

@bp.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('user_role', None)
    flash('You have been logged out.', 'info')
    # Tell Flask-Principal the identity has changed to anonymous
    identity_changed.send(current_app._get_current_object(), identity=AnonymousIdentity())
    current_app.logger.info("Admin user logged out.")
    return redirect(url_for('admin.login'))

@bp.before_request
def require_login():
    # Simple check for session-based login for admin panel
    if request.endpoint and 'admin.' in request.endpoint and request.endpoint != 'admin.login':
        if 'user_id' not in session:
            flash('Please log in to access the admin panel.', 'warning')
            return redirect(url_for('admin.login'))
        # Re-establish identity for Flask-Principal on each request if needed
        if 'user_id' in session and 'user_role' in session:
            if principals.identity.id != session['user_id']: # Check if identity needs to be refreshed
                identity_changed.send(current_app._get_current_object(),
                                      identity=Identity(session['user_id'], roles=[session['user_role']]))

# Helper to get current admin user for templates
@bp.context_processor
def inject_admin_user():
    user = None
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
    return dict(current_admin_user=user)

@bp.route('/')
def dashboard():
    admin_permission.require(http_exception=403) # Only admins can view the dashboard
    current_app.logger.info(f"Admin dashboard accessed by user {session.get('user_id')}")
    # Example data for dashboard
    total_users = User.query.count()
    total_content = Content.query.count()
    published_content = Content.query.filter_by(status='published').count()
    total_categories = Category.query.count()
    total_tags = Tag.query.count()

    # Get a JWT for the currently logged-in admin user to interact with the API
    user = User.query.get(session['user_id'])
    if user:
        admin_jwt_token = create_access_token(identity=user.id, additional_claims={"role": user.role})
    else:
        admin_jwt_token = None

    return render_template('admin/index.html',
                           title='Admin Dashboard',
                           total_users=total_users,
                           total_content=total_content,
                           published_content=published_content,
                           total_categories=total_categories,
                           total_tags=total_tags,
                           admin_jwt_token=admin_jwt_token)

@bp.route('/content')
def content_list():
    editor_permission.require(http_exception=403) # Editors and Admins can manage content
    current_app.logger.info(f"Content list accessed by user {session.get('user_id')}")
    contents = Content.query.options(joinedload(Content.author), joinedload(Content.category)).order_by(Content.created_at.desc()).all()
    return render_template('admin/content_list.html', title='Manage Content', contents=contents)

@bp.route('/content/new', methods=['GET', 'POST'])
def create_content():
    author_permission.require(http_exception=403) # Authors can create
    if request.method == 'POST':
        try:
            current_user_id = session.get('user_id')
            current_user_role = session.get('user_role')

            data = {
                'title': request.form['title'],
                'body': request.form['body'],
                'user_id': current_user_id, # Author is current logged-in user
                'is_featured': 'is_featured' in request.form,
                'category_id': int(request.form['category_id']) if request.form['category_id'] else None,
                'tag_ids': [int(t) for t in request.form.getlist('tags')] # From multiple select
            }

            status = request.form['status']
            if status == 'published' and current_user_role == 'author':
                flash('Authors cannot directly publish content. It has been set to draft.', 'warning')
                data['status'] = 'draft'
            else:
                data['status'] = status

            new_content = Content(
                title=data['title'],
                body=data['body'],
                status=data['status'],
                is_featured=data['is_featured'],
                user_id=data['user_id']
            )

            # Assign category
            if data['category_id']:
                category = Category.query.get(data['category_id'])
                if category:
                    new_content.category = category
                else:
                    flash('Selected category not found.', 'danger')

            # Assign tags
            if data['tag_ids']:
                tags = Tag.query.filter(Tag.id.in_(data['tag_ids'])).all()
                if len(tags) == len(data['tag_ids']):
                    new_content.tags = tags
                else:
                    flash('One or more selected tags not found.', 'danger')

            # Handle slug uniqueness
            base_slug = slugify_content_title(new_content.title)
            new_content.slug = base_slug
            counter = 1
            while Content.query.filter(Content.slug == new_content.slug).first():
                new_content.slug = f"{base_slug}-{counter}"
                counter += 1

            if new_content.status == 'published':
                new_content.publish()

            db.session.add(new_content)
            db.session.commit()
            flash('Content created successfully!', 'success')
            current_app.logger.info(f"Content '{new_content.title}' created by user {current_user_id}")
            return redirect(url_for('admin.content_list'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error creating content: {e}', 'danger')
            current_app.logger.error(f"Error creating content: {e}")

    categories = Category.query.all()
    tags = Tag.query.all()
    return render_template('admin/content_form.html', title='Create New Content', categories=categories, tags=tags)

@bp.route('/content/edit/<int:content_id>', methods=['GET', 'POST'])
def edit_content(content_id):
    content = Content.query.get_or_404(content_id)
    current_user_id = session.get('user_id')
    current_user_role = session.get('user_role')

    # Authorization: Authors can only edit their own content. Editors/Admins can edit any.
    if current_user_role == 'author' and content.user_id != current_user_id:
        flash('Forbidden: You can only edit your own content.', 'danger')
        return redirect(url_for('admin.dashboard'))

    if request.method == 'POST':
        try:
            # Check for role specific actions (e.g. publishing)
            new_status = request.form['status']
            if new_status == 'published' or new_status == 'archived':
                if current_user_role == 'author' and new_status != content.status:
                    flash('Forbidden: Only editors or administrators can publish or archive content.', 'danger')
                    return redirect(url_for('admin.content_list'))
            
            content.title = request.form['title']
            content.body = request.form['body']
            content.is_featured = 'is_featured' in request.form

            # Handle category update
            category_id = int(request.form['category_id']) if request.form['category_id'] else None
            if category_id:
                category = Category.query.get(category_id)
                if category:
                    content.category = category
                else:
                    flash('Selected category not found.', 'danger')
            else:
                content.category = None # Clear category

            # Handle tags update
            selected_tag_ids = [int(t) for t in request.form.getlist('tags')]
            content.tags = Tag.query.filter(Tag.id.in_(selected_tag_ids)).all()

            # Update status and publication date
            if new_status == 'published' and content.status != 'published':
                content.publish()
            elif new_status != 'published' and content.status == 'published':
                content.unpublish()
            content.status = new_status

            db.session.commit()
            flash('Content updated successfully!', 'success')
            current_app.logger.info(f"Content '{content.title}' (ID: {content_id}) updated by user {current_user_id}")
            return redirect(url_for('admin.content_list'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error updating content: {e}', 'danger')
            current_app.logger.error(f"Error updating content {content_id}: {e}")

    categories = Category.query.all()
    tags = Tag.query.all()
    selected_tags = [tag.id for tag in content.tags]
    return render_template('admin/content_form.html', title='Edit Content', content=content, categories=categories, tags=tags, selected_tags=selected_tags)

@bp.route('/content/delete/<int:content_id>', methods=['POST'])
def delete_content(content_id):
    editor_permission.require(http_exception=403) # Editors and Admins can delete content
    content = Content.query.get_or_404(content_id)
    current_user_id = session.get('user_id')
    current_user_role = session.get('user_role')

    # Even editors cannot delete content they don't own, unless they are admins.
    if current_user_role == 'editor' and content.user_id != current_user_id:
        flash('Forbidden: Editors can only delete their own content.', 'danger')
        return redirect(url_for('admin.dashboard'))

    try:
        db.session.delete(content)
        db.session.commit()
        flash('Content deleted successfully!', 'success')
        current_app.logger.info(f"Content '{content.title}' (ID: {content_id}) deleted by user {current_user_id}")
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting content: {e}', 'danger')
        current_app.logger.error(f"Error deleting content {content_id}: {e}")
    return redirect(url_for('admin.content_list'))

# --- Categories Management ---
@bp.route('/categories')
def category_list():
    editor_permission.require(http_exception=403)
    categories = Category.query.all()
    return render_template('admin/category_list.html', title='Manage Categories', categories=categories)

@bp.route('/categories/new', methods=['GET', 'POST'])
def create_category():
    editor_permission.require(http_exception=403)
    if request.method == 'POST':
        try:
            name = request.form['name']
            description = request.form['description']
            if Category.query.filter_by(name=name).first():
                flash('Category with this name already exists.', 'danger')
                return render_template('admin/category_form.html', title='Create New Category', category={'name':name, 'description':description})

            new_category = Category(name=name, description=description)
            db.session.add(new_category)
            db.session.commit()
            flash('Category created successfully!', 'success')
            current_app.logger.info(f"Category '{new_category.name}' created by user {session.get('user_id')}")
            return redirect(url_for('admin.category_list'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error creating category: {e}', 'danger')
            current_app.logger.error(f"Error creating category: {e}")
    return render_template('admin/category_form.html', title='Create New Category')

@bp.route('/categories/edit/<int:category_id>', methods=['GET', 'POST'])
def edit_category(category_id):
    editor_permission.require(http_exception=403)
    category = Category.query.get_or_404(category_id)
    if request.method == 'POST':
        try:
            name = request.form['name']
            description = request.form['description']

            existing_category = Category.query.filter(Category.name == name, Category.id != category_id).first()
            if existing_category:
                flash('Category with this name already exists.', 'danger')
                return render_template('admin/category_form.html', title='Edit Category', category=category)

            category.name = name
            category.description = description
            db.session.commit()
            flash('Category updated successfully!', 'success')
            current_app.logger.info(f"Category '{category.name}' (ID: {category_id}) updated by user {session.get('user_id')}")
            return redirect(url_for('admin.category_list'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error updating category: {e}', 'danger')
            current_app.logger.error(f"Error updating category {category_id}: {e}")
    return render_template('admin/category_form.html', title='Edit Category', category=category)

@bp.route('/categories/delete/<int:category_id>', methods=['POST'])
def delete_category(category_id):
    admin_permission.require(http_exception=403) # Only admins can delete categories
    category = Category.query.get_or_404(category_id)
    if category.contents.count() > 0:
        flash('Cannot delete category with associated content.', 'danger')
        return redirect(url_for('admin.category_list'))
    
    try:
        db.session.delete(category)
        db.session.commit()
        flash('Category deleted successfully!', 'success')
        current_app.logger.info(f"Category '{category.name}' (ID: {category_id}) deleted by user {session.get('user_id')}")
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting category: {e}', 'danger')
        current_app.logger.error(f"Error deleting category {category_id}: {e}")
    return redirect(url_for('admin.category_list'))

# --- Tags Management ---
@bp.route('/tags')
def tag_list():
    editor_permission.require(http_exception=403)
    tags = Tag.query.all()
    return render_template('admin/tag_list.html', title='Manage Tags', tags=tags)

@bp.route('/tags/new', methods=['GET', 'POST'])
def create_tag():
    editor_permission.require(http_exception=403)
    if request.method == 'POST':
        try:
            name = request.form['name']
            if Tag.query.filter_by(name=name).first():
                flash('Tag with this name already exists.', 'danger')
                return render_template('admin/tag_form.html', title='Create New Tag', tag={'name':name})

            new_tag = Tag(name=name)
            db.session.add(new_tag)
            db.session.commit()
            flash('Tag created successfully!', 'success')
            current_app.logger.info(f"Tag '{new_tag.name}' created by user {session.get('user_id')}")
            return redirect(url_for('admin.tag_list'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error creating tag: {e}', 'danger')
            current_app.logger.error(f"Error creating tag: {e}")
    return render_template('admin/tag_form.html', title='Create New Tag')

@bp.route('/tags/edit/<int:tag_id>', methods=['GET', 'POST'])
def edit_tag(tag_id):
    editor_permission.require(http_exception=403)
    tag = Tag.query.get_or_404(tag_id)
    if request.method == 'POST':
        try:
            name = request.form['name']
            existing_tag = Tag.query.filter(Tag.name == name, Tag.id != tag_id).first()
            if existing_tag:
                flash('Tag with this name already exists.', 'danger')
                return render_template('admin/tag_form.html', title='Edit Tag', tag=tag)

            tag.name = name
            db.session.commit()
            flash('Tag updated successfully!', 'success')
            current_app.logger.info(f"Tag '{tag.name}' (ID: {tag_id}) updated by user {session.get('user_id')}")
            return redirect(url_for('admin.tag_list'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error updating tag: {e}', 'danger')
            current_app.logger.error(f"Error updating tag {tag_id}: {e}")
    return render_template('admin/tag_form.html', title='Edit Tag', tag=tag)

@bp.route('/tags/delete/<int:tag_id>', methods=['POST'])
def delete_tag(tag_id):
    admin_permission.require(http_exception=403) # Only admins can delete tags
    tag = Tag.query.get_or_404(tag_id)
    if tag.contents.count() > 0:
        flash('Cannot delete tag that is associated with content.', 'danger')
        return redirect(url_for('admin.tag_list'))

    try:
        db.session.delete(tag)
        db.session.commit()
        flash('Tag deleted successfully!', 'success')
        current_app.logger.info(f"Tag '{tag.name}' (ID: {tag_id}) deleted by user {session.get('user_id')}")
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting tag: {e}', 'danger')
        current_app.logger.error(f"Error deleting tag {tag_id}: {e}")
    return redirect(url_for('admin.tag_list'))

# --- User Management (Admin Only) ---
@bp.route('/users')
def user_list():
    admin_permission.require(http_exception=403)
    users = User.query.all()
    return render_template('admin/user_list.html', title='Manage Users', users=users)

@bp.route('/users/edit/<int:user_id>', methods=['GET', 'POST'])
def edit_user(user_id):
    admin_permission.require(http_exception=403)
    user = User.query.get_or_404(user_id)
    if request.method == 'POST':
        try:
            user.username = request.form['username']
            user.email = request.form['email']
            user.is_active = 'is_active' in request.form
            
            # Prevent admin from changing their own role to non-admin
            if user.id == session.get('user_id') and request.form['role'] != 'admin':
                flash("You cannot change your own role from 'admin'.", 'danger')
                return render_template('admin/user_form.html', title='Edit User', user=user, roles=['admin', 'editor', 'author'])

            user.role = request.form['role']

            if 'password' in request.form and request.form['password']:
                user.set_password(request.form['password'])

            db.session.commit()
            flash('User updated successfully!', 'success')
            current_app.logger.info(f"User '{user.username}' (ID: {user_id}) updated by admin {session.get('user_id')}")
            return redirect(url_for('admin.user_list'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error updating user: {e}', 'danger')
            current_app.logger.error(f"Error updating user {user_id}: {e}")
    return render_template('admin/user_form.html', title='Edit User', user=user, roles=['admin', 'editor', 'author'])

@bp.route('/users/delete/<int:user_id>', methods=['POST'])
def delete_user(user_id):
    admin_permission.require(http_exception=403)
    user = User.query.get_or_404(user_id)
    if user.id == session.get('user_id'):
        flash('You cannot delete your own admin account!', 'danger')
        return redirect(url_for('admin.user_list'))
    
    try:
        db.session.delete(user)
        db.session.commit()
        flash('User deleted successfully!', 'success')
        current_app.logger.info(f"User '{user.username}' (ID: {user_id}) deleted by admin {session.get('user_id')}")
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting user: {e}', 'danger')
        current_app.logger.error(f"Error deleting user {user_id}: {e}")
    return redirect(url_for('admin.user_list'))

# --- Base Templates for Admin Panel (Minimal HTML/CSS) ---
```