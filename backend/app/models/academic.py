"""
Academic Ecosystem Models for Knowrizon AI.

Defines the relational academic hierarchy:
AcademicYear -> Department -> ClassSubject -> ClassSchedule, ClassEnrollment, LearningMaterial.
Supports deep relational persistence, archiving, and academic year rollover auditing.
"""
import uuid
from datetime import datetime
from typing import Optional, Dict, Any

from app.database import db


class AcademicYear(db.Model):
    """
    Academic Year model representing institutional terms (e.g., 'AY 26-27').
    Only one academic year is active at any given time.
    """
    __tablename__ = 'academic_years'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    year_string = db.Column(db.String(50), unique=True, nullable=False)  # e.g., 'AY 26-27'
    is_active = db.Column(db.Boolean, default=False, nullable=False)
    archived = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    departments = db.relationship('Department', backref='academic_year', lazy='dynamic', cascade='all, delete-orphan')
    subjects = db.relationship('ClassSubject', backref='academic_year', lazy='dynamic', cascade='all, delete-orphan')
    enrollments = db.relationship('ClassEnrollment', backref='academic_year', lazy='dynamic', cascade='all, delete-orphan')
    materials = db.relationship('LearningMaterial', backref='academic_year', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'year_string': self.year_string,
            'yearString': self.year_string,
            'is_active': self.is_active,
            'isActive': self.is_active,
            'archived': self.archived,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Department(db.Model):
    """
    Department / College model (e.g., 'College of Accountancy', 'College of Computer Studies').
    Assigned to an Academic Year and governed by an assigned Dean (User with role='dean').
    """
    __tablename__ = 'departments'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)  # e.g., 'College of Accountancy'
    code = db.Column(db.String(50), nullable=True)   # e.g., 'COA'
    academic_year_id = db.Column(db.String(36), db.ForeignKey('academic_years.id', ondelete='CASCADE'), nullable=True)
    dean_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    archived = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    dean = db.relationship('User', foreign_keys=[dean_id], backref='headed_department', lazy='joined')
    subjects = db.relationship('ClassSubject', backref='department', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'academic_year_id': self.academic_year_id,
            'academicYearId': self.academic_year_id,
            'dean_id': self.dean_id,
            'deanId': self.dean_id,
            'dean': {
                'id': self.dean.id,
                'name': self.dean.name,
                'email': self.dean.email
            } if self.dean else None,
            'archived': self.archived,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ClassSubject(db.Model):
    """
    Class / Subject model (e.g., 'Financial Accounting 101').
    Belongs to a Department and Academic Year, assigned to an Instructor.
    """
    __tablename__ = 'class_subjects'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    department_id = db.Column(db.String(36), db.ForeignKey('departments.id', ondelete='CASCADE'), nullable=True)
    name = db.Column(db.String(255), nullable=False)  # e.g., 'Financial Accounting 101'
    code = db.Column(db.String(50), nullable=True)   # e.g., 'ACT 101'
    year_level = db.Column(db.String(20), default='1st', nullable=False)  # '1st', '2nd', '3rd', '4th'
    academic_year_id = db.Column(db.String(36), db.ForeignKey('academic_years.id', ondelete='CASCADE'), nullable=True)
    instructor_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    units = db.Column(db.Float, default=3.0, nullable=True)
    description = db.Column(db.Text, nullable=True)
    archived = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    instructor = db.relationship('User', foreign_keys=[instructor_id], backref='taught_subjects', lazy='joined')
    schedules = db.relationship('ClassSchedule', backref='subject', lazy='dynamic', cascade='all, delete-orphan')
    enrollments = db.relationship('ClassEnrollment', backref='subject', lazy='dynamic', cascade='all, delete-orphan')
    materials = db.relationship('LearningMaterial', backref='subject', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self) -> Dict[str, Any]:
        active_schedule = self.schedules.filter_by(archived=False).first()
        return {
            'id': self.id,
            'department_id': self.department_id,
            'departmentId': self.department_id,
            'department_name': self.department.name if self.department else None,
            'name': self.name,
            'code': self.code,
            'year_level': self.year_level,
            'yearLevel': self.year_level,
            'units': getattr(self, 'units', 3.0) or 3.0,
            'description': getattr(self, 'description', None),
            'academic_year_id': self.academic_year_id,
            'academicYearId': self.academic_year_id,
            'instructor_id': self.instructor_id,
            'instructorId': self.instructor_id,
            'instructor': {
                'id': self.instructor.id,
                'name': self.instructor.name,
                'email': self.instructor.email
            } if self.instructor else None,
            'schedule': active_schedule.to_dict() if active_schedule else None,
            'enrolled_count': self.enrollments.filter_by(archived=False).count(),
            'materials_count': self.materials.filter_by(archived=False).count(),
            'archived': self.archived,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ClassSchedule(db.Model):
    """
    Class Schedule model defining timing and classroom location for a subject.
    """
    __tablename__ = 'class_schedules'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_id = db.Column(db.String(36), db.ForeignKey('class_subjects.id', ondelete='CASCADE'), nullable=False)
    instructor_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    time_slot = db.Column(db.String(100), nullable=False)  # e.g., 'MWF 9:00 AM - 10:30 AM'
    classroom = db.Column(db.String(100), nullable=False)  # e.g., 'Room 402 / Virtual Studio'
    days = db.Column(db.String(100), nullable=True)        # e.g., 'Monday, Wednesday, Friday'
    academic_year_id = db.Column(db.String(36), db.ForeignKey('academic_years.id', ondelete='CASCADE'), nullable=True)
    archived = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    instructor = db.relationship('User', foreign_keys=[instructor_id], lazy='joined')

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'subject_id': self.subject_id,
            'subjectId': self.subject_id,
            'instructor_id': self.instructor_id,
            'instructorId': self.instructor_id,
            'time_slot': self.time_slot,
            'timeSlot': self.time_slot,
            'classroom': self.classroom,
            'days': getattr(self, 'days', None),
            'academic_year_id': self.academic_year_id,
            'archived': self.archived,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ClassEnrollment(db.Model):
    """
    Class Enrollment junction table associating Students with Class Subjects.
    Supports grading, completion status, and archiving.
    """
    __tablename__ = 'class_enrollments'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    subject_id = db.Column(db.String(36), db.ForeignKey('class_subjects.id', ondelete='CASCADE'), nullable=False)
    grade = db.Column(db.String(20), nullable=True)        # e.g., '1.25', '94.5', 'A'
    midterm_grade = db.Column(db.String(20), nullable=True) # e.g., '1.50', '89'
    final_grade = db.Column(db.String(20), nullable=True)   # e.g., '1.25', '94'
    remarks = db.Column(db.String(100), nullable=True)      # e.g., 'Passed', 'In Progress'
    units = db.Column(db.Float, default=3.0, nullable=True)
    status = db.Column(db.String(20), default='enrolled', nullable=False)  # 'enrolled', 'completed', 'dropped'
    academic_year_id = db.Column(db.String(36), db.ForeignKey('academic_years.id', ondelete='CASCADE'), nullable=True)
    archived = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    student = db.relationship('User', foreign_keys=[student_id], lazy='joined')

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'student_id': self.student_id,
            'studentId': self.student_id,
            'student': {
                'id': self.student.id,
                'name': self.student.name,
                'email': self.student.email
            } if self.student else None,
            'subject_id': self.subject_id,
            'subjectId': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'subject_code': self.subject.code if self.subject else None,
            'grade': self.grade,
            'midterm_grade': getattr(self, 'midterm_grade', None),
            'midtermGrade': getattr(self, 'midterm_grade', None),
            'final_grade': getattr(self, 'final_grade', None),
            'finalGrade': getattr(self, 'final_grade', None),
            'remarks': getattr(self, 'remarks', None) or ('Passed' if self.grade and self.grade in ['A', '1.0', '1.25', '1.5', '1.75', '2.0', '2.25', '2.5'] else ('In Progress' if not self.grade else 'Completed')),
            'units': getattr(self, 'units', 3.0) or 3.0,
            'status': self.status,
            'academic_year_id': self.academic_year_id,
            'archived': self.archived,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class LearningMaterial(db.Model):
    """
    Learning Material uploaded by Instructors for specific Class Subjects.
    Extracted text is directly indexed for Knowri AI Socratic Tutor context injection.
    """
    __tablename__ = 'learning_materials'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_id = db.Column(db.String(36), db.ForeignKey('class_subjects.id', ondelete='CASCADE'), nullable=False)
    instructor_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    title = db.Column(db.String(255), nullable=False)
    file_url = db.Column(db.String(500), nullable=True)
    file_type = db.Column(db.String(50), default='pdf', nullable=False)  # 'pdf', 'docx', 'pptx', 'text'
    content_text = db.Column(db.Text, nullable=True)                     # Extracted text for AI Tutor
    period = db.Column(db.String(50), default='Prelim', nullable=True)   # 'Prelim', 'Midterm', 'Semi-Finals', 'Finals'
    heading = db.Column(db.String(255), nullable=True)                  # AI-generated topic heading
    section_order = db.Column(db.Integer, default=1, nullable=True)
    academic_year_id = db.Column(db.String(36), db.ForeignKey('academic_years.id', ondelete='CASCADE'), nullable=True)
    archived = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    instructor = db.relationship('User', foreign_keys=[instructor_id], lazy='joined')

    def to_dict(self, include_content: bool = True) -> Dict[str, Any]:
        data = {
            'id': self.id,
            'subject_id': self.subject_id,
            'subjectId': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'subject_code': self.subject.code if self.subject else None,
            'instructor_id': self.instructor_id,
            'instructorId': self.instructor_id,
            'instructor_name': self.instructor.name if self.instructor else None,
            'title': self.title,
            'file_url': self.file_url,
            'fileUrl': self.file_url,
            'file_type': self.file_type,
            'fileType': self.file_type,
            'content_length': len(self.content_text) if self.content_text else 0,
            'period': self.period or 'Prelim',
            'heading': self.heading or 'Course Learning Materials',
            'section_order': self.section_order or 1,
            'academic_year_id': self.academic_year_id,
            'archived': self.archived,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_content:
            data['content_text'] = self.content_text
        return data



class AcademicQuiz(db.Model):
    """
    Academic Quiz created by Faculty based on uploaded Learning Materials and assigned to Students.
    """
    __tablename__ = 'academic_quizzes'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_id = db.Column(db.String(36), db.ForeignKey('class_subjects.id', ondelete='CASCADE'), nullable=False)
    instructor_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    material_id = db.Column(db.String(36), db.ForeignKey('learning_materials.id', ondelete='SET NULL'), nullable=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    quiz_type = db.Column(db.String(50), default='multiple_choice', nullable=False)
    questions_json = db.Column(db.Text, nullable=False)  # JSON-encoded array of questions
    period = db.Column(db.String(50), default='Prelim', nullable=True)   # 'Prelim', 'Midterm', 'Semi-Finals', 'Finals'
    category = db.Column(db.String(20), default='quiz', nullable=True)   # 'quiz' or 'exam'
    due_date = db.Column(db.DateTime, nullable=True)
    allow_late_submission = db.Column(db.Boolean, default=True, nullable=True)
    time_limit_minutes = db.Column(db.Integer, default=0, nullable=True) # 0 = no time limit
    passing_score = db.Column(db.Float, default=75.0, nullable=True)
    total_points = db.Column(db.Float, default=100.0, nullable=True)
    instructions = db.Column(db.Text, nullable=True)
    academic_year_id = db.Column(db.String(36), db.ForeignKey('academic_years.id', ondelete='CASCADE'), nullable=True)
    archived = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    subject = db.relationship('ClassSubject', backref='quizzes', lazy='joined')
    instructor = db.relationship('User', foreign_keys=[instructor_id], lazy='joined')
    material = db.relationship('LearningMaterial', foreign_keys=[material_id], lazy='joined')
    assignments = db.relationship('AcademicQuizAssignment', backref='quiz', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_questions: bool = True) -> Dict[str, Any]:
        import json
        questions = []
        if include_questions and self.questions_json:
            try:
                questions = json.loads(self.questions_json)
            except Exception:
                questions = []

        total_assigned = self.assignments.count()
        total_completed = self.assignments.filter_by(status='completed').count()

        return {
            'id': self.id,
            'subject_id': self.subject_id,
            'subject_code': self.subject.code if self.subject else None,
            'subject_name': self.subject.name if self.subject else None,
            'instructor_id': self.instructor_id,
            'instructor_name': self.instructor.name if self.instructor else None,
            'material_id': self.material_id,
            'material_title': self.material.title if self.material else None,
            'title': self.title,
            'description': self.description,
            'quiz_type': self.quiz_type,
            'category': self.category or 'quiz',
            'period': self.period or 'Prelim',
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'allow_late_submission': True if self.allow_late_submission is None else bool(self.allow_late_submission),
            'time_limit_minutes': self.time_limit_minutes or 0,
            'passing_score': self.passing_score if self.passing_score is not None else 75.0,
            'total_points': self.total_points or 100.0,
            'instructions': self.instructions or self.description,
            'question_count': len(questions) if questions else 0,
            'questions': questions if include_questions else [],
            'total_assigned': total_assigned,
            'total_completed': total_completed,
            'academic_year_id': self.academic_year_id,
            'archived': self.archived,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class AcademicQuizAssignment(db.Model):
    """
    Association between a published AcademicQuiz and an enrolled Student.
    Tracks assignment state, attempts, score, and completion timestamp.
    """
    __tablename__ = 'academic_quiz_assignments'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quiz_id = db.Column(db.String(36), db.ForeignKey('academic_quizzes.id', ondelete='CASCADE'), nullable=False)
    student_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.String(20), default='pending', nullable=False)  # 'pending', 'submitted', 'completed'
    score = db.Column(db.Float, nullable=True)
    total_questions = db.Column(db.Integer, nullable=True)
    answers_json = db.Column(db.Text, nullable=True)
    submission_file_url = db.Column(db.String(500), nullable=True)
    submission_file_name = db.Column(db.String(255), nullable=True)
    submission_text = db.Column(db.Text, nullable=True)
    feedback = db.Column(db.Text, nullable=True)
    graded_at = db.Column(db.DateTime, nullable=True)
    graded_by = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    retake_requested = db.Column(db.Boolean, default=False, nullable=True)
    retake_granted = db.Column(db.Boolean, default=False, nullable=True)
    attempts_count = db.Column(db.Integer, default=1, nullable=True)
    is_late = db.Column(db.Boolean, default=False, nullable=True)
    submitted_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    student = db.relationship('User', foreign_keys=[student_id], lazy='joined')

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'quiz_id': self.quiz_id,
            'quiz_title': self.quiz.title if self.quiz else None,
            'subject_name': self.quiz.subject.name if self.quiz and self.quiz.subject else None,
            'subject_code': self.quiz.subject.code if self.quiz and self.quiz.subject else None,
            'student_id': self.student_id,
            'student_name': self.student.name if self.student else None,
            'student_email': self.student.email if self.student else None,
            'status': self.status,
            'score': self.score,
            'total_questions': self.total_questions,
            'submission_file_url': self.submission_file_url,
            'submission_file_name': self.submission_file_name,
            'submission_text': self.submission_text,
            'feedback': self.feedback,
            'graded_at': self.graded_at.isoformat() if self.graded_at else None,
            'graded_by': self.graded_by,
            'quiz_type': self.quiz.quiz_type if self.quiz else 'multiple_choice',
            'category': getattr(self.quiz, 'category', 'quiz') if self.quiz else 'quiz',
            'period': self.quiz.period if self.quiz else 'Prelim',
            'due_date': self.quiz.due_date.isoformat() if self.quiz and self.quiz.due_date else None,
            'time_limit_minutes': getattr(self.quiz, 'time_limit_minutes', 0) if self.quiz else 0,
            'allow_late_submission': bool(getattr(self.quiz, 'allow_late_submission', True)) if self.quiz else True,
            'passing_score': getattr(self.quiz, 'passing_score', 75.0) if self.quiz else 75.0,
            'retake_requested': bool(self.retake_requested),
            'retake_granted': bool(self.retake_granted),
            'attempts_count': self.attempts_count or 1,
            'is_late': bool(self.is_late),
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else (self.completed_at.isoformat() if self.completed_at else None),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
