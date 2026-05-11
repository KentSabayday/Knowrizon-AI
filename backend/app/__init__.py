import os
import logging
from flask import Flask, send_from_directory
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

    # Determine static folder path for serving frontend
    static_folder = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        'frontend', 'dist',
    )

    app = Flask(__name__, static_folder=static_folder, static_url_path='')

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

    # Serve React frontend for non-API routes
    @app.route('/')
    def serve_index():
        if os.path.exists(os.path.join(app.static_folder, 'index.html')):
            return send_from_directory(app.static_folder, 'index.html')
        return {'message': 'Knowrizon API is running. Frontend not built yet.'}, 200

    @app.route('/<path:path>')
    def serve_static(path):
        # Try to serve static file first
        if os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        # Fall back to index.html for SPA routing
        if os.path.exists(os.path.join(app.static_folder, 'index.html')):
            return send_from_directory(app.static_folder, 'index.html')
        return {'error': 'Not found'}, 404

    return app
