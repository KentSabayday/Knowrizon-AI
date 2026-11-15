"""
Authentication service for user management with database persistence.

Uses SQLAlchemy ORM for storing users and sessions in the database.
Includes automatic provisioning for default bootstrap and administrator accounts.
"""
import bcrypt
from datetime import datetime
from typing import Optional, Tuple

from app.database import db
from app.models.user import User
from app.models.session import Session
from app.models.academic import AcademicYear, Department, ClassSubject, ClassEnrollment

BOOTSTRAP_ACCOUNTS = {
    'admin@knowrizon.ai': {
        'password': 'AdminPassword123!',
        'name': 'System Administrator',
        'role': 'admin',
        'is_admin': True,
        'status': 'active'
    },
    'student@example.com': {
        'password': 'student123',
        'name': 'Alex Student',
        'role': 'student',
        'is_admin': False,
        'status': 'active'
    },
    'demo@knowrizon.ai': {
        'password': 'demo123',
        'name': 'Demo User',
        'role': 'student',
        'is_admin': False,
        'status': 'active'
    },
    'teacher@example.com': {
        'password': 'teacher123',
        'name': 'Dr. Sarah Teacher',
        'role': 'instructor',
        'is_admin': False,
        'status': 'active'
    },
    'dean@knowrizon.ai': {
        'password': 'dean123',
        'name': 'Dr. Arthur Dean',
        'role': 'dean',
        'is_admin': False,
        'status': 'active'
    }
}


