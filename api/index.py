"""
Vercel Python WSGI entrypoint.

All /api/* routes are handled by this Flask application.
Static frontend assets are served from public/ by Vercel CDN.
"""
import os
import sys

# Add backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend'))

# Set VERCEL flag
os.environ.setdefault('VERCEL', '1')

from app import create_app  # noqa: E402

app = create_app()
