"""
Database configuration module for Knowrizon.

Configures SQLAlchemy with Flask, supporting SQLite (local dev) and PostgreSQL (Supabase/Vercel).
"""
import os
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


db = SQLAlchemy(model_class=Base)


def get_database_url():
    """
    Get database URL from environment or use SQLite default.

    Priority:
        1. DATABASE_URL env var (PostgreSQL on Supabase)
        2. SQLite at backend/data/knowrizon.db (local dev)

    Returns:
        str: Database connection URL
    """
    database_url = os.environ.get('DATABASE_URL')

    if database_url:
        # Fix common Heroku/Supabase prefix issue
        if database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
        return database_url

    # Default to SQLite at backend/data/knowrizon.db
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(backend_dir, 'data')
    db_path = os.path.join(data_dir, 'knowrizon.db')

    return f'sqlite:///{db_path}'


def init_db(app):
    """
    Initialize database with Flask app.

    Args:
        app: Flask application instance
    """
    database_url = get_database_url()

    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Connection settings for PostgreSQL (production / serverless)
    if not database_url.startswith('sqlite'):
        is_vercel = os.environ.get('VERCEL') == '1'
        if is_vercel:
            # Serverless: NullPool — no persistent connections between invocations
            from sqlalchemy.pool import NullPool
            app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
                'poolclass': NullPool,
                'connect_args': {
                    'sslmode': 'require',
                    'connect_timeout': 10,
                },
            }
        else:
            # Local dev: connection pooling for performance
            app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
                'pool_size': 5,
                'max_overflow': 10,
                'pool_recycle': 1800,
                'pool_pre_ping': True,
                'connect_args': {
                    'sslmode': 'require',
                },
            }

    db.init_app(app)

    # Create data directory if using SQLite
    if database_url.startswith('sqlite'):
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_dir = os.path.join(backend_dir, 'data')
        os.makedirs(data_dir, exist_ok=True)

    # Import models before creating tables so SQLAlchemy knows about them
    # This must happen after db.init_app() but before db.create_all()
    from app.models import User, Session, Content, QuizResult, Conversation, Message
    from app.models import (Friend, FriendRequest, DirectChat, DirectMessage,
                           GroupMessage, GroupLearning, GroupMember, Call,
                           CallParticipant, UserPresence)

    # Create all tables
    with app.app_context():
        db.create_all()