class AuthService:
    """Service for handling user authentication operations with database persistence."""
    
    def register(
        self,
        email: str,
        password: str,
        name: str,
        school: Optional[str] = None,
        course: Optional[str] = None,
        year_level: Optional[str] = None
    ) -> Tuple[Optional[dict], Optional[str]]:
        """
        Register a verified Student with institutional Philippine educational email (.edu.ph).
        Automatically assigns and migrates the student to their designated academic Department,
        binds them to the active Academic Year, and auto-enrolls them into class subjects matching
        their collegiate standing year level (1st–4th).
        """
        # Validate inputs
        if not email or not email.strip():
            return None, "Email is required"
        if not password or len(password) < 6:
            return None, "Password must be at least 6 characters"
        if not name or not name.strip():
            return None, "Full name is required"

        email = email.lower().strip()
        name = name.strip()

        # Strict Institutional Philippine Email Validation (.edu.ph)
        if not email.endswith('.edu.ph'):
            return None, (
                "Registration is strictly for verified students. "
                "Please use an official Philippine institutional educational email ending with .edu.ph "
                "(e.g., yourname@urios.edu.ph or student@up.edu.ph)."
            )

        school = (school or 'Father Saturnino Urios University').strip()
        raw_course = (course or 'BSA - Bachelor of Science in Accountancy').strip()
        raw_year = (year_level or '1st Year').strip()

        # Normalize Year Level to standard enum: '1st', '2nd', '3rd', '4th'
        norm_year = '1st'
        if '2' in raw_year:
            norm_year = '2nd'
        elif '3' in raw_year:
            norm_year = '3rd'
        elif '4' in raw_year:
            norm_year = '4th'

        # Check if email already exists
        existing = User.query.filter_by(email=email).first()
        if existing:
            return None, "An account with this institutional email already exists. Please sign in instead."

        # Map Degree Program / Course to Collegiate Department
        # Supported collegiate departments
        COURSE_MAP = {
            'BSA': ('College of Accountancy', 'COA'),
            'BSCS': ('College of Computer Studies', 'CCS'),
            'BSIT': ('College of Computer Studies', 'CCS'),
            'BSCE': ('College of Engineering', 'COE'),
            'BSN': ('College of Nursing', 'CON'),
            'BSCRIM': ('College of Criminal Justice Education', 'CCJE')
        }

        # Resolve department based on course code prefix
        upper_course = raw_course.upper()
        dept_info = ('College of Accountancy', 'COA')  # default
        for code_prefix, info in COURSE_MAP.items():
            if code_prefix in upper_course:
                dept_info = info
                break

        dept_name, dept_code = dept_info

        # Resolve Active Academic Year
        active_ay = AcademicYear.query.filter_by(is_active=True).first()
        if not active_ay:
            active_ay = AcademicYear.query.filter_by(archived=False).order_by(AcademicYear.created_at.desc()).first()
        if not active_ay:
            active_ay = AcademicYear(year_string='AY 26-27', is_active=True, archived=False)
            db.session.add(active_ay)
            db.session.commit()

        # Resolve or auto-provision Department
        dept = Department.query.filter(
            (Department.code == dept_code) | (Department.name == dept_name)
        ).first()

        if not dept:
            # Check for Dean in this department
            dean_cand = User.query.filter_by(role='dean').first()
            dept = Department(
                name=dept_name,
                code=dept_code,
                academic_year_id=active_ay.id,
                dean_id=dean_cand.id if dean_cand and dept_code == 'COA' else None,
                archived=False
            )
            db.session.add(dept)
            db.session.commit()

        # Hash password with bcrypt
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # Create Student User
        user = User(
            email=email,
            name=name,
            password_hash=password_hash,
            role='student',
            is_admin=False,
            status='active',
            is_anonymous=False,
            department_id=dept.id,
            academic_year_id=active_ay.id,
            school=school,
            course=raw_course,
            year_level=norm_year
        )
        db.session.add(user)
        db.session.commit()

        # Auto-Enroll Student into matching curriculum subjects for their department & standing
        try:
            subjects = ClassSubject.query.filter_by(
                department_id=dept.id,
                year_level=norm_year,
                archived=False
            ).all()

            # If no subjects exist yet for this department & year level, seed standard curriculum
            if not subjects:
                # Find suitable instructor or dean
                inst = User.query.filter(
                    (User.role == 'instructor') & (User.department_id == dept.id)
                ).first()
                if not inst:
                    inst = User.query.filter_by(role='instructor').first()

                default_curriculum = {
                    'COA': {
                        '1st': ('Financial Accounting & Reporting', 'FAR 101'),
                        '2nd': ('Intermediate Accounting I', 'ACT 201'),
                        '3rd': ('Strategic Business Taxation', 'TAX 301'),
                        '4th': ('Advanced Auditing & Assurance', 'AUD 401'),
                    },
                    'CCS': {
                        '1st': ('Introduction to Computing & Logic', 'CS 101'),
                        '2nd': ('Data Structures & Algorithms', 'DSA 201'),
                        '3rd': ('Integrative Programming & Technologies', 'IPT 301'),
                        '4th': ('Capstone Project & Systems Architecture', 'CAP 401'),
                    },
                    'COE': {
                        '1st': ('Engineering Calculus I', 'ENG 101'),
                        '2nd': ('Statics of Rigid Bodies', 'ENG 201'),
                        '3rd': ('Fluid Mechanics & Hydraulics', 'ENG 301'),
                        '4th': ('Structural Design Project', 'ENG 401'),
                    },
                    'CON': {
                        '1st': ('Theoretical Foundations in Nursing', 'NUR 101'),
                        '2nd': ('Pharmacology & Patient Care', 'NUR 201'),
                        '3rd': ('Medical-Surgical Nursing I', 'NUR 301'),
                        '4th': ('Nursing Leadership & Management', 'NUR 401'),
                    },
                    'CCJE': {
                        '1st': ('Introduction to Criminology', 'CRIM 101'),
                        '2nd': ('Criminal Law & Jurisprudence', 'CRIM 201'),
                        '3rd': ('Forensic Investigation & Ballistics', 'CRIM 301'),
                        '4th': ('Police Organization & Ethics', 'CRIM 401'),
                    }
                }

                curr_table = default_curriculum.get(dept_code, default_curriculum['COA'])
                subj_name, subj_code = curr_table.get(norm_year, ('Foundations of Modern Practice', f"{dept_code} 101"))

                new_subj = ClassSubject(
                    name=subj_name,
                    code=subj_code,
                    year_level=norm_year,
                    department_id=dept.id,
                    instructor_id=inst.id if inst else None,
                    academic_year_id=active_ay.id,
                    units=3.0,
                    description=f"Core curriculum requirement for {dept_name} {norm_year} Year students.",
                    archived=False
                )
                db.session.add(new_subj)
                db.session.commit()
                subjects = [new_subj]

            # Enroll student in all matching subjects
            for s in subjects:
                existing_enroll = ClassEnrollment.query.filter_by(
                    student_id=user.id,
                    subject_id=s.id
                ).first()
                if not existing_enroll:
                    enrollment = ClassEnrollment(
                        student_id=user.id,
                        subject_id=s.id,
                        academic_year_id=active_ay.id,
                        status='enrolled',
                        grade=None,
                        units=getattr(s, 'units', 3.0) or 3.0,
                        archived=False
                    )
                    db.session.add(enrollment)
            db.session.commit()
        except Exception as enroll_err:
            db.session.rollback()
            # Do not fail registration if auto-enrollment hit a non-fatal warning
            pass

        # Create session for the new user
        session = Session.create_for_user(user.id)
        db.session.add(session)
        db.session.commit()

        return {'user': user, 'session': session}, None
    
    def login(self, email: str, password: str) -> Tuple[Optional[dict], Optional[str]]:
        """
        Authenticate a user with email and password.
        
        Args:
            email: User's email address
            password: User's password
            
        Returns:
            Tuple of ({'user': User, 'session': Session}, None) on success,
            or (None, error_message) on failure.
        """
        if not email or not password:
            return None, "Email and password are required"
        
        email = email.lower().strip()
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        if not user:
            return None, "Invalid email or password"
        
        # Verify password strictly against database password hash
        pw_matches = False
        if user.password_hash:
            try:
                pw_matches = bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8'))
            except Exception:
                pw_matches = False

        if not pw_matches:
            return None, "Invalid email or password"
        
        # Check account status
        if getattr(user, 'status', 'active') in ('suspended', 'banned'):
            return None, f"Your account has been {user.status}. Please contact the system administrator."
        
        # Update last login
        user.last_login = datetime.utcnow()
        
        # Create new session
        session = Session.create_for_user(user.id)
        db.session.add(session)
        db.session.commit()
        
        return {'user': user, 'session': session}, None
    
    def create_anonymous(self) -> dict:
        """
        Create an anonymous user and session.
        
        Returns:
            Dictionary with 'user' and 'session' keys.
        """
        # Create anonymous user
        user = User(
            name='Anonymous User',
            is_anonymous=True
        )
        db.session.add(user)
        db.session.commit()
        
        # Create session for anonymous user
        session = Session.create_for_user(user.id)
        db.session.add(session)
        db.session.commit()
        
        return {'user': user, 'session': session}
    
    def validate_token(self, token: str) -> Optional[User]:
        """
        Validate a session token and return the associated user.
        
        Args:
            token: The session token to validate
            
        Returns:
            User if token is valid and not expired, None otherwise.
        """
        if not token:
            return None
            
        session = Session.query.filter_by(token=token).first()
        if not session:
            return None
        
        if session.is_expired:
            return None
        
        user = session.user
        if not user or getattr(user, 'status', 'active') in ('suspended', 'banned'):
            return None
        return user
    
    def logout(self, token: str) -> bool:
        """
        Invalidate a session (logout).
        
        Args:
            token: The session token to invalidate
            
        Returns:
            True if session was found and deleted, False otherwise.
        """
        if not token:
            return False
            
        session = Session.query.filter_by(token=token).first()
        if session:
            db.session.delete(session)
            db.session.commit()
            return True
        return False
    
    def refresh_session(self, token: str, duration_hours: int = 24) -> Optional[Session]:
        """
        Refresh a session's expiration time.
        
        Args:
            token: The session token to refresh
            duration_hours: How long to extend the session (default 24 hours)
            
        Returns:
            Updated Session if found and not expired, None otherwise.
        """
        if not token:
            return None
            
        session = Session.query.filter_by(token=token).first()
        if not session or session.is_expired:
            return None
        
        session.refresh(duration_hours)
        db.session.commit()
        return session
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        return User.query.get(user_id)
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        if not email:
            return None
        email = email.lower().strip()
        return User.query.filter_by(email=email).first()
    
    # Legacy method aliases for backward compatibility
    def create_anonymous_session(self) -> Tuple[str, User]:
        """
        Create an anonymous user session (legacy method).
        
        Returns:
            Tuple of (session_token, User).
        """
        result = self.create_anonymous()
        return result['session'].token, result['user']
    
    def create_session(self, user_id: str) -> str:
        """Create a session for an authenticated user (legacy method)."""
        session = Session.create_for_user(user_id)
        db.session.add(session)
        db.session.commit()
        return session.token
    
    def get_user_by_session(self, session_id: str) -> Optional[User]:
        """Get user by session ID (legacy method, alias for validate_token)."""
        return self.validate_token(session_id)
    
    def invalidate_session(self, session_id: str) -> bool:
        """Invalidate a session (legacy method, alias for logout)."""
        return self.logout(session_id)


# Global auth service instance
auth_service = AuthService()
