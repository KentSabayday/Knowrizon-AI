"""
User model for database persistence.

Defines the User table with SQLAlchemy ORM for storing registered, anonymous,
administrator, dean, and instructor users in the academic ecosystem.
"""
import uuid
from datetime import datetime
from typing import Optional

from app.database import db


class User(db.Model):
    """User model representing authenticated, anonymous, and administrator/academic users."""
    
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=True)
    name = db.Column(db.String(255), nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(50), default='student', nullable=False)  # 'admin', 'dean', 'instructor', 'student'
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    status = db.Column(db.String(20), default='active', nullable=False)  # 'active', 'suspended', 'banned'
    avatar_url = db.Column(db.String(500), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    is_anonymous = db.Column(db.Boolean, default=False)
    
    # Academic Ecosystem Hierarchy
    department_id = db.Column(db.String(36), db.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True)
    academic_year_id = db.Column(db.String(36), db.ForeignKey('academic_years.id', ondelete='SET NULL'), nullable=True)
    school = db.Column(db.String(255), nullable=True)
    course = db.Column(db.String(255), nullable=True)
    year_level = db.Column(db.String(50), nullable=True)  # '1st', '2nd', '3rd', '4th'
    archived = db.Column(db.Boolean, default=False, nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    sessions = db.relationship('Session', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    contents = db.relationship('Content', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    quiz_results = db.relationship('QuizResult', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    # Academic Relationships
    department = db.relationship('Department', foreign_keys=[department_id], lazy='joined')
    academic_year = db.relationship('AcademicYear', foreign_keys=[academic_year_id], lazy='joined')
    
    @property
    def is_administrator(self) -> bool:
        """Check if user has administrative rights."""
        return bool(self.is_admin or (self.role and self.role.lower() == 'admin'))
    
    @property
    def is_dean(self) -> bool:
        """Check if user is a Dean."""
        return bool(self.role and self.role.lower() == 'dean')
        
    @property
    def is_instructor(self) -> bool:
        """Check if user is an Instructor."""
        return bool(self.role and self.role.lower() == 'instructor')
        
    @property
    def is_student(self) -> bool:
        """Check if user is a Student."""
        return bool(not self.role or self.role.lower() == 'student')
    
    def verify_password(self, password: str) -> bool:
        """Verify provided password against stored bcrypt hash."""
        if not self.password_hash or not password:
            return False
        try:
            import bcrypt
            return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
        except Exception:
            return False
    
    def __repr__(self):
        return f'<User {self.id}: {self.email or "anonymous"} ({self.role or "student"})>'
    
    def to_dict(self, include_sensitive: bool = False) -> dict:
        """Convert user to dictionary for API responses."""
        data = {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role or ('admin' if self.is_admin else 'student'),
            'isAdmin': self.is_administrator,
            'is_admin': self.is_administrator,
            'isDean': self.is_dean,
            'isInstructor': self.is_instructor,
            'status': self.status or 'active',
            'avatar_url': self.avatar_url,
            'avatarUrl': self.avatar_url,
            'bio': self.bio,
            'department_id': self.department_id,
            'departmentId': self.department_id,
            'department_name': self.department.name if self.department else None,
            'departmentName': self.department.name if self.department else None,
            'school': self.school,
            'course': self.course,
            'year_level': self.year_level,
            'yearLevel': self.year_level,
            'academic_year_id': self.academic_year_id,
            'academicYearId': self.academic_year_id,
            'academic_year_string': self.academic_year.year_string if self.academic_year else None,
            'academicYearString': self.academic_year.year_string if self.academic_year else None,
            'archived': self.archived,
            'is_anonymous': self.is_anonymous,
            'isAnonymous': self.is_anonymous,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'lastLogin': self.last_login.isoformat() if self.last_login else None
        }
        if include_sensitive:
            data['password_hash'] = self.password_hash
        return data
    
    def to_admin_dict(self) -> dict:
        """Convert user to enriched dictionary with operational metrics for administrator workspace."""
        base_dict = self.to_dict()
        
        # Calculate summary activity statistics safely
        doc_count = 0
        quiz_count = 0
        conv_count = 0
        avg_score = 0.0
        
        try:
            from app.models.content import Content
            doc_count = Content.query.filter_by(user_id=self.id).count()
        except Exception:
            pass
            
        try:
            from app.models.quiz_result import QuizResult
            results = QuizResult.query.filter_by(user_id=self.id, is_archived=False).all()
            quiz_count = len(results)
            if quiz_count > 0:
                valid_pcts = [r.percentage for r in results if getattr(r, 'total_questions', 0) > 0 and r.score is not None]
                if valid_pcts:
                    avg_score = round(sum(valid_pcts) / len(valid_pcts), 1)
        except Exception:
            pass
            
        try:
            from app.models.conversation import Conversation
            conv_count = Conversation.query.filter_by(user_id=self.id).count()
        except Exception:
            pass
            
        base_dict['metrics'] = {
            'documentCount': doc_count,
            'quizCount': quiz_count,
            'averageScore': avg_score,
            'conversationCount': conv_count
        }
        
        return base_dict

    @classmethod
    def from_dict(cls, data: dict) -> 'User':
        """Create a User instance from a dictionary."""
        return cls(
            id=data.get('id', str(uuid.uuid4())),
            email=data.get('email'),
            name=data.get('name', ''),
            password_hash=data.get('password_hash'),
            role=data.get('role', 'student'),
            is_admin=data.get('is_admin', data.get('isAdmin', False)),
            status=data.get('status', 'active'),
            avatar_url=data.get('avatar_url', data.get('avatarUrl')),
            bio=data.get('bio'),
            department_id=data.get('department_id', data.get('departmentId')),
            academic_year_id=data.get('academic_year_id', data.get('academicYearId')),
            school=data.get('school'),
            course=data.get('course'),
            year_level=data.get('year_level', data.get('yearLevel')),
            archived=data.get('archived', False),
            is_anonymous=data.get('is_anonymous', False),
            created_at=datetime.fromisoformat(data['created_at']) if data.get('created_at') else datetime.utcnow(),
            last_login=datetime.fromisoformat(data['last_login']) if data.get('last_login') else datetime.utcnow()
        )
