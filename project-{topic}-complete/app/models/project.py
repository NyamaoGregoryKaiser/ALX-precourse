```python
from datetime import datetime
from app.extensions import db
from app.utils.decorators import log_model_operation

@log_model_operation
class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    description = db.Column(db.Text)
    manager_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='active', nullable=False) # 'active', 'completed', 'on_hold', 'cancelled'
    start_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    end_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    tasks = db.relationship('Task', backref='project', lazy=True, cascade="all, delete-orphan")
    comments = db.relationship('Comment', backref='project', lazy=True, cascade="all, delete-orphan")

    def __init__(self, name, description, manager_id, status='active', start_date=None, end_date=None):
        self.name = name
        self.description = description
        self.manager_id = manager_id
        self.status = status
        self.start_date = start_date if start_date else datetime.utcnow()
        self.end_date = end_date

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'manager_id': self.manager_id,
            'status': self.status,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    @staticmethod
    def from_dict(data, partial=False):
        project = Project(
            name=data.get('name'),
            description=data.get('description'),
            manager_id=data.get('manager_id'),
            status=data.get('status', 'active'),
            start_date=datetime.fromisoformat(data['start_date']) if data.get('start_date') else None,
            end_date=datetime.fromisoformat(data['end_date']) if data.get('end_date') else None
        )
        return project

    def __repr__(self):
        return f'<Project {self.name}>'

```