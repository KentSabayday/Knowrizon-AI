"""
Administrator API Routes for Knowrizon AI.

Endpoints for user governance, telemetry analytics, role elevation,
password resetting, academic year affiliation, user archiving, and cascading user deletion.
Requires administrator privileges via @require_admin decorator.
"""
from flask import Blueprint, request, jsonify, g

from app.decorators import require_auth, require_admin, require_admin_or_dean
from app.services.admin_service import admin_service
from app.errors import db_error_handler

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/stats', methods=['GET'])
@require_admin
def get_stats():
    """Get system-wide real-time metrics, academic counts, and learning telemetry."""
    stats = admin_service.get_system_stats()
    return jsonify(stats), 200


@admin_bp.route('/users', methods=['GET'])
@require_admin
def get_users():
    """
    Get paginated, searchable, and filtered list of registered users.
    
    Query Params:
        - search: str (name or email keyword)
        - role: str (all, admin, dean, instructor, student)
        - status: str (active, suspended, banned, all)
        - department_id: str (optional)
        - academic_year_id: str (optional)
        - archived: str ('false', 'true', 'all')
        - page: int (default 1)
        - per_page: int (default 20)
        - sort_by: str (created_at, name, email, last_login)
        - order: str (asc, desc)
    """
    search = request.args.get('search')
    role = request.args.get('role')
    status = request.args.get('status')
    department_id = request.args.get('department_id')
    academic_year_id = request.args.get('academic_year_id')
    archived = request.args.get('archived', 'false')
    
    try:
        page = int(request.args.get('page', 1))
    except ValueError:
        page = 1
        
    try:
        per_page = int(request.args.get('per_page', 20))
    except ValueError:
        per_page = 20
        
    sort_by = request.args.get('sort_by', 'created_at')
    order = request.args.get('order', 'desc')
    
    result = admin_service.get_users(
        search=search,
        role=role,
        status=status,
        department_id=department_id,
        academic_year_id=academic_year_id,
        archived=archived,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        order=order
    )
    return jsonify(result), 200


@admin_bp.route('/users/<user_id>', methods=['GET'])
@require_admin
def get_user_detail(user_id):
    """Retrieve full detail, academic info, portfolio documents, and quiz attempts for a specific user."""
    detail, error = admin_service.get_user_detail(user_id)
    if error:
        return jsonify({'error': error}), 404
    return jsonify(detail), 200


@admin_bp.route('/users', methods=['POST'])
@require_admin_or_dean
@db_error_handler
def create_user():
    """
    Administratively create a new user account with role, academic year, and department.
    Administrators can create any role (admin, dean, instructor, student).
    Academic Deans can only create 'instructor' and 'student' accounts (CANNOT create admin or dean).
    """
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    role = (data.get('role') or 'student').lower().strip()
    status = data.get('status', 'active')
    academic_year_id = data.get('academic_year_id') or data.get('academicYearId')
    department_id = data.get('department_id') or data.get('departmentId')

    current_user = g.current_user
    if current_user.is_dean and not current_user.is_administrator:
        if role == 'admin':
            return jsonify({'error': 'Forbidden: Academic Deans cannot create Administrator accounts.'}), 403
        if role == 'dean':
            return jsonify({'error': 'Forbidden: Academic Deans cannot create other Dean accounts. Contact an Administrator.'}), 403
        if role not in ('instructor', 'student'):
            return jsonify({'error': f"Forbidden: Academic Deans can only create Instructor or Student accounts, not '{role}'."}), 403

        # Automatically associate with Dean's department
        if not department_id:
            department_id = current_user.department_id
    
    user_data, error = admin_service.create_user(
        email=email,
        password=password,
        name=name,
        role=role,
        status=status,
        academic_year_id=academic_year_id,
        department_id=department_id
    )
    
    if error:
        return jsonify({'error': error}), 400
        
    return jsonify({
        'message': 'User created successfully',
        'user': user_data
    }), 201


@admin_bp.route('/users/<user_id>', methods=['PUT'])
@require_admin
@db_error_handler
def update_user(user_id):
    """
    Update user profile, governance status, or academic assignment.
    
    JSON Body:
        - name: str (optional)
        - email: str (optional)
        - role: str ('admin', 'dean', 'instructor', 'student')
        - status: str ('active', 'suspended', 'banned')
        - bio: str (optional)
        - department_id: str (optional)
        - academic_year_id: str (optional)
    """
    data = request.get_json() or {}
    user_data, error = admin_service.update_user(
        user_id=user_id,
        current_admin_id=g.current_user.id,
        name=data.get('name'),
        email=data.get('email'),
        role=data.get('role'),
        status=data.get('status'),
        bio=data.get('bio'),
        department_id=data.get('department_id') or data.get('departmentId'),
        academic_year_id=data.get('academic_year_id') or data.get('academicYearId')
    )
    
    if error:
        return jsonify({'error': error}), 400
        
    return jsonify({
        'message': 'User updated successfully',
        'user': user_data
    }), 200


@admin_bp.route('/users/<user_id>/archive', methods=['POST'])
@require_admin
@db_error_handler
def archive_user(user_id):
    """
    Archive a user account (moves to Archived Users view, preserves records).
    """
    user_data, error = admin_service.archive_user(
        user_id=user_id,
        current_admin_id=g.current_user.id,
        archive=True
    )
    
    if error:
        return jsonify({'error': error}), 400
        
    return jsonify({
        'message': f"User {user_data.get('name')} archived successfully",
        'user': user_data
    }), 200


@admin_bp.route('/users/<user_id>/restore', methods=['POST'])
@require_admin
@db_error_handler
def restore_user(user_id):
    """
    Restore an archived user account back to active status.
    """
    user_data, error = admin_service.archive_user(
        user_id=user_id,
        current_admin_id=g.current_user.id,
        archive=False
    )
    
    if error:
        return jsonify({'error': error}), 400
        
    return jsonify({
        'message': f"User {user_data.get('name')} restored successfully",
        'user': user_data
    }), 200


@admin_bp.route('/users/<user_id>/status', methods=['POST'])
@require_admin
@db_error_handler
def update_user_status(user_id):
    """
    Update user account status (e.g. suspend, activate, ban).
    """
    data = request.get_json() or {}
    status = data.get('status')
    if not status:
        return jsonify({'error': 'Status is required'}), 400
        
    user_data, error = admin_service.update_user_status(
        user_id=user_id,
        status=status,
        current_admin_id=g.current_user.id
    )
    
    if error:
        return jsonify({'error': error}), 400
        
    return jsonify({
        'message': f'User status changed to {status}',
        'user': user_data
    }), 200


@admin_bp.route('/users/<user_id>/reset-password', methods=['POST'])
@require_admin
@db_error_handler
def reset_password(user_id):
    """Administratively reset a user's password."""
    data = request.get_json() or {}
    new_password = data.get('newPassword') or data.get('password')
    if not new_password:
        return jsonify({'error': 'New password is required'}), 400
        
    success, error = admin_service.reset_password(
        user_id=user_id,
        new_password=new_password
    )
    
    if error:
        return jsonify({'error': error}), 400
        
    return jsonify({
        'message': 'Password reset successfully'
    }), 200


@admin_bp.route('/users/<user_id>', methods=['DELETE'])
@require_admin
@db_error_handler
def delete_user(user_id):
    """Permanently delete a user account and all child records (cascade)."""
    success, error = admin_service.delete_user_cascade(
        user_id=user_id,
        current_admin_id=g.current_user.id
    )
    
    if error:
        return jsonify({'error': error}), 400
        
    return jsonify({
        'message': 'User deleted successfully'
    }), 200
