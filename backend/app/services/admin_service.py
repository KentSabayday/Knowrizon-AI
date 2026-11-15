"""
Administrator Service for User Governance and System Analytics.

Provides role management, academic affiliation, user lifecycle actions,
password reset, archiving, cascading account deletion, and system-wide learning analytics.
"""
import bcrypt
from datetime import datetime
from typing import Optional, Tuple, Dict, Any, List

from sqlalchemy import or_, and_, desc, asc

from app.database import db
from app.models.user import User
from app.models.session import Session
from app.models.content import Content
from app.models.quiz_result import QuizResult
from app.models.conversation import Conversation, Message
from app.models.quiz_data import QuizData
from app.models.academic import AcademicYear, Department, ClassSubject


class AdminService:
    """Service handling administrative user governance and system telemetry."""

    def get_system_stats(self) -> Dict[str, Any]:
        """
        Aggregate real-time telemetry across the entire Knowrizon AI ecosystem.
        """
        try:
            total_users = User.query.filter_by(is_anonymous=False, archived=False).count()
            archived_users = User.query.filter_by(is_anonymous=False, archived=True).count()
            active_users = User.query.filter_by(is_anonymous=False, status='active', archived=False).count()
            suspended_users = User.query.filter(
                User.is_anonymous == False,
                User.status.in_(['suspended', 'banned']),
                User.archived == False
            ).count()
            admin_users = User.query.filter(
                User.is_anonymous == False,
                or_(User.is_admin == True, User.role == 'admin'),
                User.archived == False
            ).count()
            dean_users = User.query.filter_by(is_anonymous=False, role='dean', archived=False).count()
            instructor_users = User.query.filter_by(is_anonymous=False, role='instructor', archived=False).count()
            student_users = User.query.filter_by(is_anonymous=False, role='student', archived=False).count()

            total_documents = Content.query.count()
            total_quizzes = QuizResult.query.count()
            total_conversations = Conversation.query.count()

            active_ay = AcademicYear.query.filter_by(is_active=True, archived=False).first()
            total_departments = Department.query.filter_by(archived=False).count()
            total_subjects = ClassSubject.query.filter_by(archived=False).count()

            # Calculate system-wide average quiz mastery score
            results = QuizResult.query.filter_by(is_archived=False).all()
            valid_pcts = [r.percentage for r in results if getattr(r, 'total_questions', 0) > 0 and r.score is not None]
            avg_system_score = round(sum(valid_pcts) / len(valid_pcts), 1) if valid_pcts else 0.0

            return {
                'totalUsers': total_users,
                'archivedUsers': archived_users,
                'activeUsers': active_users,
                'suspendedUsers': suspended_users,
                'adminUsers': admin_users,
                'deanUsers': dean_users,
                'instructorUsers': instructor_users,
                'studentUsers': student_users,
                'totalDocuments': total_documents,
                'totalQuizzes': total_quizzes,
                'totalConversations': total_conversations,
                'averageMasteryScore': avg_system_score,
                'activeAcademicYear': active_ay.year_string if active_ay else 'AY 26-27',
                'totalDepartments': total_departments,
                'totalSubjects': total_subjects,
                'lastUpdated': datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                'totalUsers': 0,
                'archivedUsers': 0,
                'activeUsers': 0,
                'suspendedUsers': 0,
                'adminUsers': 0,
                'deanUsers': 0,
                'instructorUsers': 0,
                'studentUsers': 0,
                'totalDocuments': 0,
                'totalQuizzes': 0,
                'totalConversations': 0,
                'averageMasteryScore': 0.0,
                'activeAcademicYear': 'AY 26-27',
                'error': str(e)
            }

    def get_users(
        self,
        search: Optional[str] = None,
        role: Optional[str] = None,
        status: Optional[str] = None,
        department_id: Optional[str] = None,
        academic_year_id: Optional[str] = None,
        archived: str = 'false',
        page: int = 1,
        per_page: int = 20,
        sort_by: str = 'created_at',
        order: str = 'desc'
    ) -> Dict[str, Any]:
        """
        List users with full-text search, role tabs, department/AY filtering, archive segregation, and pagination.
        """
        query = User.query.filter_by(is_anonymous=False)

        # Archive filter: 'false' (default active), 'true' (archived only), 'all'
        if archived.lower() == 'true':
            query = query.filter(User.archived == True)
        elif archived.lower() == 'false':
            query = query.filter(or_(User.archived == False, User.archived == None))

        # Full-text filter on name or email
        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    User.name.ilike(term),
                    User.email.ilike(term)
                )
            )

        # Role filter: support 'all', 'admin', 'dean', 'instructor', 'student'
        if role and role.strip() and role.lower() != 'all':
            r = role.strip().lower()
            if r == 'admin':
                query = query.filter(or_(User.is_admin == True, User.role == 'admin'))
            elif r in ('dean', 'instructor', 'student'):
                query = query.filter(User.role == r)

        # Status filter
        if status and status.strip() and status.lower() != 'all':
            query = query.filter(User.status == status.strip().lower())

        # Department filter
        if department_id and department_id.strip() and department_id.lower() != 'all':
            query = query.filter(User.department_id == department_id.strip())

        # Academic Year filter
        if academic_year_id and academic_year_id.strip() and academic_year_id.lower() != 'all':
            query = query.filter(User.academic_year_id == academic_year_id.strip())

        # Sorting
        sort_column = getattr(User, sort_by, User.created_at)
        if order.lower() == 'asc':
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        # Pagination
        page = max(1, page)
        per_page = max(1, min(100, per_page))
        total = query.count()
        pages = (total + per_page - 1) // per_page if total > 0 else 1

        users = query.offset((page - 1) * per_page).limit(per_page).all()

        return {
            'users': [u.to_admin_dict() for u in users],
            'total': total,
            'page': page,
            'pages': pages,
            'per_page': per_page
        }

    def get_user_detail(self, user_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Retrieve comprehensive user profile, academic affiliation, document portfolio, and quiz history.
        """
        user = User.query.get(user_id)
        if not user:
            return None, "User not found"

        data = user.to_admin_dict()

        # Fetch recent uploaded materials
        try:
            recent_docs = Content.query.filter_by(user_id=user.id).order_by(Content.created_at.desc()).limit(10).all()
            data['recentDocuments'] = [{
                'id': doc.id,
                'title': doc.title or doc.filename,
                'filename': doc.filename,
                'fileType': doc.file_type,
                'createdAt': doc.created_at.isoformat() if doc.created_at else None
            } for doc in recent_docs]
        except Exception:
            data['recentDocuments'] = []

        # Fetch recent quiz results
        try:
            recent_quizzes = QuizResult.query.filter_by(user_id=user.id, is_archived=False).order_by(QuizResult.created_at.desc()).limit(10).all()
            data['recentQuizzes'] = [{
                'id': q.id,
                'topic': q.topic,
                'score': q.percentage,
                'completedAt': q.created_at.isoformat() if q.created_at else None
            } for q in recent_quizzes]
        except Exception:
            data['recentQuizzes'] = []

        return data, None

    def create_user(
        self,
        email: str,
        password: str,
        name: str,
        role: str = 'student',
        status: str = 'active',
        academic_year_id: Optional[str] = None,
        department_id: Optional[str] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Administratively create a new user account with specified role, status, and academic affiliation.
        """
        if not email or not email.strip():
            return None, "Email address is required"
        if not password or len(password) < 6:
            return None, "Password must be at least 6 characters"
        if not name or not name.strip():
            return None, "Full name is required"

        email = email.lower().strip()
        role = role.lower().strip() if role else 'student'
        if role not in ('admin', 'dean', 'instructor', 'student'):
            role = 'student'

        status = status.lower().strip() if status else 'active'
        if status not in ('active', 'suspended', 'banned'):
            status = 'active'

        # Check existing user
        if User.query.filter_by(email=email).first():
            return None, f"An account with email '{email}' already exists"

        # Default academic year to active if not provided
        if not academic_year_id:
            active_ay = AcademicYear.query.filter_by(is_active=True, archived=False).first()
            if active_ay:
                academic_year_id = active_ay.id

        # Hash password securely
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        is_admin_flag = (role == 'admin')

        user = User(
            email=email,
            name=name.strip(),
            password_hash=password_hash,
            role=role,
            is_admin=is_admin_flag,
            status=status,
            academic_year_id=academic_year_id,
            department_id=department_id,
            archived=False,
            is_anonymous=False
        )

        try:
            db.session.add(user)
            db.session.commit()
            return user.to_admin_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to create user: {str(e)}"

    def update_user(
        self,
        user_id: str,
        current_admin_id: str,
        name: Optional[str] = None,
        email: Optional[str] = None,
        role: Optional[str] = None,
        status: Optional[str] = None,
        bio: Optional[str] = None,
        department_id: Optional[str] = None,
        academic_year_id: Optional[str] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Update user profile, governance status, or academic assignment.
        """
        user = User.query.get(user_id)
        if not user:
            return None, "User not found"

        # Check email uniqueness if changing email
        if email and email.strip().lower() != user.email:
            new_email = email.strip().lower()
            existing = User.query.filter(User.email == new_email, User.id != user_id).first()
            if existing:
                return None, f"Email '{new_email}' is already in use by another account"
            user.email = new_email

        if name and name.strip():
            user.name = name.strip()

        if bio is not None:
            user.bio = bio.strip()

        if department_id is not None:
            user.department_id = department_id if department_id.strip() else None

        if academic_year_id is not None:
            user.academic_year_id = academic_year_id if academic_year_id.strip() else None

        # Update role if provided
        if role and role.strip():
            new_role = role.strip().lower()
            if new_role in ('admin', 'dean', 'instructor', 'student'):
                # Self-demotion check
                if user.id == current_admin_id and new_role != 'admin':
                    return None, "You cannot revoke your own administrator role"
                user.role = new_role
                user.is_admin = (new_role == 'admin')

        # Update status if provided
        if status and status.strip():
            new_status = status.strip().lower()
            if new_status in ('active', 'suspended', 'banned'):
                if user.id == current_admin_id and new_status != 'active':
                    return None, "You cannot suspend or ban your own administrator account"
                user.status = new_status
                if new_status in ('suspended', 'banned'):
                    Session.query.filter_by(user_id=user.id).delete()

        try:
            db.session.commit()
            return user.to_admin_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to update user: {str(e)}"

    def archive_user(
        self,
        user_id: str,
        current_admin_id: str,
        archive: bool = True
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Archive or restore a user account.
        Archiving moves them to the Archived Users partition while preserving historical data.
        """
        user = User.query.get(user_id)
        if not user:
            return None, "User not found"

        if user.id == current_admin_id:
            return None, "You cannot archive your own administrator account"

        if archive and user.is_administrator:
            admin_count = User.query.filter(
                or_(User.is_admin == True, User.role == 'admin'),
                User.archived == False
            ).count()
            if admin_count <= 1:
                return None, "Cannot archive the sole active administrator of the system"

        try:
            user.archived = archive
            if archive:
                # Invalidate active sessions
                Session.query.filter_by(user_id=user.id).delete()
            db.session.commit()
            return user.to_admin_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to {'archive' if archive else 'restore'} user: {str(e)}"

    def update_user_status(
        self,
        user_id: str,
        status: str,
        current_admin_id: str
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Change user status (active, suspended, banned)."""
        user = User.query.get(user_id)
        if not user:
            return None, "User not found"

        if user.id == current_admin_id:
            return None, "You cannot suspend or ban your own administrator account"

        status = status.lower().strip()
        if status not in ('active', 'suspended', 'banned'):
            return None, "Status must be 'active', 'suspended', or 'banned'"

        user.status = status
        if status in ('suspended', 'banned'):
            Session.query.filter_by(user_id=user.id).delete()

        try:
            db.session.commit()
            return user.to_admin_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to update status: {str(e)}"

    def reset_password(
        self,
        user_id: str,
        new_password: str
    ) -> Tuple[bool, Optional[str]]:
        """Administratively reset a user's password."""
        user = User.query.get(user_id)
        if not user:
            return False, "User not found"

        if not new_password or len(new_password) < 6:
            return False, "Password must be at least 6 characters"

        password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user.password_hash = password_hash
        Session.query.filter_by(user_id=user.id).delete()

        try:
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, f"Failed to reset password: {str(e)}"

    def delete_user_cascade(
        self,
        user_id: str,
        current_admin_id: str
    ) -> Tuple[bool, Optional[str]]:
        """Permanently delete a user and cascade delete relational records."""
        user = User.query.get(user_id)
        if not user:
            return False, "User not found"

        if user.id == current_admin_id:
            return False, "You cannot delete your own administrator account"

        if user.is_administrator:
            admin_count = User.query.filter(
                or_(User.is_admin == True, User.role == 'admin')
            ).count()
            if admin_count <= 1:
                return False, "Cannot delete the sole remaining administrator of the system"

        try:
            # Delete academic enrollments
            from app.models.academic import ClassEnrollment
            ClassEnrollment.query.filter_by(student_id=user.id).delete()

            # Delete conversations & messages
            conversations = Conversation.query.filter_by(user_id=user.id).all()
            for conv in conversations:
                Message.query.filter_by(conversation_id=conv.id).delete()
                db.session.delete(conv)

            # Delete quiz data & results
            QuizData.query.filter_by(user_id=user.id).delete()
            QuizResult.query.filter_by(user_id=user.id).delete()

            # Delete content
            Content.query.filter_by(user_id=user.id).delete()

            # Delete friends & communications
            try:
                from app.models.friend import Friend
                from app.models.friend_request import FriendRequest
                from app.models.direct_chat import DirectChat
                from app.models.message import DirectMessage
                from app.models.group_member import GroupMember

                Friend.query.filter(or_(Friend.user_id == user.id, Friend.friend_id == user.id)).delete()
                FriendRequest.query.filter(or_(FriendRequest.sender_id == user.id, FriendRequest.receiver_id == user.id)).delete()
                DirectMessage.query.filter_by(sender_id=user.id).delete()
                DirectChat.query.filter(or_(DirectChat.user1_id == user.id, DirectChat.user2_id == user.id)).delete()
                GroupMember.query.filter_by(user_id=user.id).delete()
            except Exception:
                pass

            Session.query.filter_by(user_id=user.id).delete()

            db.session.delete(user)
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, f"Failed to delete user: {str(e)}"


# Singleton instance
admin_service = AdminService()
