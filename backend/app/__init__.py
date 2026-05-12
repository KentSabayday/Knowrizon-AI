import os
import logging
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# SocketIO instance — only used in local dev, None on Vercel
socketio = None

# Check if running on Vercel (stateless — no SocketIO)
IS_VERCEL = os.environ.get('VERCEL') == '1'


def create_app():
    """Create and configure the Flask application."""
    global socketio

    app = Flask(__name__)

    # Enable CORS for frontend communication — allow all origins
    CORS(app, origins="*", supports_credentials=True)

    # Initialize database
    from app.database import init_db
    init_db(app)

    # Register error handlers for database operations
    from app.errors import register_error_handlers
    register_error_handlers(app)

    # Register blueprints
    from app.routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    # Register Pusher-based realtime routes (always available)
    from app.routes.realtime import realtime_bp
    app.register_blueprint(realtime_bp, url_prefix='/api')

    # Initialize SocketIO only in local dev (not on Vercel)
    if not IS_VERCEL:
        try:
            from app.sockets import init_socketio
            socketio = init_socketio(app)
        except Exception as exc:
            logging.getLogger(__name__).warning(
                "SocketIO init skipped: %s", exc
            )

    return app
