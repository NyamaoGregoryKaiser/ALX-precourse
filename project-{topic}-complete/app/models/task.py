```python
from datetime import datetime
from app.extensions import db
from app.utils.decorators import log_model_operation

@log_model_operation
class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assigned_to_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    status = db.Column(db.String(20), default='open', nullable=False) # 'open', 'in_progress', 'review', 'done', 'blocked'
    priority = db.Column(db.String(20), default='medium', nullable=False) # 'low', 'medium', 'high', 'urgent'
    due_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    comments = db.relationship('Comment', backref='task', lazy=True, cascade="all, delete-orphan")

    def __init__(self, title, description, project_id, creator_id, assigned_to_id=None,
                 status='open', priority='medium', due_date=None):
        self.title = title
        self.description = description
        self.project_id = project_id
        self.creator_id = creator_id
        self.assigned_to_id = assigned_to_id
        self.status = status
        self.priority = priority
        self.due_date = due_date

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'project_id': self.project_id,
            'creator_id': self.creator_id,
            'assigned_to_id': self.assigned_to_id,
            'status': self.status,
            'priority': self.priority,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    @staticmethod
    def from_dict(data, partial=False):
        task = Task(
            title=data.get('title'),
            description=data.get('description'),
            project_id=data.get('project_id'),
            creator_id=data.get('creator_id'),
            assigned_to_id=data.get('assigned_to_id'),
            status=data.get('status', 'open'),
            priority=data.get('priority', 'medium'),
            due_date=datetime.fromisoformat(data['due_date']) if data.get('due_date') else None
        )
        return task

    def __repr__(self):
        return f'<Task {self.title}>'

```