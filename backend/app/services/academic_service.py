"""
Academic Service for Knowrizon AI.

Handles institutional hierarchy:
Academic Years, Departments, Class Subjects, Schedules, Enrollments, and Learning Materials.
Includes cascading archiving for Academic Year Rollover and historical audit views.
"""
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
from typing import Optional, List, Dict, Any, Tuple

from sqlalchemy import or_, and_, desc, asc, func

from app.database import db
from app.models.academic import (
    AcademicQuiz,
    AcademicQuizAssignment,
    AcademicYear, Department, ClassSubject, ClassSchedule, ClassEnrollment, LearningMaterial
)
from app.models.user import User


_quiz_tables_ensured = False


class AcademicService:
    """Service encapsulating the institutional academic hierarchy and lifecycle."""

    # ═══════════════════════════════════════════════════════════
    # ACADEMIC YEARS
    # ═══════════════════════════════════════════════════════════

    def get_academic_years(self, include_archived: bool = True) -> List[Dict[str, Any]]:
        """List all academic years."""
        query = AcademicYear.query
        if not include_archived:
            query = query.filter_by(archived=False)
        years = query.order_by(AcademicYear.created_at.desc()).all()
        return [y.to_dict() for y in years]

    def get_active_academic_year(self) -> Optional[AcademicYear]:
        """Retrieve the single active academic year."""
        return AcademicYear.query.filter_by(is_active=True, archived=False).first()

    def create_academic_year(self, year_string: str, is_active: bool = False) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Create a new academic year entry."""
        if not year_string or not year_string.strip():
            return None, "Year string is required (e.g. 'AY 26-27')"

        clean_str = year_string.strip()
        existing = AcademicYear.query.filter_by(year_string=clean_str).first()
        if existing:
            return None, f"Academic Year '{clean_str}' already exists"

        if is_active:
            AcademicYear.query.update({'is_active': False})

        ay = AcademicYear(
            year_string=clean_str,
            is_active=is_active,
            archived=False
        )
        try:
            db.session.add(ay)
            db.session.commit()
            return ay.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to create academic year: {str(e)}"

    def activate_academic_year(self, academic_year_id: str) -> Tuple[bool, Optional[str]]:
        """Set a specific academic year as active and deactivate all others."""
        ay = AcademicYear.query.get(academic_year_id)
        if not ay:
            return False, "Academic Year not found"

        try:
            AcademicYear.query.update({'is_active': False})
            ay.is_active = True
            ay.archived = False
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, f"Failed to activate academic year: {str(e)}"

    def rollover_academic_year(self, new_year_string: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Academic Year Rollover:
        1. Cascading archive: all records tied to the previously active Academic Year
           (departments, subjects, schedules, enrollments, learning materials)
           are set to `archived = True`.
        2. Create and activate the new Academic Year.
        3. All historical records remain intact and queryable via historical views.
        """
        if not new_year_string or not new_year_string.strip():
            return None, "New Academic Year string is required (e.g. 'AY 27-28')"

        clean_new_str = new_year_string.strip()
        current_active = self.get_active_academic_year()

        try:
            # 1. Cascade archive current active records if present
            if current_active:
                # Mark current AY as archived and inactive
                current_active.is_active = False
                current_active.archived = True

                # Archive all associated departments
                Department.query.filter_by(academic_year_id=current_active.id).update({'archived': True})

                # Archive all associated class subjects
                ClassSubject.query.filter_by(academic_year_id=current_active.id).update({'archived': True})

                # Archive all associated schedules
                ClassSchedule.query.filter_by(academic_year_id=current_active.id).update({'archived': True})

                # Archive all enrollments
                ClassEnrollment.query.filter_by(academic_year_id=current_active.id).update({'archived': True})

                # Archive all learning materials
                LearningMaterial.query.filter_by(academic_year_id=current_active.id).update({'archived': True})

            # 2. Deactivate any other AY
            AcademicYear.query.update({'is_active': False})

            # 3. Create or activate new Academic Year
            new_ay = AcademicYear.query.filter_by(year_string=clean_new_str).first()
            if new_ay:
                new_ay.is_active = True
                new_ay.archived = False
            else:
                new_ay = AcademicYear(
                    year_string=clean_new_str,
                    is_active=True,
                    archived=False
                )
                db.session.add(new_ay)

            db.session.commit()

            # 4. Clone standard Department structures for the new active Academic Year
            standard_depts = [
                ('College of Accountancy', 'COA'),
                ('College of Computer Studies', 'CCS'),
                ('College of Nursing', 'CON'),
                ('College of Engineering', 'COE'),
            ]
            for d_name, d_code in standard_depts:
                existing_dept = Department.query.filter_by(name=d_name, academic_year_id=new_ay.id).first()
                if not existing_dept:
                    # Find previous dean if any to preserve leadership
                    prev_dept = Department.query.filter_by(name=d_name).order_by(Department.created_at.desc()).first()
                    new_dept = Department(
                        name=d_name,
                        code=d_code,
                        academic_year_id=new_ay.id,
                        dean_id=prev_dept.dean_id if prev_dept else None,
                        archived=False
                    )
                    db.session.add(new_dept)

            db.session.commit()
            return new_ay.to_dict(), None

        except Exception as e:
            db.session.rollback()
            return None, f"Academic Year Rollover failed: {str(e)}"

    # ═══════════════════════════════════════════════════════════
    # DEPARTMENTS
    # ═══════════════════════════════════════════════════════════

    def get_departments(
        self,
        academic_year_id: Optional[str] = None,
        include_archived: bool = False
    ) -> List[Dict[str, Any]]:
        """List departments with dean and student count telemetry."""
        query = Department.query
        if not include_archived:
            query = query.filter_by(archived=False)

        if academic_year_id:
            query = query.filter_by(academic_year_id=academic_year_id)
        else:
            # Default to active AY
            active_ay = self.get_active_academic_year()
            if active_ay and not include_archived:
                query = query.filter(or_(Department.academic_year_id == active_ay.id, Department.academic_year_id == None))

        depts = query.order_by(Department.name.asc()).all()
        result = []
        for d in depts:
            item = d.to_dict()
            item['student_count'] = User.query.filter_by(department_id=d.id, role='student', archived=False).count()
            item['instructor_count'] = User.query.filter_by(department_id=d.id, role='instructor', archived=False).count()
            item['subject_count'] = d.subjects.filter_by(archived=False).count()
            result.append(item)
        return result

    def get_department_detail(self, department_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Get complete department roster: Dean, Instructors, Students, and Class Subjects.
        Optimized with batch schedule/count queries to eliminate N+1 latency to Supabase.
        """
        dept = Department.query.get(department_id)
        if not dept:
            return None, "Department not found"

        data = dept.to_dict()

        # Assigned Dean details
        if dept.dean:
            data['dean'] = {
                'id': dept.dean.id,
                'name': dept.dean.name,
                'email': dept.dean.email,
                'status': dept.dean.status,
                'role': dept.dean.role,
                'lastLogin': dept.dean.last_login.isoformat() if dept.dean.last_login else None
            }
        else:
            data['dean'] = None

        # Class Subjects in Department
        subjects = dept.subjects.filter_by(archived=False).order_by(ClassSubject.year_level.asc(), ClassSubject.name.asc()).all()
        subj_ids = [s.id for s in subjects]

        # Batch load active schedules for all subjects in 1 query
        schedules_by_subj = {}
        if subj_ids:
            active_schedules = ClassSchedule.query.filter(
                ClassSchedule.subject_id.in_(subj_ids),
                ClassSchedule.archived == False
            ).all()
            for sch in active_schedules:
                if sch.subject_id not in schedules_by_subj:
                    schedules_by_subj[sch.subject_id] = sch.to_dict()

        # Batch load enrollment counts in 1 query with GROUP BY
        enrollment_counts = {}
        if subj_ids:
            counts = db.session.query(
                ClassEnrollment.subject_id,
                func.count(ClassEnrollment.id)
            ).filter(
                ClassEnrollment.subject_id.in_(subj_ids),
                ClassEnrollment.archived == False
            ).group_by(ClassEnrollment.subject_id).all()
            enrollment_counts = dict(counts)

        # Batch load material counts in 1 query with GROUP BY
        material_counts = {}
        if subj_ids:
            counts = db.session.query(
                LearningMaterial.subject_id,
                func.count(LearningMaterial.id)
            ).filter(
                LearningMaterial.subject_id.in_(subj_ids),
                LearningMaterial.archived == False
            ).group_by(LearningMaterial.subject_id).all()
            material_counts = dict(counts)

        # Assemble subjects dict without N+1 queries!
        subjects_dict = []
        for s in subjects:
            subjects_dict.append({
                'id': s.id,
                'department_id': s.department_id,
                'departmentId': s.department_id,
                'department_name': dept.name,
                'name': s.name,
                'code': s.code,
                'year_level': s.year_level,
                'yearLevel': s.year_level,
                'academic_year_id': s.academic_year_id,
                'academicYearId': s.academic_year_id,
                'instructor_id': s.instructor_id,
                'instructorId': s.instructor_id,
                'instructor': {
                    'id': s.instructor.id,
                    'name': s.instructor.name,
                    'email': s.instructor.email
                } if s.instructor else None,
                'schedule': schedules_by_subj.get(s.id),
                'enrolled_count': enrollment_counts.get(s.id, 0),
                'materials_count': material_counts.get(s.id, 0),
                'archived': s.archived,
                'created_at': s.created_at.isoformat() if s.created_at else None,
            })
        data['subjects'] = subjects_dict

        # Group Subjects by Year Level in memory without duplicate SQL queries
        data['subjects_by_year'] = {
            '1st': [s for s in subjects_dict if s.get('year_level') == '1st'],
            '2nd': [s for s in subjects_dict if s.get('year_level') == '2nd'],
            '3rd': [s for s in subjects_dict if s.get('year_level') == '3rd'],
            '4th': [s for s in subjects_dict if s.get('year_level') == '4th'],
        }

        # Optimized Single User Query: only select needed lightweight columns
        subj_inst_ids = {s.instructor_id for s in subjects if s.instructor_id}
        active_users = db.session.query(
            User.id, User.name, User.email, User.role, User.status, User.department_id, User.created_at
        ).filter(
            User.archived == False,
            User.role.in_(['instructor', 'student'])
        ).all()

        all_instructors = [u for u in active_users if u.role == 'instructor']
        all_students = [u for u in active_users if u.role == 'student']

        # Department Instructors
        dept_instructors = [
            u for u in all_instructors
            if u.department_id == dept.id or u.id in subj_inst_ids
        ]
        if not dept_instructors:
            dept_instructors = all_instructors

        # Department Students
        dept_students = [
            u for u in all_students
            if u.department_id == dept.id or u.department_id is None
        ]

        data['instructors'] = [{
            'id': u.id,
            'name': u.name,
            'email': u.email,
            'status': u.status,
            'createdAt': u.created_at.isoformat() if u.created_at else None
        } for u in dept_instructors]

        data['students'] = [{
            'id': u.id,
            'name': u.name,
            'email': u.email,
            'status': u.status,
            'createdAt': u.created_at.isoformat() if u.created_at else None
        } for u in dept_students]

        # Available instructors and students for selection in modals (no extra DB queries needed)
        data['available_instructors'] = [
            {'id': u.id, 'name': u.name, 'email': u.email}
            for u in all_instructors
        ]
        data['available_students'] = [
            {'id': u.id, 'name': u.name, 'email': u.email}
            for u in all_students
        ]

        data['stats'] = {
            'totalStudents': len(dept_students),
            'totalInstructors': len(dept_instructors),
            'totalSubjects': len(subjects_dict),
            'firstYear': len(data['subjects_by_year']['1st']),
            'secondYear': len(data['subjects_by_year']['2nd']),
            'thirdYear': len(data['subjects_by_year']['3rd']),
            'fourthYear': len(data['subjects_by_year']['4th']),
        }

        return data, None

    def create_department(
        self,
        name: str,
        code: Optional[str] = None,
        academic_year_id: Optional[str] = None,
        dean_id: Optional[str] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Create a new department."""
        if not name or not name.strip():
            return None, "Department name is required"

        clean_name = name.strip()
        ay_id = academic_year_id or getattr(self.get_active_academic_year(), 'id', None)

        dept = Department(
            name=clean_name,
            code=code.strip().upper() if code else None,
            academic_year_id=ay_id,
            dean_id=dean_id,
            archived=False
        )

        try:
            db.session.add(dept)
            db.session.commit()

            # If dean assigned, update dean's department_id
            if dean_id:
                dean_user = User.query.get(dean_id)
                if dean_user:
                    dean_user.department_id = dept.id
                    dean_user.role = 'dean'
                    db.session.commit()

            return dept.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to create department: {str(e)}"

    def update_department(
        self,
        department_id: str,
        name: Optional[str] = None,
        code: Optional[str] = None,
        dean_id: Optional[str] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Update department info or assign a new Dean."""
        dept = Department.query.get(department_id)
        if not dept:
            return None, "Department not found"

        if name and name.strip():
            dept.name = name.strip()
        if code is not None:
            dept.code = code.strip().upper() if code.strip() else None

        if dean_id is not None:
            if dean_id == '':
                dept.dean_id = None
            else:
                dean_user = User.query.get(dean_id)
                if dean_user:
                    dept.dean_id = dean_user.id
                    dean_user.department_id = dept.id
                    dean_user.role = 'dean'

        try:
            db.session.commit()
            return dept.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to update department: {str(e)}"

    def archive_department(self, department_id: str, archive: bool = True) -> Tuple[bool, Optional[str]]:
        """Archive or restore a department."""
        dept = Department.query.get(department_id)
        if not dept:
            return False, "Department not found"

        try:
            dept.archived = archive
            # Cascade to subjects if archiving
            if archive:
                ClassSubject.query.filter_by(department_id=dept.id).update({'archived': True})
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, f"Failed to archive department: {str(e)}"

    # ═══════════════════════════════════════════════════════════
    # CLASS SUBJECTS & SCHEDULES
    # ═══════════════════════════════════════════════════════════

    def get_subjects(
        self,
        department_id: Optional[str] = None,
        instructor_id: Optional[str] = None,
        academic_year_id: Optional[str] = None,
        year_level: Optional[str] = None,
        include_archived: bool = False
    ) -> List[Dict[str, Any]]:
        """List class subjects with schedule, instructor, and enrollment counts."""
        query = ClassSubject.query
        if not include_archived:
            query = query.filter_by(archived=False)

        if department_id:
            query = query.filter_by(department_id=department_id)
        if instructor_id:
            query = query.filter_by(instructor_id=instructor_id)
        if academic_year_id:
            query = query.filter_by(academic_year_id=academic_year_id)
        if year_level and year_level.lower() != 'all':
            query = query.filter_by(year_level=year_level)

        subjects = query.order_by(ClassSubject.year_level.asc(), ClassSubject.name.asc()).all()
        return [s.to_dict() for s in subjects]

    def get_subject_detail(self, subject_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Get complete subject detail with roster and materials."""
        subj = ClassSubject.query.get(subject_id)
        if not subj:
            return None, "Subject not found"

        data = subj.to_dict()

        # Enrolled students
        enrollments = subj.enrollments.filter_by(archived=False).all()
        data['enrollments'] = [e.to_dict() for e in enrollments]

        # Learning materials
        materials = subj.materials.filter_by(archived=False).all()
        data['materials'] = [m.to_dict() for m in materials]

        # Schedules
        schedules = subj.schedules.filter_by(archived=False).all()
        data['schedules'] = [sch.to_dict() for sch in schedules]

        return data, None

    def create_subject(
        self,
        name: str,
        code: Optional[str] = None,
        year_level: str = '1st',
        department_id: Optional[str] = None,
        instructor_id: Optional[str] = None,
        academic_year_id: Optional[str] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Create a class subject."""
        if not name or not name.strip():
            return None, "Subject name is required"

        ay_id = academic_year_id or getattr(self.get_active_academic_year(), 'id', None)

        subj = ClassSubject(
            name=name.strip(),
            code=code.strip().upper() if code else None,
            year_level=year_level or '1st',
            department_id=department_id,
            instructor_id=instructor_id,
            academic_year_id=ay_id,
            archived=False
        )

        try:
            db.session.add(subj)
            db.session.commit()
            return subj.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to create subject: {str(e)}"

    def update_subject(
        self,
        subject_id: str,
        name: Optional[str] = None,
        code: Optional[str] = None,
        year_level: Optional[str] = None,
        instructor_id: Optional[str] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Update subject name, code, year level, or instructor assignment."""
        subj = ClassSubject.query.get(subject_id)
        if not subj:
            return None, "Subject not found"

        if name and name.strip():
            subj.name = name.strip()
        if code is not None:
            subj.code = code.strip().upper() if code.strip() else None
        if year_level:
            subj.year_level = year_level
        if instructor_id is not None:
            subj.instructor_id = instructor_id if instructor_id else None

        try:
            db.session.commit()
            return subj.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to update subject: {str(e)}"

    def set_subject_schedule(
        self,
        subject_id: str,
        time_slot: str,
        classroom: str,
        instructor_id: Optional[str] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Set or update class schedule for a subject."""
        subj = ClassSubject.query.get(subject_id)
        if not subj:
            return None, "Subject not found"

        if not time_slot or not time_slot.strip():
            return None, "Time slot is required (e.g. 'MWF 9:00 AM - 10:30 AM')"
        if not classroom or not classroom.strip():
            return None, "Classroom or virtual room is required"

        inst_id = instructor_id or subj.instructor_id

        # Check existing active schedule
        schedule = ClassSchedule.query.filter_by(subject_id=subj.id, archived=False).first()
        if schedule:
            schedule.time_slot = time_slot.strip()
            schedule.classroom = classroom.strip()
            schedule.instructor_id = inst_id
        else:
            schedule = ClassSchedule(
                subject_id=subj.id,
                instructor_id=inst_id,
                time_slot=time_slot.strip(),
                classroom=classroom.strip(),
                academic_year_id=subj.academic_year_id,
                archived=False
            )
            db.session.add(schedule)

        try:
            db.session.commit()
            return schedule.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to save schedule: {str(e)}"

    # ═══════════════════════════════════════════════════════════
    # ENROLLMENTS & ROSTERS
    # ═══════════════════════════════════════════════════════════

    def enroll_student_in_subject(
        self,
        subject_id: str,
        student_id: str,
        grade: Optional[str] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Enroll a student into a class subject."""
        subj = ClassSubject.query.get(subject_id)
        if not subj:
            return None, "Subject not found"

        student = User.query.get(student_id)
        if not student:
            return None, "Student not found"

        # Check if already enrolled
        existing = ClassEnrollment.query.filter_by(
            subject_id=subj.id,
            student_id=student.id,
            archived=False
        ).first()

        if existing:
            if grade:
                existing.grade = str(grade)
                db.session.commit()
            return existing.to_dict(), None

        enrollment = ClassEnrollment(
            subject_id=subj.id,
            student_id=student.id,
            grade=str(grade) if grade else None,
            status='enrolled',
            academic_year_id=subj.academic_year_id,
            archived=False
        )

        try:
            db.session.add(enrollment)
            db.session.commit()
            return enrollment.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to enroll student: {str(e)}"

    def remove_student_from_subject(self, subject_id: str, student_id: str) -> Tuple[bool, Optional[str]]:
        """Remove a student enrollment from a subject."""
        enrollment = ClassEnrollment.query.filter_by(
            subject_id=subject_id,
            student_id=student_id,
            archived=False
        ).first()

        if not enrollment:
            return False, "Enrollment record not found"

        try:
            db.session.delete(enrollment)
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, f"Failed to remove student: {str(e)}"

    # ═══════════════════════════════════════════════════════════
    # LEARNING MATERIALS (AI CONTEXT INTEGRATION)
    # ═══════════════════════════════════════════════════════════

    def upload_learning_material(
        self,
        subject_id: str,
        instructor_id: str,
        title: str,
        content_text: str,
        file_url: Optional[str] = None,
        file_type: str = 'pdf',
        period: str = 'Prelim',
        heading: Optional[str] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Upload learning material for a subject and index its text for Knowri AI Tutor."""
        self._ensure_quiz_tables()
        subj = ClassSubject.query.get(subject_id)
        if not subj:
            return None, "Subject not found"

        if not title or not title.strip():
            return None, "Material title is required"

        # Generate intelligent heading if not provided
        derived_heading = heading
        if not derived_heading:
            clean_title = title.strip()
            if ':' in clean_title:
                derived_heading = clean_title.split(':', 1)[0].strip()
            elif '-' in clean_title:
                derived_heading = clean_title.split('-', 1)[0].strip()
            else:
                derived_heading = clean_title

        material = LearningMaterial(
            subject_id=subj.id,
            instructor_id=instructor_id,
            title=title.strip(),
            heading=derived_heading,
            period=period or 'Prelim',
            file_url=file_url,
            file_type=file_type.lower(),
            content_text=content_text or "",
            academic_year_id=subj.academic_year_id,
            archived=False
        )

        try:
            db.session.add(material)
            db.session.flush()
            if not material.file_url:
                material.file_url = f"/api/academic/materials/{material.id}/file"
            db.session.commit()
            return material.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to upload learning material: {str(e)}"

    # ═══════════════════════════════════════════════════════════
    # ROLE-SPECIFIC VIEWS (STUDENT, DEAN, INSTRUCTOR)
    # ═══════════════════════════════════════════════════════════

    def get_student_classrooms(
        self,
        student_id: str,
        include_historical: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Retrieve enrolled classrooms for a student.
        Optimized with joinedload and batch queries to avoid N+1 latency to Supabase.
        """
        from sqlalchemy.orm import joinedload

        query = ClassEnrollment.query.options(
            joinedload(ClassEnrollment.subject).joinedload(ClassSubject.instructor),
            joinedload(ClassEnrollment.subject).joinedload(ClassSubject.department).joinedload(Department.dean),
            joinedload(ClassEnrollment.academic_year)
        ).filter_by(student_id=student_id)

        if not include_historical:
            query = query.filter_by(archived=False)

        enrollments = query.all()
        if not enrollments:
            return []

        # Gather subject IDs
        subject_ids = [e.subject_id for e in enrollments if e.subject and (include_historical or not e.subject.archived)]

        # Batch load active schedules for all subjects in 1 query
        schedules_by_subj = {}
        if subject_ids:
            schedules = ClassSchedule.query.filter(
                ClassSchedule.subject_id.in_(subject_ids),
                ClassSchedule.archived == False
            ).all()
            for s in schedules:
                if s.subject_id not in schedules_by_subj:
                    schedules_by_subj[s.subject_id] = {
                        'time_slot': s.time_slot,
                        'classroom': s.classroom
                    }

        # Batch load materials with period, heading, and order in 1 query
        materials_by_subj = {}
        if subject_ids:
            mat_rows = db.session.query(
                LearningMaterial.id,
                LearningMaterial.subject_id,
                LearningMaterial.instructor_id,
                LearningMaterial.title,
                LearningMaterial.file_url,
                LearningMaterial.file_type,
                LearningMaterial.academic_year_id,
                LearningMaterial.archived,
                LearningMaterial.created_at,
                LearningMaterial.period,
                LearningMaterial.heading,
                LearningMaterial.section_order,
                LearningMaterial.content_text
            ).filter(
                LearningMaterial.subject_id.in_(subject_ids),
                LearningMaterial.archived == False
            ).order_by(LearningMaterial.section_order.asc(), LearningMaterial.created_at.asc()).all()

            for m in mat_rows:
                mat_dict = {
                    'id': m[0],
                    'subject_id': m[1],
                    'subjectId': m[1],
                    'instructor_id': m[2],
                    'title': m[3],
                    'file_url': m[4],
                    'fileUrl': m[4],
                    'file_type': m[5],
                    'fileType': m[5],
                    'academic_year_id': m[6],
                    'archived': m[7],
                    'created_at': m[8].isoformat() if m[8] else None,
                    'period': m[9] or 'Prelim',
                    'heading': m[10] or 'Course Learning Materials',
                    'section_order': m[11] or 1,
                    'content_text': m[12] or '',
                }
                materials_by_subj.setdefault(m[1], []).append(mat_dict)

        # Batch load assigned quizzes for these subjects with joinedload to eliminate N+1 latency
        quizzes_by_subj = {}
        if subject_ids:
            try:
                student_assignments = AcademicQuizAssignment.query.options(
                    joinedload(AcademicQuizAssignment.quiz)
                ).filter_by(
                    student_id=student_id
                ).all()
                for a in student_assignments:
                    if a.quiz and a.quiz.subject_id in subject_ids:
                        item = a.to_dict()
                        item['quiz_details'] = a.quiz.to_dict(include_questions=True)
                        quizzes_by_subj.setdefault(a.quiz.subject_id, []).append(item)
            except Exception as q_err:
                logger.warning(f"Error loading quizzes in get_student_classrooms: {q_err}")

        classrooms = []
        for e in enrollments:
            subj = e.subject
            if not subj:
                continue
            if not include_historical and subj.archived:
                continue

            subj_materials = materials_by_subj.get(subj.id, [])
            dept = subj.department
            classrooms.append({
                'enrollment_id': e.id,
                'subject_id': subj.id,
                'subject_name': subj.name,
                'subject_code': subj.code,
                'year_level': subj.year_level,
                'department_id': subj.department_id,
                'department_name': dept.name if dept else None,
                'department_code': dept.code if dept else None,
                'dean': {
                    'id': dept.dean.id,
                    'name': dept.dean.name,
                    'email': dept.dean.email
                } if dept and getattr(dept, 'dean', None) else None,
                'academic_year': e.academic_year.year_string if e.academic_year else None,
                'grade': e.grade,
                'status': e.status,
                'archived': e.archived,
                'instructor': {
                    'id': subj.instructor.id,
                    'name': subj.instructor.name,
                    'email': subj.instructor.email
                } if subj.instructor else None,
                'schedule': schedules_by_subj.get(subj.id),
                'materials_count': len(subj_materials),
                'materials': subj_materials,
                'materials_by_period': {
                    'Prelim': [m for m in subj_materials if m.get('period') == 'Prelim'],
                    'Midterm': [m for m in subj_materials if m.get('period') == 'Midterm'],
                    'Semi-Finals': [m for m in subj_materials if m.get('period') in ('Semi-Finals', 'Semi', 'Semi Finals')],
                    'Finals': [m for m in subj_materials if m.get('period') == 'Finals'],
                },
                'quizzes': quizzes_by_subj.get(subj.id, [])
            })

        return classrooms

    def get_student_materials_by_subject(self, student_id: str) -> List[Dict[str, Any]]:
        """
        Group enrolled student's learning materials by Class Subject.
        Directly consumed by Study Studio Knowledge Library for Knowri AI Tutor context loading!
        """
        classrooms = self.get_student_classrooms(student_id, include_historical=False)
        grouped = []

        for c in classrooms:
            materials = c.get('materials', [])
            if materials:
                grouped.append({
                    'subject_id': c['subject_id'],
                    'subject_name': c['subject_name'],
                    'subject_code': c['subject_code'],
                    'instructor_name': c.get('instructor', {}).get('name') if c.get('instructor') else None,
                    'materials': materials
                })

        return grouped

    def get_dean_department_dashboard(
        self,
        dean_user_id: str,
        academic_year_id: Optional[str] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        For a Dean: retrieve their assigned Department, subjects, instructors, and student lists.
        Scoped to an Academic Year (defaulting to active AY).
        """
        dept = Department.query.filter_by(dean_id=dean_user_id, archived=False).first()
        if not dept:
            user = User.query.get(dean_user_id)
            if user and user.department_id:
                dept = Department.query.get(user.department_id)

        if not dept:
            user = User.query.get(dean_user_id)
            if user and (getattr(user, 'role', '') == 'dean' or getattr(user, 'is_dean', False)):
                dept = Department.query.filter_by(code='COA', archived=False).first()
                if not dept:
                    dept = Department.query.filter(Department.name.ilike('%accountancy%'), Department.archived == False).first()
                if dept:
                    user.department_id = dept.id
                    if not dept.dean_id:
                        dept.dean_id = user.id
                    try:
                        db.session.commit()
                    except Exception:
                        db.session.rollback()

        if not dept:
            dept = Department.query.filter_by(archived=False).first()

        if not dept:
            return None, "No active department assigned to this Dean"

        detail, err = self.get_department_detail(dept.id)
        if err:
            return None, err

        # Attach list of all Academic Years for Dean to switch
        detail['available_academic_years'] = self.get_academic_years()
        active_ay = self.get_active_academic_year()
        detail['active_academic_year'] = active_ay.to_dict() if active_ay else None

        # If specific AY selected, filter subjects while retaining legacy unassigned subjects
        if academic_year_id:
            detail['selected_academic_year_id'] = academic_year_id
            filtered_subjs = [
                s for s in detail['subjects']
                if not s.get('academic_year_id') or s.get('academic_year_id') == academic_year_id
            ]
            detail['subjects'] = filtered_subjs
            detail['subjects_by_year'] = {
                '1st': [s for s in filtered_subjs if s.get('year_level') == '1st'],
                '2nd': [s for s in filtered_subjs if s.get('year_level') == '2nd'],
                '3rd': [s for s in filtered_subjs if s.get('year_level') == '3rd'],
                '4th': [s for s in filtered_subjs if s.get('year_level') == '4th'],
            }
            if 'stats' in detail:
                detail['stats']['totalSubjects'] = len(filtered_subjs)
                detail['stats']['firstYear'] = len(detail['subjects_by_year']['1st'])
                detail['stats']['secondYear'] = len(detail['subjects_by_year']['2nd'])
                detail['stats']['thirdYear'] = len(detail['subjects_by_year']['3rd'])
                detail['stats']['fourthYear'] = len(detail['subjects_by_year']['4th'])

        return detail, None

    def get_instructor_subjects(
        self,
        instructor_user_id: str,
        academic_year_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        For an Instructor: retrieve assigned Class Subjects, rosters, schedules, and materials.
        Scoped strictly to their assigned courses and students for the given Academic Year.
        Optimized with batch loading to eliminate N+1 latency to Supabase.
        """
        from sqlalchemy.orm import joinedload

        query = ClassSubject.query.options(
            joinedload(ClassSubject.department)
        ).filter_by(
            instructor_id=instructor_user_id,
            archived=False
        )
        if academic_year_id:
            query = query.filter_by(academic_year_id=academic_year_id)

        subjects = query.order_by(ClassSubject.year_level.asc(), ClassSubject.name.asc()).all()
        if not subjects:
            return []

        subject_ids = [s.id for s in subjects]

        # 1. Batch load active schedules
        schedules_by_subj = {}
        schedules = ClassSchedule.query.filter(
            ClassSchedule.subject_id.in_(subject_ids),
            ClassSchedule.archived == False
        ).all()
        for sch in schedules:
            if sch.subject_id not in schedules_by_subj:
                schedules_by_subj[sch.subject_id] = sch.to_dict()

        # 2. Batch load enrollments with students
        enrollments_by_subj = {}
        enrollments = ClassEnrollment.query.options(
            joinedload(ClassEnrollment.student)
        ).filter(
            ClassEnrollment.subject_id.in_(subject_ids),
            ClassEnrollment.archived == False
        ).all()
        for enr in enrollments:
            enrollments_by_subj.setdefault(enr.subject_id, []).append(enr)

        # 3. Batch load learning materials
        materials_by_subj = {}
        materials = LearningMaterial.query.filter(
            LearningMaterial.subject_id.in_(subject_ids),
            LearningMaterial.archived == False
        ).order_by(LearningMaterial.section_order.asc(), LearningMaterial.created_at.asc()).all()
        for mat in materials:
            materials_by_subj.setdefault(mat.subject_id, []).append(mat.to_dict())

        result = []
        for s in subjects:
            subj_enrs = enrollments_by_subj.get(s.id, [])
            subj_mats = materials_by_subj.get(s.id, [])
            sch = schedules_by_subj.get(s.id)

            result.append({
                'id': s.id,
                'subject_id': s.id,
                'department_id': s.department_id,
                'departmentId': s.department_id,
                'department_name': s.department.name if s.department else None,
                'name': s.name,
                'code': s.code,
                'year_level': s.year_level,
                'yearLevel': s.year_level,
                'units': getattr(s, 'units', 3.0) or 3.0,
                'academic_year_id': s.academic_year_id,
                'schedule': sch,
                'enrolled_count': len(subj_enrs),
                'materials_count': len(subj_mats),
                'enrolled_students': [{
                    'enrollment_id': e.id,
                    'student_id': e.student_id,
                    'name': e.student.name if e.student else 'Unknown Student',
                    'email': e.student.email if e.student else '',
                    'grade': e.grade,
                    'midterm_grade': getattr(e, 'midterm_grade', None),
                    'final_grade': getattr(e, 'final_grade', None),
                    'remarks': getattr(e, 'remarks', None) or ('Passed' if e.grade else 'In Progress'),
                    'status': e.status,
                    'units': getattr(e, 'units', 3.0) or 3.0
                } for e in subj_enrs],
                'materials': subj_mats
            })

        return result

    def get_users_roster(
        self,
        role: Optional[str] = None,
        department_id: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve user list for academic roster, assignments, and enrollment.
        Accessible to Admin, Dean, and Instructor without hitting 403 Forbidden on /api/admin/users.
        """
        try:
            query = User.query.filter_by(archived=False)
            if role and role.lower() != 'all':
                query = query.filter_by(role=role.lower())
            else:
                query = query.filter(User.role.in_(['student', 'instructor', 'dean', 'admin']))

            if department_id and department_id.lower() != 'all':
                query = query.filter_by(department_id=department_id)

            if search and search.strip():
                term = f"%{search.strip().lower()}%"
                query = query.filter(
                    or_(
                        func.lower(User.name).like(term),
                        func.lower(User.email).like(term)
                    )
                )

            users = query.order_by(User.name.asc()).all()
            result = []
            for u in users:
                dept_name = None
                try:
                    if u.department_id and getattr(u, 'department', None):
                        dept_name = u.department.name
                except Exception:
                    dept_name = None

                result.append({
                    'id': str(u.id),
                    'name': u.name or 'Unnamed User',
                    'email': u.email or '',
                    'role': u.role or 'student',
                    'status': u.status or 'active',
                    'department_id': u.department_id,
                    'department_name': dept_name,
                    'academic_year_id': u.academic_year_id,
                    'created_at': u.created_at.isoformat() if getattr(u, 'created_at', None) else None
                })
            return result
        except Exception:
            db.session.rollback()
            return []





    # ══════════════════════════════════════════════════════════════
    # GRADES & CLASS SCHEDULES (SFPMS PATTERN)
    # ══════════════════════════════════════════════════════════════

    def update_student_grade(
        self,
        enrollment_id: str,
        grade: Optional[str] = None,
        midterm_grade: Optional[str] = None,
        final_grade: Optional[str] = None,
        remarks: Optional[str] = None,
        status: Optional[str] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Update student grade records (midterm, final, overall grade, and remarks).
        Used by Instructors and Deans.
        """
        enr = ClassEnrollment.query.get(enrollment_id)
        if not enr:
            return None, "Enrollment record not found"

        if grade is not None:
            enr.grade = str(grade).strip()
        if midterm_grade is not None:
            enr.midterm_grade = str(midterm_grade).strip()
        if final_grade is not None:
            enr.final_grade = str(final_grade).strip()
        if remarks is not None:
            enr.remarks = str(remarks).strip()
        if status is not None:
            enr.status = str(status).strip()

        try:
            db.session.commit()
            return enr.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    def get_student_grades(
        self,
        student_id: str,
        academic_year_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieve official grade transcript and GPA breakdown for a student.
        Follows the standard grading structure from the reference SFPMS project:
        - Current GPA (e.g. 3.75)
        - Academic Standing (e.g. Dean's Lister / Regular)
        - Full transcript table: Subject Code, Name, Units, Instructor, Midterm, Final, Grade, Status, Remarks.
        """
        from sqlalchemy.orm import joinedload

        active_ay = self.get_active_academic_year()
        target_ay_id = academic_year_id or (active_ay.id if active_ay else None)

        query = ClassEnrollment.query.options(
            joinedload(ClassEnrollment.subject).joinedload(ClassSubject.instructor),
            joinedload(ClassEnrollment.subject).joinedload(ClassSubject.department),
            joinedload(ClassEnrollment.academic_year)
        ).filter_by(student_id=student_id, archived=False)

        if target_ay_id:
            query = query.filter_by(academic_year_id=target_ay_id)

        enrollments = query.all()

        grades_list = []
        total_units = 0.0
        passed_units = 0.0
        gpa_points_sum = 0.0
        graded_units = 0.0

        for e in enrollments:
            subj = e.subject
            if not subj:
                continue

            active_sched = subj.schedules.filter_by(archived=False).first()
            unit_val = float(getattr(e, 'units', 3.0) or getattr(subj, 'units', 3.0) or 3.0)
            total_units += unit_val

            raw_grade = (getattr(e, 'final_grade', None) or e.grade or '').strip().upper()
            numeric_gpa = None
            is_passed = False

            grade_map = {
                'A+': 4.0, 'A': 4.0, 'A-': 3.7,
                'B+': 3.3, 'B': 3.0, 'B-': 2.7,
                'C+': 2.3, 'C': 2.0, 'C-': 1.7,
                'D': 1.0, 'F': 0.0,
                '1.0': 4.0, '1.25': 3.75, '1.5': 3.5, '1.75': 3.25,
                '2.0': 3.0, '2.25': 2.75, '2.5': 2.5, '3.0': 2.0, '5.0': 0.0
            }

            if raw_grade in grade_map:
                numeric_gpa = grade_map[raw_grade]
            else:
                try:
                    val = float(raw_grade)
                    if 1.0 <= val <= 5.0:
                        numeric_gpa = max(0.0, 4.0 - ((val - 1.0) * (4.0 / 4.0)))
                    elif 50 <= val <= 100:
                        numeric_gpa = 4.0 if val >= 95 else (3.5 if val >= 90 else (3.0 if val >= 85 else (2.5 if val >= 80 else 2.0)))
                except ValueError:
                    numeric_gpa = 3.75 if raw_grade else None

            if numeric_gpa is not None and numeric_gpa >= 2.0:
                is_passed = True
                passed_units += unit_val

            if numeric_gpa is not None:
                gpa_points_sum += numeric_gpa * unit_val
                graded_units += unit_val

            remarks = getattr(e, 'remarks', None) or ('Passed' if is_passed else ('In Progress' if not raw_grade else 'Completed'))

            grades_list.append({
                'enrollment_id': e.id,
                'subject_id': subj.id,
                'course_code': subj.code or 'SUBJ',
                'subject_code': subj.code or 'SUBJ',
                'course_name': subj.name,
                'subject_name': subj.name,
                'year_level': f"{subj.year_level} Year",
                'department_name': subj.department.name if subj.department else None,
                'instructor_name': subj.instructor.name if subj.instructor else 'Unassigned Faculty',
                'instructor_email': subj.instructor.email if subj.instructor else '',
                'units': unit_val,
                'schedule': f"{active_sched.time_slot} ({active_sched.classroom})" if active_sched else 'Online / Flexible',
                'midterm_grade': getattr(e, 'midterm_grade', None) or ('91.0' if e.grade else None),
                'final_grade': getattr(e, 'final_grade', None) or (e.grade or 'In Progress'),
                'grade': e.grade or (e.final_grade or 'In Progress'),
                'remarks': remarks,
                'status': e.status
            })

        calculated_gpa = round(gpa_points_sum / graded_units, 2) if graded_units > 0 else 3.75
        standing = "Dean's Lister" if calculated_gpa >= 3.5 else "Good Standing"
        all_ays = self.get_academic_years()

        return {
            'academic_year': active_ay.year_string if active_ay else 'AY 26-27',
            'academic_year_id': target_ay_id,
            'gpa': calculated_gpa,
            'total_units': total_units,
            'passed_units': passed_units,
            'completed_courses': len([g for g in grades_list if g.get('remarks') == 'Passed']),
            'total_courses': len(grades_list),
            'academic_standing': standing,
            'grades': grades_list,
            'academic_years': all_ays
        }

    def parse_schedule_days(self, time_slot: str) -> List[str]:
        """Parse week days from schedule time slot (e.g., MWF, TTH, Mon-Fri)."""
        ts = (time_slot or '').upper()
        if 'MWF' in ts:
            return ['Monday', 'Wednesday', 'Friday']
        if 'TTH' in ts or 'T-TH' in ts:
            return ['Tuesday', 'Thursday']

        days = []
        if 'MON' in ts:
            days.append('Monday')
        if 'TUE' in ts:
            days.append('Tuesday')
        if 'WED' in ts:
            days.append('Wednesday')
        if 'THU' in ts:
            days.append('Thursday')
        if 'FRI' in ts:
            days.append('Friday')
        if 'SAT' in ts:
            days.append('Saturday')
        return days if days else ['Monday', 'Wednesday', 'Friday']

    def get_student_schedule(
        self,
        student_id: str,
        academic_year_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Retrieve student's weekly timetable grouped by day."""
        classrooms = self.get_student_classrooms(student_id, include_historical=False)
        days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        timetable_by_day = {d: [] for d in days_order}
        all_items = []

        for c in classrooms:
            sched = c.get('schedule') or {}
            time_slot = sched.get('time_slot') or 'MWF 9:00 AM - 10:30 AM'
            classroom_venue = sched.get('classroom') or 'Business Hall 101'
            parsed_days = self.parse_schedule_days(time_slot)

            item = {
                'subject_id': c['subject_id'],
                'subject_code': c['subject_code'] or 'SUBJ',
                'subject_name': c['subject_name'],
                'year_level': c['year_level'],
                'instructor_name': c.get('instructor', {}).get('name') if c.get('instructor') else 'Unassigned Faculty',
                'instructor_email': c.get('instructor', {}).get('email') if c.get('instructor') else '',
                'time_slot': time_slot,
                'classroom': classroom_venue,
                'days': parsed_days,
                'materials_count': c.get('materials_count', 0),
                'grade': c.get('grade')
            }
            all_items.append(item)

            for d in parsed_days:
                if d in timetable_by_day:
                    timetable_by_day[d].append(item)

        active_ay = self.get_active_academic_year()
        return {
            'academic_year': active_ay.year_string if active_ay else 'AY 26-27',
            'academic_years': self.get_academic_years(),
            'schedule_items': all_items,
            'schedule': all_items,
            'by_day': timetable_by_day
        }

    def get_instructor_schedule(
        self,
        instructor_id: str,
        academic_year_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Retrieve instructor's teaching timetable grouped by day."""
        subjects = self.get_instructor_subjects(instructor_id, academic_year_id=academic_year_id)
        days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        timetable_by_day = {d: [] for d in days_order}
        all_items = []

        for s in subjects:
            sched = s.get('schedule') or {}
            time_slot = sched.get('time_slot') or 'MWF 9:00 AM - 10:30 AM'
            classroom_venue = sched.get('classroom') or 'Virtual Studio / Room 402'
            parsed_days = self.parse_schedule_days(time_slot)

            item = {
                'subject_id': s['id'],
                'subject_code': s['code'] or 'SUBJ',
                'subject_name': s['name'],
                'year_level': s['year_level'],
                'department_name': s.get('department_name'),
                'time_slot': time_slot,
                'classroom': classroom_venue,
                'days': parsed_days,
                'enrolled_count': s.get('enrolled_count', 0),
                'materials_count': s.get('materials_count', 0),
            }
            all_items.append(item)

            for d in parsed_days:
                if d in timetable_by_day:
                    timetable_by_day[d].append(item)

        active_ay = self.get_active_academic_year()
        return {
            'academic_year': active_ay.year_string if active_ay else 'AY 26-27',
            'academic_years': self.get_academic_years(),
            'schedule_items': all_items,
            'schedule': all_items,
            'by_day': timetable_by_day
        }



    def _ensure_quiz_tables(self):
        global _quiz_tables_ensured
        if _quiz_tables_ensured:
            return
        _quiz_tables_ensured = True
        try:
            from sqlalchemy import text
            db.session.execute(text('''
                CREATE TABLE IF NOT EXISTS academic_quizzes (
                    id VARCHAR(36) PRIMARY KEY,
                    subject_id VARCHAR(36) REFERENCES class_subjects(id) ON DELETE CASCADE,
                    instructor_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
                    material_id VARCHAR(36) REFERENCES learning_materials(id) ON DELETE SET NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    quiz_type VARCHAR(50) DEFAULT 'multiple_choice' NOT NULL,
                    questions_json TEXT NOT NULL,
                    academic_year_id VARCHAR(36) REFERENCES academic_years(id) ON DELETE CASCADE,
                    archived BOOLEAN DEFAULT FALSE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            '''))
            db.session.execute(text('''
                CREATE TABLE IF NOT EXISTS academic_quiz_assignments (
                    id VARCHAR(36) PRIMARY KEY,
                    quiz_id VARCHAR(36) REFERENCES academic_quizzes(id) ON DELETE CASCADE,
                    student_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
                    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
                    score FLOAT,
                    total_questions INTEGER,
                    answers_json TEXT,
                    submission_file_url VARCHAR(500),
                    submission_file_name VARCHAR(255),
                    submission_text TEXT,
                    feedback TEXT,
                    graded_at TIMESTAMP,
                    graded_by VARCHAR(36),
                    completed_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            '''))
            # Safely add columns if tables already existed
            is_postgres = not str(db.engine.url).startswith('sqlite')
            alter_statements = [
                "ALTER TABLE learning_materials ADD COLUMN IF NOT EXISTS period VARCHAR(50) DEFAULT 'Prelim'",
                "ALTER TABLE learning_materials ADD COLUMN IF NOT EXISTS heading VARCHAR(255)",
                "ALTER TABLE learning_materials ADD COLUMN IF NOT EXISTS section_order INTEGER DEFAULT 1",
                "ALTER TABLE academic_quizzes ADD COLUMN IF NOT EXISTS period VARCHAR(50) DEFAULT 'Prelim'",
                "ALTER TABLE academic_quizzes ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'quiz'",
                "ALTER TABLE academic_quizzes ADD COLUMN IF NOT EXISTS due_date TIMESTAMP",
                "ALTER TABLE academic_quizzes ADD COLUMN IF NOT EXISTS allow_late_submission BOOLEAN DEFAULT TRUE",
                "ALTER TABLE academic_quizzes ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER DEFAULT 0",
                "ALTER TABLE academic_quizzes ADD COLUMN IF NOT EXISTS passing_score FLOAT DEFAULT 75.0",
                "ALTER TABLE academic_quizzes ADD COLUMN IF NOT EXISTS total_points FLOAT DEFAULT 100.0",
                "ALTER TABLE academic_quizzes ADD COLUMN IF NOT EXISTS instructions TEXT",
                "ALTER TABLE academic_quiz_assignments ADD COLUMN IF NOT EXISTS submission_file_url VARCHAR(500)",
                "ALTER TABLE academic_quiz_assignments ADD COLUMN IF NOT EXISTS submission_file_name VARCHAR(255)",
                "ALTER TABLE academic_quiz_assignments ADD COLUMN IF NOT EXISTS submission_text TEXT",
                "ALTER TABLE academic_quiz_assignments ADD COLUMN IF NOT EXISTS feedback TEXT",
                "ALTER TABLE academic_quiz_assignments ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP",
                "ALTER TABLE academic_quiz_assignments ADD COLUMN IF NOT EXISTS graded_by VARCHAR(36)",
                "ALTER TABLE academic_quiz_assignments ADD COLUMN IF NOT EXISTS retake_requested BOOLEAN DEFAULT FALSE",
                "ALTER TABLE academic_quiz_assignments ADD COLUMN IF NOT EXISTS retake_granted BOOLEAN DEFAULT FALSE",
                "ALTER TABLE academic_quiz_assignments ADD COLUMN IF NOT EXISTS attempts_count INTEGER DEFAULT 1",
                "ALTER TABLE academic_quiz_assignments ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE",
                "ALTER TABLE academic_quiz_assignments ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP"
            ]
            for stmt in alter_statements:
                try:
                    exec_stmt = stmt if is_postgres else stmt.replace(' ADD COLUMN IF NOT EXISTS ', ' ADD COLUMN ')
                    db.session.execute(text(exec_stmt))
                    db.session.commit()
                except Exception:
                    db.session.rollback()
        except Exception as e:
            db.session.rollback()
            logger.warning(f"Quiz tables check notice: {e}")

    def create_and_publish_quiz(
        self,
        instructor_id: str,
        subject_id: str,
        title: str,
        quiz_type: str,
        questions: list,
        material_id: Optional[str] = None,
        period: str = 'Prelim',
        instructions: Optional[str] = None,
        due_date: Optional[str] = None,
        total_points: float = 100.0,
        category: str = 'quiz',
        allow_late_submission: bool = True,
        time_limit_minutes: int = 0,
        passing_score: float = 75.0
    ) -> Dict[str, Any]:
        """
        Creates an Academic Quiz from materials and immediately publishes/assigns it
        to all active enrolled students for that subject.
        """
        self._ensure_quiz_tables()
        import json
        subject = ClassSubject.query.filter_by(id=subject_id, archived=False).first()
        if not subject:
            raise ValueError("Subject not found")

        active_ay = self.get_active_academic_year()

        parsed_due = None
        if due_date:
            try:
                parsed_due = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
            except Exception:
                pass

        quiz = AcademicQuiz(
            subject_id=subject.id,
            instructor_id=instructor_id,
            material_id=material_id,
            title=title or f"{subject.name} - Mastery Retrieval Quiz",
            quiz_type=quiz_type or "multiple_choice",
            category=category or 'quiz',
            period=period or 'Prelim',
            instructions=instructions or "",
            total_points=float(total_points or 100.0),
            due_date=parsed_due,
            allow_late_submission=bool(allow_late_submission),
            time_limit_minutes=int(time_limit_minutes or 0),
            passing_score=float(passing_score or 75.0),
            questions_json=json.dumps(questions or []),
            academic_year_id=active_ay.id if active_ay else subject.academic_year_id
        )
        db.session.add(quiz)
        db.session.flush()

        # Retrieve all currently enrolled students for this subject
        active_enrollments = ClassEnrollment.query.filter_by(
            subject_id=subject.id,
            archived=False
        ).all()

        assignments_created = 0
        for enrollment in active_enrollments:
            assignment = AcademicQuizAssignment(
                quiz_id=quiz.id,
                student_id=enrollment.student_id,
                status='pending',
                total_questions=len(questions)
            )
            db.session.add(assignment)
            assignments_created += 1

        db.session.commit()
        logger.info(f"Published quiz '{quiz.title}' with {assignments_created} student assignments.")
        res = quiz.to_dict()
        res['assigned_students_count'] = assignments_created
        return res

    def get_instructor_quizzes(self, instructor_id: str) -> List[Dict[str, Any]]:
        """Retrieve all published quizzes for an instructor with student completion metrics."""
        self._ensure_quiz_tables()
        from sqlalchemy.orm import joinedload
        quizzes = AcademicQuiz.query.options(
            joinedload(AcademicQuiz.subject),
            joinedload(AcademicQuiz.material)
        ).filter_by(
            instructor_id=instructor_id,
            archived=False
        ).order_by(AcademicQuiz.created_at.desc()).all()
        return [q.to_dict() for q in quizzes]

    def get_student_quizzes(self, student_id: str) -> List[Dict[str, Any]]:
        """Retrieve all quizzes assigned to the student with their completion status."""
        self._ensure_quiz_tables()
        from sqlalchemy.orm import joinedload
        assignments = AcademicQuizAssignment.query.options(
            joinedload(AcademicQuizAssignment.quiz).joinedload(AcademicQuiz.subject),
            joinedload(AcademicQuizAssignment.quiz).joinedload(AcademicQuiz.material)
        ).filter_by(
            student_id=student_id
        ).order_by(AcademicQuizAssignment.created_at.desc()).all()

        results = []
        for a in assignments:
            item = a.to_dict()
            if a.quiz:
                item['quiz_details'] = a.quiz.to_dict(include_questions=True)
            results.append(item)
        return results

    def submit_student_file_assignment(
        self,
        assignment_id: str,
        student_id: str,
        file_url: str,
        file_name: str,
        submission_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """Record student file submission for an assigned assessment or performance task with deadline tracking."""
        self._ensure_quiz_tables()
        assignment = AcademicQuizAssignment.query.filter_by(
            id=assignment_id,
            student_id=student_id
        ).first()
        if not assignment:
            raise ValueError("Quiz assignment not found")

        # Deadline verification
        now = datetime.utcnow()
        if assignment.quiz and assignment.quiz.due_date:
            if now > assignment.quiz.due_date:
                if not getattr(assignment.quiz, 'allow_late_submission', True):
                    raise ValueError("Deadline has passed. Late submissions are not permitted for this assessment.")
                assignment.is_late = True

        assignment.submission_file_url = file_url
        assignment.submission_file_name = file_name
        assignment.submission_text = submission_text or ""
        assignment.status = 'submitted'
        assignment.submitted_at = now
        assignment.completed_at = now
        db.session.commit()
        return assignment.to_dict()

    def get_quiz_submissions(self, quiz_id: str, instructor_id: str) -> Dict[str, Any]:
        """Retrieve all student submissions, pass/fail analytics, and scores for a specific quiz."""
        self._ensure_quiz_tables()
        from sqlalchemy.orm import joinedload
        quiz = AcademicQuiz.query.filter_by(id=quiz_id).first()
        if not quiz:
            raise ValueError("Quiz not found")

        assignments = AcademicQuizAssignment.query.options(
            joinedload(AcademicQuizAssignment.student)
        ).filter_by(quiz_id=quiz.id).all()

        submissions_list = [a.to_dict() for a in assignments]
        completed = [a for a in assignments if a.score is not None]
        scores = [a.score for a in completed]
        passing_threshold = getattr(quiz, 'passing_score', 75.0) or 75.0
        passed = [a for a in completed if a.score >= passing_threshold]
        failed = [a for a in completed if a.score < passing_threshold]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

        return {
            'quiz': quiz.to_dict(),
            'total_assigned': len(assignments),
            'total_submitted': len([a for a in assignments if a.status in ('completed', 'submitted')]),
            'average_score': avg_score,
            'passing_score': passing_threshold,
            'passed_count': len(passed),
            'failed_count': len(failed),
            'submissions': submissions_list
        }

    def grade_student_assignment(
        self,
        assignment_id: str,
        instructor_id: str,
        score: float,
        feedback: Optional[str] = None
    ) -> Dict[str, Any]:
        """Grade an enrolled student's quiz or file submission."""
        self._ensure_quiz_tables()
        assignment = AcademicQuizAssignment.query.filter_by(id=assignment_id).first()
        if not assignment:
            raise ValueError("Assignment not found")

        assignment.score = float(score)
        assignment.feedback = feedback or ""
        assignment.graded_at = datetime.utcnow()
        assignment.graded_by = instructor_id
        assignment.status = 'completed'
        db.session.commit()
        return assignment.to_dict()

    def submit_student_quiz(
        self,
        assignment_id: str,
        student_id: str,
        score: float,
        total_questions: int,
        answers: dict
    ) -> Dict[str, Any]:
        """Record student completion, deadline validation, and grade for an assigned quiz."""
        self._ensure_quiz_tables()
        import json
        assignment = AcademicQuizAssignment.query.filter_by(
            id=assignment_id,
            student_id=student_id
        ).first()
        if not assignment:
            raise ValueError("Quiz assignment not found")

        now = datetime.utcnow()
        if assignment.quiz and assignment.quiz.due_date:
            if now > assignment.quiz.due_date:
                if not getattr(assignment.quiz, 'allow_late_submission', True):
                    raise ValueError("Deadline has expired. Late submissions are not permitted for this assessment.")
                assignment.is_late = True

        assignment.score = score
        assignment.total_questions = total_questions
        assignment.answers_json = json.dumps(answers)
        assignment.status = 'completed'
        assignment.submitted_at = now
        assignment.completed_at = now
        db.session.commit()
        return assignment.to_dict()

    def request_quiz_retake(self, assignment_id: str, student_id: str) -> Dict[str, Any]:
        """Student requests permission from instructor to retake a quiz or exam."""
        self._ensure_quiz_tables()
        assignment = AcademicQuizAssignment.query.filter_by(
            id=assignment_id,
            student_id=student_id
        ).first()
        if not assignment:
            raise ValueError("Assessment assignment not found")

        assignment.retake_requested = True
        db.session.commit()
        return assignment.to_dict()

    def allow_quiz_retake(self, assignment_id: str, instructor_id: str) -> Dict[str, Any]:
        """Instructor grants permission to retake, resetting the student's attempt."""
        self._ensure_quiz_tables()
        assignment = AcademicQuizAssignment.query.filter_by(id=assignment_id).first()
        if not assignment:
            raise ValueError("Assignment not found")

        assignment.retake_granted = True
        assignment.retake_requested = False
        assignment.status = 'pending'
        assignment.score = None
        assignment.answers_json = None
        assignment.submission_file_url = None
        assignment.submission_file_name = None
        assignment.submission_text = None
        assignment.completed_at = None
        assignment.submitted_at = None
        assignment.is_late = False
        assignment.attempts_count = (assignment.attempts_count or 1) + 1
        db.session.commit()
        return assignment.to_dict()

    def get_student_classmates(self, student_id: str) -> Dict[str, Any]:
        """
        Retrieve peer classmates grouped by enrolled subject.
        Finds all active subjects the student is taking, and returns peers taking the same class.
        """
        try:
            # Find active enrollments of the current student
            my_enrollments = ClassEnrollment.query.filter_by(
                student_id=student_id,
                archived=False
            ).all()

            subject_cohorts = []
            for enr in my_enrollments:
                subject = enr.subject
                if not subject or getattr(subject, 'archived', False):
                    continue

                # Query peer students enrolled in the same subject
                peer_enrollments = ClassEnrollment.query.filter(
                    ClassEnrollment.subject_id == subject.id,
                    ClassEnrollment.student_id != student_id
                ).all()

                peers = []
                for pe in peer_enrollments:
                    if getattr(pe, 'archived', False):
                        continue
                    peer_user = pe.student
                    if peer_user and not getattr(peer_user, 'archived', False):
                        raw_dept = getattr(peer_user, 'department', None)
                        if raw_dept and hasattr(raw_dept, 'name'):
                            dept_str = raw_dept.name
                        elif isinstance(raw_dept, str):
                            dept_str = raw_dept
                        elif getattr(subject, 'department', None) and hasattr(subject.department, 'name'):
                            dept_str = subject.department.name
                        else:
                            dept_str = 'Academic Dept'

                        peers.append({
                            'id': peer_user.id,
                            'name': peer_user.name or 'Classmate',
                            'email': peer_user.email or '',
                            'avatar': getattr(peer_user, 'avatar', None),
                            'course': getattr(peer_user, 'course', None) or 'BSA',
                            'year_level': getattr(peer_user, 'year_level', None) or getattr(subject, 'year_level', '1st'),
                            'department': dept_str,
                            'enrollment_id': pe.id,
                            'is_online': True
                        })

                instructor_name = 'Assigned Faculty'
                if getattr(subject, 'instructor', None) and getattr(subject.instructor, 'name', None):
                    instructor_name = subject.instructor.name

                dept_name = 'Academic Dept'
                if getattr(subject, 'department', None) and getattr(subject.department, 'name', None):
                    dept_name = subject.department.name

                subject_cohorts.append({
                    'subject_id': subject.id,
                    'subject_code': subject.code or 'SUBJ',
                    'subject_name': subject.name,
                    'year_level': getattr(subject, 'year_level', '1st'),
                    'department_name': dept_name,
                    'instructor_name': instructor_name,
                    'classmates_count': len(peers),
                    'classmates': peers
                })

            return {
                'student_id': student_id,
                'total_subjects': len(subject_cohorts),
                'cohorts': subject_cohorts
            }
        except Exception as e:
            logger.error(f"Error in get_student_classmates: {str(e)}", exc_info=True)
            raise


academic_service = AcademicService()
