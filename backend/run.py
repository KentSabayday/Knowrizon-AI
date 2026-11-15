"""Entry point for running the Flask development server with SocketIO."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Robustly load .env from backend/.env and project root .env
_backend_dir = Path(__file__).resolve().parent
load_dotenv(dotenv_path=_backend_dir / '.env')
load_dotenv(dotenv_path=_backend_dir.parent / '.env')
load_dotenv()

from app import create_app

app = create_app()

# Import socketio after create_app() has initialized it
from app import socketio

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000, host='127.0.0.1', use_reloader=False)
