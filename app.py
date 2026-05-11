"""
Vercel WSGI entrypoint — loads the Flask app.

Vercel detects this file at the project root and loads the `app` variable.
Configured via [tool.vercel] entrypoint = "app:app" in pyproject.toml.
"""
import os
import sys

# Add backend directory to Python path so imports like `from app import ...` work
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

# Set VERCEL flag so the app factory can skip SocketIO initialization
os.environ.setdefault('VERCEL', '1')

from app import create_app  # noqa: E402

app = create_app()
