"""WSGI entry point for Heroku deployment with Gunicorn and eventlet."""
import eventlet
eventlet.monkey_patch()

import os
import sys

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, socketio

app = create_app()

# For gunicorn with eventlet worker
if __name__ == "__main__":
    socketio.run(app, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
