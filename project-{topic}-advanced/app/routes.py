from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
from app.database import db
from app.models import User, MonitoredDatabase, OptimizationTask, Report, Metric
from app.utils.helpers import hash_password # For user registration

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return render_template('index.html')

@main_bp.route('/register', methods=['GET', 'POST'])
def web_register():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        if not username or not password:
            flash('Username and password are required!', 'danger')
            return redirect(url_for('main.web_register'))

        if User.query.filter_by(username=username).first():
            flash('Username already taken!', 'danger')
            return redirect(url_for('main.web_register'))
        
        if User.query.filter_by(email=email).first():
            flash('Email already taken!', 'danger')
            return redirect(url_for('main.web_register'))

        new_user = User(username=username, email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('main.web_login'))
    return render_template('register.html')

@main_bp.route('/login', methods=['GET', 'POST'])
def web_login():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user)
            flash('Logged in successfully!', 'success')
            next_page = request.args.get('next')
            return redirect(next_page or url_for('main.dashboard'))
        else:
            flash('Invalid username or password.', 'danger')
    return render_template('login.html')

@main_bp.route('/logout')
@login_required
def web_logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('main.index'))

@main_bp.route('/dashboard')
@login_required
def dashboard():
    monitored_dbs = MonitoredDatabase.query.filter_by(user_id=current_user.id).all()
    recent_tasks = OptimizationTask.query.filter_by(user_id=current_user.id).order_by(OptimizationTask.created_at.desc()).limit(5).all()
    recent_reports = Report.query.filter_by(user_id=current_user.id).order_by(Report.generated_at.desc()).limit(5).all()
    return render_template('dashboard.html',
                           monitored_dbs=monitored_dbs,
                           recent_tasks=recent_tasks,
                           recent_reports=recent_reports)

@main_bp.route('/databases')
@login_required
def dbs():
    monitored_dbs = MonitoredDatabase.query.filter_by(user_id=current_user.id).all()
    return render_template('dbs.html', monitored_dbs=monitored_dbs)

@main_bp.route('/databases/new', methods=['GET', 'POST'])
@login_required
def new_db():
    from app.models import DatabaseType # Import here to avoid circular dependency
    if request.method == 'POST':
        try:
            name = request.form['name']
            db_type = DatabaseType[request.form['db_type'].upper()]
            host = request.form['host']
            port = int(request.form['port'])
            username = request.form['db_username']
            password = request.form['db_password']
            database = request.form['database']

            new_db = MonitoredDatabase(
                user_id=current_user.id,
                name=name,
                db_type=db_type,
                host=host,
                port=port,
                username=username,
                password=password,
                database=database
            )
            db.session.add(new_db)
            db.session.commit()
            flash(f'Database "{name}" added successfully!', 'success')
            return redirect(url_for('main.dbs'))
        except ValueError as e:
            flash(f'Invalid input: {e}', 'danger')
        except Exception as e:
            flash(f'Error adding database: {e}', 'danger')
    return render_template('new_db.html', database_types=[dt.value for dt in DatabaseType])

@main_bp.route('/databases/<int:db_id>')
@login_required
def db_details(db_id):
    monitored_db = MonitoredDatabase.query.filter_by(id=db_id, user_id=current_user.id).first_or_404()
    tasks = OptimizationTask.query.filter_by(db_id=db_id).order_by(OptimizationTask.created_at.desc()).all()
    reports = Report.query.filter_by(db_id=db_id).order_by(Report.generated_at.desc()).all()
    metrics = Metric.query.filter_by(db_id=db_id).order_by(Metric.timestamp.desc()).limit(10).all()

    return render_template('db_details.html',
                           monitored_db=monitored_db,
                           tasks=tasks,
                           reports=reports,
                           metrics=metrics)

@main_bp.route('/databases/<int:db_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_db(db_id):
    monitored_db = MonitoredDatabase.query.filter_by(id=db_id, user_id=current_user.id).first_or_404()
    from app.models import DatabaseType # Import here to avoid circular dependency
    if request.method == 'POST':
        try:
            monitored_db.name = request.form['name']
            monitored_db.db_type = DatabaseType[request.form['db_type'].upper()]
            monitored_db.host = request.form['host']
            monitored_db.port = int(request.form['port'])
            monitored_db.username = request.form['db_username']
            # Only update password if provided
            if 'db_password' in request.form and request.form['db_password']:
                monitored_db.password = request.form['db_password']
            monitored_db.database = request.form['database']

            db.session.commit()
            flash(f'Database "{monitored_db.name}" updated successfully!', 'success')
            return redirect(url_for('main.db_details', db_id=db_id))
        except ValueError as e:
            flash(f'Invalid input: {e}', 'danger')
        except Exception as e:
            flash(f'Error updating database: {e}', 'danger')
    return render_template('edit_db.html', monitored_db=monitored_db, database_types=[dt.value for dt in DatabaseType])

@main_bp.route('/databases/<int:db_id>/delete', methods=['POST'])
@login_required
def delete_db(db_id):
    monitored_db = MonitoredDatabase.query.filter_by(id=db_id, user_id=current_user.id).first_or_404()
    db.session.delete(monitored_db)
    db.session.commit()
    flash(f'Database "{monitored_db.name}" deleted successfully.', 'info')
    return redirect(url_for('main.dbs'))

@main_bp.route('/reports')
@login_required
def reports():
    all_reports = Report.query.filter_by(user_id=current_user.id).order_by(Report.generated_at.desc()).all()
    return render_template('reports.html', reports=all_reports)

@main_bp.route('/reports/<int:report_id>')
@login_required
def report_details(report_id):
    report = Report.query.filter_by(id=report_id, user_id=current_user.id).first_or_404()
    return render_template('report_details.html', report=report)

# Task Actions (Triggering tasks via UI)
@main_bp.route('/databases/<int:db_id>/trigger_metric_collection', methods=['POST'])
@login_required
def trigger_metric_collection(db_id):
    from app.tasks import collect_metrics_task # Import task
    monitored_db = MonitoredDatabase.query.filter_by(id=db_id, user_id=current_user.id).first_or_404()
    
    task_entry = OptimizationTask(
        user_id=current_user.id,
        db_id=monitored_db.id,
        task_type='metric_collection',
        status='pending',
        schedule='manual'
    )
    db.session.add(task_entry)
    db.session.commit()

    celery_task = collect_metrics_task.delay(monitored_db.to_dict(include_sensitive=True), task_entry.id)
    task_entry.celery_task_id = celery_task.id
    task_entry.status = 'running'
    db.session.commit()

    flash(f'Metric collection for "{monitored_db.name}" initiated. Task ID: {celery_task.id}', 'success')
    return redirect(url_for('main.db_details', db_id=db_id))

@main_bp.route('/databases/<int:db_id>/trigger_analysis', methods=['POST'])
@login_required
def trigger_analysis(db_id):
    from app.tasks import analyze_db_task # Import task
    monitored_db = MonitoredDatabase.query.filter_by(id=db_id, user_id=current_user.id).first_or_404()

    task_entry = OptimizationTask(
        user_id=current_user.id,
        db_id=monitored_db.id,
        task_type='analysis',
        status='pending',
        schedule='manual'
    )
    db.session.add(task_entry)
    db.session.commit()

    celery_task = analyze_db_task.delay(monitored_db.to_dict(include_sensitive=True), task_entry.id)
    task_entry.celery_task_id = celery_task.id
    task_entry.status = 'running'
    db.session.commit()

    flash(f'Database analysis for "{monitored_db.name}" initiated. Task ID: {celery_task.id}', 'success')
    return redirect(url_for('main.db_details', db_id=db_id))
```