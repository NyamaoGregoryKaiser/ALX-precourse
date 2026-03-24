import os
from dotenv import load_dotenv

load_dotenv() # Load environment variables

from flask_script import Manager
from flask_migrate import MigrateCommand
from app import create_app
from app.extensions import db
from app.models import User, Content, Category, Tag # Import models for `flask shell` context

app = create_app()
manager = Manager(app)

# Add database migration commands
manager.add_command('db', MigrateCommand)

# Add a shell context for `flask shell`
@app.shell_context_processor
def make_shell_context():
    return dict(app=app, db=db, User=User, Content=Content, Category=Category, Tag=Tag)

if __name__ == '__main__':
    manager.run()
```