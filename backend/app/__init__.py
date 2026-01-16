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

# SocketIO instance - accessible for running with eventlet
socketio = None


def create_app():
    """Create and configure the Flask application."""
    global socketio
    
    # Determine static folder path for serving frontend
    static_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'frontend', 'dist')
    
    app = Flask(__name__, static_folder=static_folder, static_url_path='')
    
    # Enable CORS for frontend communication (include Heroku domains)
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5000",
    ]
    # Add Heroku app URL if available
    heroku_app_name = os.environ.get('HEROKU_APP_NAME')
    if heroku_app_name:
        allowed_origins.append(f"https://{heroku_app_name}.herokuapp.com")
    
    CORS(app, origins=allowed_origins, supports_credentials=True)
    
    # Initialize database
    from app.database import init_db
    init_db(app)
    
    # Register error handlers for database operations
    from app.errors import register_error_handlers
    register_error_handlers(app)
    
    # Register blueprints
    from app.routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Initialize SocketIO
    from app.sockets import init_socketio
    socketio = init_socketio(app)
    
    # Serve React frontend for non-API routes
    @app.route('/')
    def serve_index():
        if os.path.exists(os.path.join(app.static_folder, 'index.html')):
            return send_from_directory(app.static_folder, 'index.html')
        return {'message': 'MentorMind API is running. Frontend not built yet.'}, 200
    
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
