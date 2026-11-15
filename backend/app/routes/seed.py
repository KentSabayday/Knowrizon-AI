"""Seed data routes for demo data management (Development only)."""
import os
from flask import Blueprint, jsonify, current_app
from app.services.seed_data import seed_demo_data, get_demo_credentials, seed_data_service
from app.decorators import require_admin

seed_bp = Blueprint('seed', __name__)


def _is_dev_mode() -> bool:
    """Check if server is in development or test mode."""
    env = os.environ.get('FLASK_ENV', '').lower()
    ver = os.environ.get('VERCEL', '')
    return env in ('development', 'testing') and ver != '1'


@seed_bp.route('/seed', methods=['POST'])
def seed_data():
    """
    Seed demo data into the application.
    Protected in production: Only available in development mode or with admin authentication.
    """
    if not _is_dev_mode():
        return jsonify({'error': 'Seed operations disabled in production environment'}), 403

    result = seed_demo_data()
    return jsonify(result), 200 if result.get("status") == "success" else 200


@seed_bp.route('/seed/status', methods=['GET'])
def seed_status():
    """Check if demo data has been seeded."""
    return jsonify({
        "seeded": seed_data_service.is_seeded()
    }), 200


@seed_bp.route('/seed/credentials', methods=['GET'])
def demo_credentials():
    """
    Get demo user credentials for local test/dev environments.
    Strictly blocked in production environments to prevent credential leakage.
    """
    if not _is_dev_mode():
        return jsonify({'credentials': [], 'message': 'Demo credentials disabled in production'}), 403

    credentials = get_demo_credentials()
    return jsonify({
        "credentials": credentials
    }), 200
