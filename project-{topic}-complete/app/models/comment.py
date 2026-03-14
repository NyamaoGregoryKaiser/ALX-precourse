```python
from datetime import datetime
from app.extensions import db
from app.utils.decorators import log_model_operation

@log_model_operation
class Comment(db.Model):
    __tablename__ = 'comments'

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Ensure either task_id or project_id is present
    __table_args__ = (
        db.CheckConstraint('(task_id IS NOT NULL AND project_id IS NULL) OR (task_id IS NULL AND project_id IS NOT NULL)', name='chk_task_or_project_id'),
    )

    def __init__(self, content, author_id, task_id=None, project_id=None):
        self.content = content
        self.author_id = author_id
        self.task_id = task_id
        self.project_id = project_id

    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'task_id': self.task_id,
            'project_id': self.project_id,
            'author_id': self.author_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    @staticmethod
    def from_dict(data, partial=False):
        comment = Comment(
            content=data.get('content'),
            author_id=data.get('author_id'),
            task_id=data.get('task_id'),
            project_id=data.get('project_id')
        )
        return comment

    def __repr__(self):
        return f'<Comment {self.id} by {self.author_id}>'

```