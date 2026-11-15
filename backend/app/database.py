"""
Database configuration module for Knowrizon.

Configures SQLAlchemy with Flask, supporting SQLite (local dev) and PostgreSQL (Supabase/Vercel).
Includes resilient migration runners and academic ecosystem seeding.
"""
import os
from datetime import datetime
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

        # In serverless environments, redirect Supabase pooler from session mode (port 5432, limited to 15 clients)
        # to transaction mode (port 6543) which multiplexes thousands of serverless requests cleanly
        if 'pooler.supabase.com' in database_url and ':5432' in database_url:
            database_url = database_url.replace(':5432', ':6543')

        # If postgresql:// without driver specified, ensure compatibility with installed drivers
        if database_url.startswith('postgresql://'):
            try:
                import psycopg  # noqa: F401
                # psycopg (v3) is available, postgresql:// works as-is
            except ImportError:
                try:
                    import psycopg2  # noqa: F401
                    database_url = database_url.replace('postgresql://', 'postgresql+psycopg2://', 1)
                except ImportError:
                    pass

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
            # Serverless: NullPool ensures every request gets a reliable, fresh connection without stale socket drops
            from sqlalchemy.pool import NullPool
            app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
                'poolclass': NullPool,
                'connect_args': {
                    'sslmode': 'require',
                    'connect_timeout': 15,
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

    # Serverless Optimization: On Vercel, schema and initial seeds are already provisioned.
    # Skipping migration inspection and seeder iterations on every cold start eliminates
    # 70+ sequential SQL round-trips to Supabase, reducing cold start latency by 5-15 seconds!
    is_vercel = os.environ.get('VERCEL') == '1'
    if is_vercel and os.environ.get('FORCE_MIGRATION') != '1':
        return

    # Import models before creating tables so SQLAlchemy knows about them
    from app.models import (
        User, Session, Content, QuizResult, Conversation, Message,
        AcademicYear, Department, ClassSubject, ClassSchedule, ClassEnrollment, LearningMaterial,
        Friend, FriendRequest, DirectChat, DirectMessage,
        GroupMessage, GroupLearning, GroupMember, Call,
        CallParticipant, UserPresence
    )
    from app.models.quiz_data import QuizData

    # Create all tables
    with app.app_context():
        try:
            db.create_all()
        except Exception as e:
            app.logger.warning(f"db.create_all() warning: {e}")
            
        try:
            _run_migrations(app)
        except Exception as e:
            app.logger.warning(f"Database migration warning: {e}")
            
        try:
            _ensure_default_admin(app)
        except Exception as e:
            app.logger.warning(f"Admin initialization warning: {e}")

        try:
            _ensure_academic_defaults(app)
        except Exception as e:
            app.logger.warning(f"Academic defaults initialization warning: {e}")


def _run_migrations(app):
    """
    Lightweight, robust migration runner for adding columns to existing tables.
    db.create_all() only creates NEW tables — it cannot ALTER existing ones.
    Uses IF NOT EXISTS for PostgreSQL and catches duplicate column errors for SQLite.
    Never crashes the application if a migration fails or is already applied.
    """
    from sqlalchemy import text

    with app.app_context():
        try:
            database_url = get_database_url()
            is_postgres = not database_url.startswith('sqlite')

            tables_to_migrate = {
                'users': {
                    'role': ('VARCHAR(50) DEFAULT \'student\'', 'TEXT DEFAULT \'student\''),
                    'is_admin': ('BOOLEAN DEFAULT FALSE', 'INTEGER DEFAULT 0'),
                    'status': ('VARCHAR(20) DEFAULT \'active\'', 'TEXT DEFAULT \'active\''),
                    'avatar_url': ('VARCHAR(500)', 'TEXT'),
                    'bio': ('TEXT', 'TEXT'),
                    'department_id': ('VARCHAR(36)', 'TEXT'),
                    'academic_year_id': ('VARCHAR(36)', 'TEXT'),
                    'school': ('VARCHAR(255)', 'TEXT'),
                    'course': ('VARCHAR(255)', 'TEXT'),
                    'year_level': ('VARCHAR(50)', 'TEXT'),
                    'archived': ('BOOLEAN DEFAULT FALSE', 'INTEGER DEFAULT 0'),
                },
                'contents': {
                    'file_data': ('BYTEA', 'BLOB'),
                    'document_summary_json': ('TEXT', 'TEXT'),
                    'sections_json': ('TEXT', 'TEXT'),
                    'learning_objectives_json': ('TEXT', 'TEXT'),
                    'discussion_topics_json': ('TEXT', 'TEXT'),
                    'important_terms_json': ('TEXT', 'TEXT'),
                    'faq_json': ('TEXT', 'TEXT'),
                    'concept_relationships_json': ('TEXT', 'TEXT'),
                    'difficulty_level': ('VARCHAR(20)', 'TEXT'),
                    'estimated_study_time': ('VARCHAR(50)', 'TEXT'),
                    'short_summary': ('TEXT', 'TEXT'),
                },
                'conversations': {
                    'topic': ('VARCHAR(255)', 'TEXT'),
                    'content_ids_json': ('TEXT', 'TEXT'),
                    'quiz_ids_json': ('TEXT', 'TEXT'),
                    'study_mode': ('VARCHAR(20)', 'TEXT'),
                },
                'quiz_results': {
                    'concept_scores_json': ('TEXT', 'TEXT'),
                    'question_types_json': ('TEXT', 'TEXT'),
                    'time_taken': ('INTEGER', 'INTEGER'),
                    'conversation_id': ('INTEGER', 'INTEGER'),
                    'is_archived': ('BOOLEAN DEFAULT FALSE', 'BOOLEAN DEFAULT 0'),
                },
                'quiz_data': {
                    'conversation_id': ('INTEGER', 'INTEGER'),
                    'is_archived': ('BOOLEAN DEFAULT FALSE', 'BOOLEAN DEFAULT 0'),
                },
                'class_enrollments': {
                    'midterm_grade': ('VARCHAR(20)', 'TEXT'),
                    'final_grade': ('VARCHAR(20)', 'TEXT'),
                    'remarks': ('VARCHAR(100)', 'TEXT'),
                    'units': ('FLOAT DEFAULT 3.0', 'REAL DEFAULT 3.0'),
                },
                'class_subjects': {
                    'units': ('FLOAT DEFAULT 3.0', 'REAL DEFAULT 3.0'),
                    'description': ('TEXT', 'TEXT'),
                },
                'class_schedules': {
                    'days': ('VARCHAR(100)', 'TEXT'),
                },
                'learning_materials': {
                    'period': ('VARCHAR(50) DEFAULT \'Prelim\'', 'TEXT DEFAULT \'Prelim\''),
                    'heading': ('VARCHAR(255)', 'TEXT'),
                    'section_order': ('INTEGER DEFAULT 1', 'INTEGER DEFAULT 1'),
                },
                'academic_quizzes': {
                    'period': ('VARCHAR(50) DEFAULT \'Prelim\'', 'TEXT DEFAULT \'Prelim\''),
                    'category': ('VARCHAR(20) DEFAULT \'quiz\'', 'TEXT DEFAULT \'quiz\''),
                    'due_date': ('TIMESTAMP', 'DATETIME'),
                    'allow_late_submission': ('BOOLEAN DEFAULT TRUE', 'INTEGER DEFAULT 1'),
                    'time_limit_minutes': ('INTEGER DEFAULT 0', 'INTEGER DEFAULT 0'),
                    'passing_score': ('FLOAT DEFAULT 75.0', 'REAL DEFAULT 75.0'),
                    'total_points': ('FLOAT DEFAULT 100.0', 'REAL DEFAULT 100.0'),
                    'instructions': ('TEXT', 'TEXT'),
                },
                'academic_quiz_assignments': {
                    'submission_file_url': ('VARCHAR(500)', 'TEXT'),
                    'submission_file_name': ('VARCHAR(255)', 'TEXT'),
                    'submission_text': ('TEXT', 'TEXT'),
                    'feedback': ('TEXT', 'TEXT'),
                    'graded_at': ('TIMESTAMP', 'DATETIME'),
                    'graded_by': ('VARCHAR(36)', 'TEXT'),
                    'retake_requested': ('BOOLEAN DEFAULT FALSE', 'INTEGER DEFAULT 0'),
                    'retake_granted': ('BOOLEAN DEFAULT FALSE', 'INTEGER DEFAULT 0'),
                    'attempts_count': ('INTEGER DEFAULT 1', 'INTEGER DEFAULT 1'),
                    'is_late': ('BOOLEAN DEFAULT FALSE', 'INTEGER DEFAULT 0'),
                    'submitted_at': ('TIMESTAMP', 'DATETIME'),
                }
            }

            with db.engine.connect() as conn:
                for table_name, columns in tables_to_migrate.items():
                    for col_name, (pg_type, sqlite_type) in columns.items():
                        col_type = pg_type if is_postgres else sqlite_type
                        try:
                            if is_postgres:
                                conn.execute(text(
                                    f'ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col_name} {col_type}'
                                ))
                            else:
                                conn.execute(text(
                                    f'ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}'
                                ))
                            conn.commit()
                        except Exception:
                            # Column already exists or table not ready, safely continue
                            pass

            app.logger.info('Database migrations checked successfully')
        except Exception as e:
            app.logger.warning(f"Migration runner warning (non-fatal): {e}")


def _ensure_default_admin(app):
    """
    Ensure the primary root administrator and default demo accounts exist in the database.
    Configurable via ADMIN_EMAIL and ADMIN_PASSWORD environment variables.
    """
    import bcrypt
    from app.models.user import User

    default_accounts = [
        {
            'email': os.environ.get('ADMIN_EMAIL', 'admin@knowrizon.ai').lower().strip(),
            'password': os.environ.get('ADMIN_PASSWORD', 'AdminPassword123!'),
            'name': os.environ.get('ADMIN_NAME', 'System Administrator'),
            'role': 'admin',
            'is_admin': True,
            'status': 'active'
        },
        {
            'email': 'student@example.com',
            'password': 'student123',
            'name': 'Alex Student',
            'role': 'student',
            'is_admin': False,
            'status': 'active'
        },
        {
            'email': 'demo@knowrizon.ai',
            'password': 'demo123',
            'name': 'Demo User',
            'role': 'student',
            'is_admin': False,
            'status': 'active'
        },
        {
            'email': 'teacher@example.com',
            'password': 'teacher123',
            'name': 'Dr. Sarah Teacher',
            'role': 'instructor',
            'is_admin': False,
            'status': 'active'
        },
        {
            'email': 'dean@knowrizon.ai',
            'password': 'dean123',
            'name': 'Dr. Arthur Dean',
            'role': 'dean',
            'is_admin': False,
            'status': 'active'
        }
    ]

    with app.app_context():
        for acc in default_accounts:
            try:
                user = User.query.filter_by(email=acc['email']).first()
                if not user:
                    pw_hash = bcrypt.hashpw(acc['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    user = User(
                        email=acc['email'],
                        name=acc['name'],
                        password_hash=pw_hash,
                        role=acc['role'],
                        is_admin=acc['is_admin'],
                        status=acc['status'],
                        is_anonymous=False
                    )
                    db.session.add(user)
                    db.session.commit()
                    app.logger.info(f"Default account created: {acc['email']}")
                else:
                    # Account already exists: respect existing password, role, and administrative decisions.
                    # Never overwrite passwords or undo role changes on application startup.
                    pass
            except Exception as e:
                db.session.rollback()
                app.logger.warning(f"Default account init warning for {acc['email']}: {e}")


def _ensure_academic_defaults(app):
    """
    Ensure the active Academic Year, Core Departments, Class Subjects,
    Schedules, Enrollments, and Learning Materials exist.
    """
    from app.models.academic import (
        AcademicYear, Department, ClassSubject, ClassSchedule, ClassEnrollment, LearningMaterial
    )
    from app.models.user import User

    with app.app_context():
        try:
            # 1. Ensure Active Academic Year exists
            ay = AcademicYear.query.filter_by(year_string='AY 26-27').first()
            if not ay:
                # Deactivate others if any
                AcademicYear.query.update({'is_active': False})
                ay = AcademicYear(
                    year_string='AY 26-27',
                    is_active=True,
                    archived=False
                )
                db.session.add(ay)
                db.session.commit()
                app.logger.info("Default Academic Year 'AY 26-27' initialized.")
            elif not ay.is_active and not AcademicYear.query.filter_by(is_active=True).first():
                ay.is_active = True
                db.session.commit()

            dean_user = User.query.filter_by(email='dean@knowrizon.ai').first()
            teacher_user = User.query.filter_by(email='teacher@example.com').first()
            student_user = User.query.filter_by(email='student@example.com').first()

            # 2. Ensure Departments exist
            depts_spec = [
                ('College of Accountancy', 'COA', dean_user.id if dean_user else None),
                ('College of Computer Studies', 'CCS', None),
                ('College of Nursing', 'CON', None),
                ('College of Engineering', 'COE', None),
            ]

            created_depts = {}
            for d_name, d_code, d_dean in depts_spec:
                dept = Department.query.filter_by(name=d_name, academic_year_id=ay.id).first()
                if not dept:
                    dept = Department(
                        name=d_name,
                        code=d_code,
                        academic_year_id=ay.id,
                        dean_id=d_dean,
                        archived=False
                    )
                    db.session.add(dept)
                    db.session.commit()
                else:
                    if d_dean and not dept.dean_id:
                        dept.dean_id = d_dean
                        db.session.commit()
                created_depts[d_code] = dept

            # Attach dean to department
            if dean_user and 'COA' in created_depts:
                dean_user.department_id = created_depts['COA'].id
                dean_user.academic_year_id = ay.id
                if not created_depts['COA'].dean_id:
                    created_depts['COA'].dean_id = dean_user.id
                db.session.commit()

            # Attach teacher to CCS
            if teacher_user and 'CCS' in created_depts:
                teacher_user.department_id = created_depts['CCS'].id
                teacher_user.academic_year_id = ay.id
                db.session.commit()

            # Attach student to CCS
            if student_user and 'CCS' in created_depts:
                student_user.department_id = created_depts['CCS'].id
                student_user.academic_year_id = ay.id
                db.session.commit()

            # 3. Ensure Class Subjects exist across 1st, 2nd, 3rd, 4th Year Levels
            ccs_dept = created_depts.get('CCS')
            coa_dept = created_depts.get('COA')

            subjects_spec = [
                ('Introduction to Computing & Logic', 'CS 101', '1st', ccs_dept.id if ccs_dept else None, teacher_user.id if teacher_user else None),
                ('Data Structures & Algorithms', 'DSA 201', '2nd', ccs_dept.id if ccs_dept else None, teacher_user.id if teacher_user else None),
                ('Integrative Programming & Technologies', 'IPT 301', '3rd', ccs_dept.id if ccs_dept else None, teacher_user.id if teacher_user else None),
                ('Capstone Project & Systems Architecture', 'CAP 401', '4th', ccs_dept.id if ccs_dept else None, teacher_user.id if teacher_user else None),
                ('Financial Accounting & Reporting', 'FAR 101', '1st', coa_dept.id if coa_dept else None, teacher_user.id if teacher_user else None),
                ('Intermediate Accounting I', 'ACT 201', '2nd', coa_dept.id if coa_dept else None, teacher_user.id if teacher_user else None),
                ('Strategic Business Taxation', 'TAX 301', '3rd', coa_dept.id if coa_dept else None, teacher_user.id if teacher_user else None),
                ('Advanced Auditing & Assurance', 'AUD 401', '4th', coa_dept.id if coa_dept else None, teacher_user.id if teacher_user else None),
            ]

            created_subjects = {}
            for s_name, s_code, s_yr, s_dept, s_inst in subjects_spec:
                if not s_dept:
                    continue
                subj = ClassSubject.query.filter_by(name=s_name, academic_year_id=ay.id).first()
                if not subj:
                    subj = ClassSubject(
                        name=s_name,
                        code=s_code,
                        year_level=s_yr,
                        department_id=s_dept,
                        instructor_id=s_inst,
                        academic_year_id=ay.id,
                        archived=False
                    )
                    db.session.add(subj)
                    db.session.commit()
                else:
                    if s_inst and not subj.instructor_id:
                        subj.instructor_id = s_inst
                        db.session.commit()
                created_subjects[s_name] = subj

            # 4. Ensure Schedules exist
            ipt_subj = created_subjects.get('Integrative Programming & Technologies')
            if ipt_subj:
                sched = ClassSchedule.query.filter_by(subject_id=ipt_subj.id, archived=False).first()
                if not sched:
                    sched = ClassSchedule(
                        subject_id=ipt_subj.id,
                        instructor_id=ipt_subj.instructor_id,
                        time_slot='MWF 9:00 AM - 10:30 AM',
                        classroom='Room 402 / Virtual Studio',
                        academic_year_id=ay.id,
                        archived=False
                    )
                    db.session.add(sched)
                    db.session.commit()

            dsa_subj = created_subjects.get('Data Structures & Algorithms')
            if dsa_subj:
                sched = ClassSchedule.query.filter_by(subject_id=dsa_subj.id, archived=False).first()
                if not sched:
                    sched = ClassSchedule(
                        subject_id=dsa_subj.id,
                        instructor_id=dsa_subj.instructor_id,
                        time_slot='TTh 1:00 PM - 2:30 PM',
                        classroom='Lab 3 / Main Wing',
                        academic_year_id=ay.id,
                        archived=False
                    )
                    db.session.add(sched)
                    db.session.commit()

            # 5. Ensure Student Enrollments exist
            if student_user and ipt_subj:
                enroll = ClassEnrollment.query.filter_by(student_id=student_user.id, subject_id=ipt_subj.id, archived=False).first()
                if not enroll:
                    enroll = ClassEnrollment(
                        student_id=student_user.id,
                        subject_id=ipt_subj.id,
                        grade='1.25',
                        status='enrolled',
                        academic_year_id=ay.id,
                        archived=False
                    )
                    db.session.add(enroll)
                    db.session.commit()

            if student_user and dsa_subj:
                enroll = ClassEnrollment.query.filter_by(student_id=student_user.id, subject_id=dsa_subj.id, archived=False).first()
                if not enroll:
                    enroll = ClassEnrollment(
                        student_id=student_user.id,
                        subject_id=dsa_subj.id,
                        grade='1.50',
                        status='enrolled',
                        academic_year_id=ay.id,
                        archived=False
                    )
                    db.session.add(enroll)
                    db.session.commit()

            # 6. Ensure sample Learning Materials exist
            if ipt_subj and teacher_user:
                mat = LearningMaterial.query.filter_by(subject_id=ipt_subj.id, archived=False).first()
                if not mat:
                    sample_content = (
                        "Integrative Programming & Technologies Syllabus\n\n"
                        "Overview:\n"
                        "This course explores distributed system architectures, RESTful API design, "
                        "WebSocket event streaming, asynchronous concurrency, and secure role-based access control. "
                        "Students learn to integrate heterogeneous microservices using modern API contracts.\n\n"
                        "Core Modules:\n"
                        "1. Client-Server Architecture & Stateless HTTP\n"
                        "2. Token-Based Authentication (JWT / Bearer Tokens) and RBAC Segregation\n"
                        "3. Realtime Messaging & Event Brokers (WebSockets / Pusher)\n"
                        "4. Relational Database Modeling and Cascade Lifecycle Management\n"
                    )
                    mat = LearningMaterial(
                        subject_id=ipt_subj.id,
                        instructor_id=teacher_user.id,
                        title='Module 1: Distributed Architectures & RBAC Contracts.pdf',
                        file_url='/materials/ipt301-module1.pdf',
                        file_type='pdf',
                        content_text=sample_content,
                        academic_year_id=ay.id,
                        archived=False
                    )
                    db.session.add(mat)
                    db.session.commit()

            far_subj = created_subjects.get('Financial Accounting & Reporting')
            if far_subj:
                far_sched = ClassSchedule.query.filter_by(subject_id=far_subj.id, archived=False).first()
                if not far_sched:
                    far_sched = ClassSchedule(
                        subject_id=far_subj.id,
                        instructor_id=teacher_user.id if teacher_user else None,
                        time_slot='MWF 9:00 AM - 10:30 AM',
                        classroom='Business Hall 101',
                        academic_year_id=ay.id,
                        archived=False
                    )
                    db.session.add(far_sched)
                    db.session.commit()

                if student_user:
                    far_enroll = ClassEnrollment.query.filter_by(student_id=student_user.id, subject_id=far_subj.id, archived=False).first()
                    if not far_enroll:
                        far_enroll = ClassEnrollment(
                            student_id=student_user.id,
                            subject_id=far_subj.id,
                            grade='1.75',
                            status='enrolled',
                            academic_year_id=ay.id,
                            archived=False
                        )
                        db.session.add(far_enroll)
                        db.session.commit()

                if teacher_user:
                    far_mat = LearningMaterial.query.filter_by(subject_id=far_subj.id, archived=False).first()
                    if not far_mat:
                        far_content = (
                            "Financial Accounting & Reporting (FAR 101)\n\n"
                            "Conceptual Framework & General Purpose Financial Reporting:\n"
                            "1. Objectives of Financial Reporting: Providing financial information about the reporting entity "
                            "that is useful to existing and potential investors, lenders, and other creditors in making decisions.\n"
                            "2. Fundamental Qualitative Characteristics: Relevance and Faithful Representation.\n"
                            "3. Enhancing Qualitative Characteristics: Comparability, Verifiability, Timeliness, and Understandability.\n"
                            "4. Elements of Financial Statements: Assets, Liabilities, Equity, Income, and Expenses.\n"
                            "5. Recognition & Measurement: Historical Cost vs Current Value (Fair Value, Value in Use).\n"
                        )
                        far_mat = LearningMaterial(
                            subject_id=far_subj.id,
                            instructor_id=teacher_user.id,
                            title='FAR Module 1: Conceptual Framework & Financial Statements.pdf',
                            file_url='/materials/far101-module1.pdf',
                            file_type='pdf',
                            content_text=far_content,
                            academic_year_id=ay.id,
                            archived=False
                        )
                        db.session.add(far_mat)
                        db.session.commit()

        except Exception as e:
            db.session.rollback()
            app.logger.warning(f"Error seeding academic ecosystem defaults: {e}")
