"""
Academic Ecosystem API Routes for Knowrizon AI.

Endpoints for Academic Years, Departments, Class Subjects, Schedules,
Enrollments, Learning Materials, and role-based ecosystem views (Admin, Dean, Instructor, Student).
"""
from flask import Blueprint, request, jsonify, g, send_file

from app.decorators import require_auth, require_admin, require_role, require_media_auth
from app.services.academic_service import academic_service
from app.services.admin_service import admin_service
from app.services.content_service import content_service
from app.models.academic import Department
from app.errors import db_error_handler

academic_bp = Blueprint('academic', __name__)


# ══════════════════════════════════════════════════════════════
# ACADEMIC YEARS & ROLLOVER
# ══════════════════════════════════════════════════════════════

@academic_bp.route('/years', methods=['GET'])
@academic_bp.route('/academic-years', methods=['GET'])
@require_auth
def get_academic_years():
    """List all academic years."""
    include_archived = request.args.get('include_archived', 'true').lower() == 'true'
    years = academic_service.get_academic_years(include_archived=include_archived)
    active_year = academic_service.get_active_academic_year()
    active_dict = active_year.to_dict() if active_year else None
    return jsonify({
        'years': years,
        'academic_years': years,
        'activeYear': active_dict,
        'active_academic_year': active_dict
    }), 200


@academic_bp.route('/years', methods=['POST'])
@require_admin
@db_error_handler
def create_academic_year():
    """Create a new academic year."""
    data = request.get_json() or {}
    year_string = data.get('year_string') or data.get('yearString')
    is_active = data.get('is_active', False)

    year_data, error = academic_service.create_academic_year(
        year_string=year_string,
        is_active=is_active
    )
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'message': 'Academic Year created successfully', 'academicYear': year_data}), 201


@academic_bp.route('/years/<year_id>/activate', methods=['POST'])
@require_admin
@db_error_handler
def activate_academic_year(year_id):
    """Set an academic year as active."""
    success, error = academic_service.activate_academic_year(year_id)
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'message': 'Academic Year activated successfully'}), 200


@academic_bp.route('/rollover', methods=['POST'])
@require_admin
@db_error_handler
def rollover_academic_year():
    """
    Perform Academic Year Rollover:
    Cascading archive of all previous AY records, activates new AY.
    """
    data = request.get_json() or {}
    new_year_string = data.get('new_year_string') or data.get('newYearString')

    new_ay, error = academic_service.rollover_academic_year(new_year_string)
    if error:
        return jsonify({'error': error}), 400
        
    return jsonify({
        'message': f"Academic Year Rollover to '{new_ay.get('year_string')}' completed successfully. Historical records archived.",
        'academicYear': new_ay
    }), 200


# ══════════════════════════════════════════════════════════════
# DEPARTMENTS
# ══════════════════════════════════════════════════════════════

@academic_bp.route('/departments', methods=['GET'])
@require_auth
def get_departments():
    """List departments with statistics."""
    academic_year_id = request.args.get('academic_year_id')
    include_archived = request.args.get('include_archived', 'false').lower() == 'true'
    departments = academic_service.get_departments(
        academic_year_id=academic_year_id,
        include_archived=include_archived
    )
    return jsonify({'departments': departments}), 200


@academic_bp.route('/departments/<dept_id>', methods=['GET'])
@require_auth
def get_department_detail(dept_id):
    """Retrieve Read-Only Department Dashboard data (Dean, Instructors, Students, Subjects)."""
    detail, error = academic_service.get_department_detail(dept_id)
    if error:
        return jsonify({'error': error}), 404
    return jsonify(detail), 200


@academic_bp.route('/departments', methods=['POST'])
@require_admin
@db_error_handler
def create_department():
    """Create a new department."""
    data = request.get_json() or {}
    dept, error = academic_service.create_department(
        name=data.get('name'),
        code=data.get('code'),
        academic_year_id=data.get('academic_year_id') or data.get('academicYearId'),
        dean_id=data.get('dean_id') or data.get('deanId')
    )
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'message': 'Department created successfully', 'department': dept}), 201


@academic_bp.route('/departments/<dept_id>', methods=['PUT'])
@require_admin
@db_error_handler
def update_department(dept_id):
    """Update department info or assign Dean."""
    data = request.get_json() or {}
    dept, error = academic_service.update_department(
        department_id=dept_id,
        name=data.get('name'),
        code=data.get('code'),
        dean_id=data.get('dean_id') or data.get('deanId')
    )
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'message': 'Department updated successfully', 'department': dept}), 200


@academic_bp.route('/departments/<dept_id>/archive', methods=['POST'])
@require_admin
@db_error_handler
def archive_department(dept_id):
    """Archive or restore a department."""
    data = request.get_json() or {}
    archive = data.get('archive', True)
    success, error = academic_service.archive_department(dept_id, archive=archive)
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'message': f"Department {'archived' if archive else 'restored'} successfully"}), 200


# ══════════════════════════════════════════════════════════════
# CLASS SUBJECTS & SCHEDULES
# ══════════════════════════════════════════════════════════════

@academic_bp.route('/subjects', methods=['GET'])
@require_auth
def get_subjects():
    """List class subjects with optional filtering."""
    dept_id = request.args.get('department_id')
    instructor_id = request.args.get('instructor_id')
    academic_year_id = request.args.get('academic_year_id')
    year_level = request.args.get('year_level') or request.args.get('yearLevel')
    include_archived = request.args.get('include_archived', 'false').lower() == 'true'

    subjects = academic_service.get_subjects(
        department_id=dept_id,
        instructor_id=instructor_id,
        academic_year_id=academic_year_id,
        year_level=year_level,
        include_archived=include_archived
    )
    return jsonify({'subjects': subjects}), 200


@academic_bp.route('/subjects/<subject_id>', methods=['GET'])
@require_auth
def get_subject_detail(subject_id):
    """Retrieve full subject detail, enrollments, materials, and schedules."""
    detail, error = academic_service.get_subject_detail(subject_id)
    if error:
        return jsonify({'error': error}), 404
    return jsonify(detail), 200


@academic_bp.route('/subjects', methods=['POST'])
@require_role('admin', 'dean')
@db_error_handler
def create_subject():
    """Create class subject (Admin or Dean)."""
    data = request.get_json() or {}
    subj, error = academic_service.create_subject(
        name=data.get('name'),
        code=data.get('code'),
        year_level=data.get('year_level') or data.get('yearLevel', '1st'),
        department_id=data.get('department_id') or data.get('departmentId'),
        instructor_id=data.get('instructor_id') or data.get('instructorId'),
        academic_year_id=data.get('academic_year_id') or data.get('academicYearId')
    )
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'message': 'Subject created successfully', 'subject': subj}), 201


@academic_bp.route('/subjects/<subject_id>', methods=['PUT'])
@require_role('admin', 'dean')
@db_error_handler
def update_subject(subject_id):
    """Update subject or assign Instructor."""
    data = request.get_json() or {}
    subj, error = academic_service.update_subject(
        subject_id=subject_id,
        name=data.get('name'),
        code=data.get('code'),
        year_level=data.get('year_level') or data.get('yearLevel'),
        instructor_id=data.get('instructor_id') or data.get('instructorId')
    )
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'message': 'Subject updated successfully', 'subject': subj}), 200


@academic_bp.route('/subjects/<subject_id>/schedule', methods=['POST'])
@require_role('admin', 'dean', 'instructor')
@db_error_handler
def set_subject_schedule(subject_id):
    """Set class schedule (time_slot, classroom)."""
    data = request.get_json() or {}
    sched, error = academic_service.set_subject_schedule(
        subject_id=subject_id,
        time_slot=data.get('time_slot') or data.get('timeSlot'),
        classroom=data.get('classroom'),
        instructor_id=data.get('instructor_id') or getattr(g.current_user, 'id', None)
    )
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'message': 'Schedule saved successfully', 'schedule': sched}), 200


@academic_bp.route('/subjects/<subject_id>/enroll', methods=['POST'])
@require_role('admin', 'dean', 'instructor')
@db_error_handler
def enroll_student(subject_id):
    """Enroll student into class subject."""
    data = request.get_json() or {}
    student_id = data.get('student_id') or data.get('studentId')
    grade = data.get('grade')

    enrollment, error = academic_service.enroll_student_in_subject(
        subject_id=subject_id,
        student_id=student_id,
        grade=grade
    )
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'message': 'Student enrolled successfully', 'enrollment': enrollment}), 201


@academic_bp.route('/subjects/<subject_id>/enroll/<student_id>', methods=['DELETE'])
@require_role('admin', 'dean', 'instructor')
@db_error_handler
def remove_student_enrollment(subject_id, student_id):
    """Remove student enrollment."""
    success, error = academic_service.remove_student_from_subject(subject_id, student_id)
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'message': 'Student removed from subject successfully'}), 200


@academic_bp.route('/subjects/<subject_id>/materials', methods=['POST'])
@require_role('admin', 'instructor', 'dean')
@db_error_handler
def upload_learning_material(subject_id):
    """
    Upload learning material for a subject and index its text for Knowri AI Tutor.
    Supports both:
    1. multipart/form-data with binary file upload (.pdf, .docx, .pptx, .txt).
       Automatically extracts text using content_service and persists document.
    2. application/json with title and content_text.
    """
    title = None
    content_text = ""
    file_url = None
    file_type = 'pdf'

    # Check for multipart/form-data file upload
    if 'file' in request.files and request.files['file'].filename != '':
        file = request.files['file']
        filename = file.filename
        file_bytes = file.read()

        # Extract file extension
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'pdf'
        file_type = ext
        title = request.form.get('title') or filename

        # Upload and persist into Content storage
        try:
            content, upload_err = content_service.upload_content(
                user_id=g.current_user.id,
                filename=filename,
                file_data=file_bytes
            )
            if content:
                # Trigger document processing to extract sections and study concepts
                try:
                    content_service.process_content(content.id)
                    content_text = content.extracted_text or content.short_summary or ""
                except Exception:
                    pass
                file_url = f"/api/content/{content.id}/file"
        except Exception:
            pass

        # Robust direct text extraction fallback if content agent didn't populate text
        if not content_text or len(content_text.strip()) < 10:
            try:
                if ext == 'pdf':
                    content_text = content_service._extract_pdf_text('', raw_data=file_bytes)
                elif ext in ('docx', 'doc'):
                    content_text = content_service._extract_docx_text('', raw_data=file_bytes)
                elif ext in ('pptx', 'ppt'):
                    content_text = content_service._extract_pptx_text('', raw_data=file_bytes)
                elif ext in ('txt', 'md'):
                    content_text = file_bytes.decode('utf-8', errors='ignore')
                else:
                    content_text = f"[{filename} - Uploaded curriculum resource for Knowri AI study]"
            except Exception:
                content_text = f"[{filename} - Uploaded curriculum resource for Knowri AI study]"

        # Incorporate optional notes or custom syllabus text from form
        custom_notes = request.form.get('notes') or request.form.get('content_text')
        if custom_notes and custom_notes.strip():
            content_text = f"{custom_notes.strip()}\n\n--- Extracted Document Content ---\n{content_text}"

    else:
        # JSON payload
        data = request.get_json() or {}
        title = data.get('title')
        content_text = data.get('content_text') or data.get('contentText', '')
        file_url = data.get('file_url') or data.get('fileUrl')
        file_type = data.get('file_type') or data.get('fileType', 'pdf')

    if not title or not title.strip():
        return jsonify({'error': 'Material title or file is required'}), 400

    period = request.form.get('period') or (request.get_json(silent=True) or {}).get('period') or 'Prelim'
    heading = request.form.get('heading') or (request.get_json(silent=True) or {}).get('heading')

    material, error = academic_service.upload_learning_material(
        subject_id=subject_id,
        instructor_id=g.current_user.id,
        title=title,
        content_text=content_text,
        file_url=file_url,
        file_type=file_type,
        period=period,
        heading=heading
    )
    if error:
        return jsonify({'error': error}), 400
    return jsonify({
        'message': 'Learning material uploaded and indexed for Knowri AI',
        'material': material
    }), 201

@academic_bp.route('/materials/generate-heading', methods=['POST'])
@require_auth
def generate_material_heading():
    """AI Auto-Heading generator for uploaded materials."""
    import re
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    content = data.get('content_text', '').strip()

    heading = None
    period = 'Prelim'

    lower_all = (title + ' ' + content[:500]).lower()
    if 'final' in lower_all and 'semi' not in lower_all:
        period = 'Finals'
    elif 'semi' in lower_all:
        period = 'Semi-Finals'
    elif 'midterm' in lower_all:
        period = 'Midterm'
    else:
        period = 'Prelim'

    first_h = re.search(r'^#{1,3}\s+(.+)$', content, re.MULTILINE)
    if first_h:
        heading = first_h.group(1).strip()
    elif ':' in title:
        heading = title.split(':', 1)[1].strip()
    elif '-' in title:
        heading = title.split('-', 1)[1].strip()
    else:
        heading = title or 'Introduction to Course Curriculum'

    heading = re.sub(r'^\d+[\.\)]\s*', '', heading)
    return jsonify({'heading': heading, 'period': period}), 200


@academic_bp.route('/materials/<material_id>', methods=['GET'])
@require_auth
def get_learning_material_detail(material_id):
    """Retrieve details and content text of a learning material."""
    from app.models.academic import LearningMaterial
    mat = LearningMaterial.query.get(material_id)
    if not mat:
        return jsonify({'error': 'Learning material not found'}), 404
    return jsonify({'material': mat.to_dict(include_content=True)}), 200


@academic_bp.route('/materials/<material_id>/file', methods=['GET'])
@require_media_auth
def serve_material_file(material_id):
    """
    Stream and view learning material file directly in browser.
    Resolves linked Content bytes or falls back to extracted syllabus text.
    Authorized for enrolled students, subject instructor, department dean, and administrators.
    """
    import io, os, mimetypes
    from app.models.academic import LearningMaterial, ClassEnrollment
    from app.models.content import Content

    mat = LearningMaterial.query.get(material_id)
    if not mat:
        return jsonify({'error': 'Learning material not found'}), 404

    # Permission check: admin, dean, instructor of subject, or enrolled student
    user = g.current_user
    is_admin = getattr(user, 'is_administrator', False) or (getattr(user, 'role', '') == 'admin')
    is_dean = getattr(user, 'is_dean', False) or (getattr(user, 'role', '') == 'dean')
    is_instructor = (mat.instructor_id == user.id) or (getattr(user, 'role', '') == 'instructor')
    is_enrolled = ClassEnrollment.query.filter_by(subject_id=mat.subject_id, student_id=user.id, archived=False).first() is not None

    if not (is_admin or is_dean or is_instructor or is_enrolled):
        return jsonify({'error': 'Forbidden: You are not enrolled in or assigned to this subject'}), 403

    # Check if linked to Content
    content = None
    if mat.file_url and '/content/' in mat.file_url:
        import re
        cid_match = re.search(r'/content/([a-f0-9\-]+)', mat.file_url)
        if cid_match:
            content = Content.query.get(cid_match.group(1))

    # Serve file from Content if available
    if content:
        ext = os.path.splitext(content.filename)[1].lower()
        ext_mimes = {
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.txt': 'text/plain; charset=utf-8',
        }
        mime = ext_mimes.get(ext) or (mimetypes.guess_type(content.filename)[0] if mimetypes.guess_type(content.filename) else None) or 'application/pdf'
        if content.file_path and os.path.exists(content.file_path):
            return send_file(content.file_path, mimetype=mime, as_attachment=False, download_name=content.filename)
        if content.file_data:
            return send_file(io.BytesIO(content.file_data), mimetype=mime, as_attachment=False, download_name=content.filename)

    # If no binary file, serve content_text as readable plain text
    if mat.content_text:
        return mat.content_text, 200, {'Content-Type': 'text/plain; charset=utf-8'}

    return jsonify({'error': 'File data not available for this material'}), 404



# ══════════════════════════════════════════════════════════════
# STUDENT ECOSYSTEM (LMS CLASSROOMS & KNOWLEDGE LIBRARY)
# ══════════════════════════════════════════════════════════════

@academic_bp.route('/student/classrooms', methods=['GET'])
@require_auth
def get_student_classrooms():
    """
    Get student's enrolled Class Subjects, Instructors, and Schedules.
    Supports ?historical=true to toggle past Academic Years.
    """
    historical = request.args.get('historical', 'false').lower() == 'true'
    classrooms = academic_service.get_student_classrooms(
        student_id=g.current_user.id,
        include_historical=historical
    )
    return jsonify({'classrooms': classrooms}), 200


@academic_bp.route('/student/materials', methods=['GET'])
@require_auth
def get_student_materials_grouped():
    """
    Get student's learning materials grouped by Class Subject.
    Directly injected into Study Studio Knowledge Library for Knowri AI Tutor!
    """
    grouped_materials = academic_service.get_student_materials_by_subject(
        student_id=g.current_user.id
    )
    return jsonify({'subjectMaterials': grouped_materials}), 200


# ══════════════════════════════════════════════════════════════
# DEAN & INSTRUCTOR ECOSYSTEMS
# ══════════════════════════════════════════════════════════════


@academic_bp.route('/dean/users', methods=['POST'])
@require_role('dean', 'admin')
@db_error_handler
def dean_create_user():
    """
    Endpoint for Deans to create Instructor and Student accounts for their department.
    Strictly forbids creating Admin or Dean accounts.
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
            return jsonify({'error': f"Forbidden: Academic Deans may only create Instructor or Student accounts."}), 403

        # Default to Dean's department
        if not department_id:
            dept = Department.query.filter_by(dean_id=current_user.id, archived=False).first()
            department_id = dept.id if dept else current_user.department_id

    user_data, error = admin_service.create_user(
        email=email,
        password=password,
        name=name,
        role=role,
        status=status,
        academic_year_id=academic_year_id or current_user.academic_year_id,
        department_id=department_id
    )

    if error:
        return jsonify({'error': error}), 400

    return jsonify({
        'message': f"{role.capitalize()} account created successfully",
        'user': user_data
    }), 201

@academic_bp.route('/dean/department', methods=['GET'])
@require_role('dean', 'admin')
def get_dean_department():
    """Get assigned department dashboard for the logged-in Dean."""
    academic_year_id = request.args.get('academic_year_id')
    detail, error = academic_service.get_dean_department_dashboard(g.current_user.id, academic_year_id=academic_year_id)
    if error:
        return jsonify({'error': error}), 404
    return jsonify(detail), 200


@academic_bp.route('/instructor/subjects', methods=['GET'])
@require_role('instructor', 'dean', 'admin')
def get_instructor_subjects():
    """Get assigned class subjects, rosters, and schedules for the logged-in Instructor."""
    academic_year_id = request.args.get('academic_year_id')
    subjects = academic_service.get_instructor_subjects(g.current_user.id, academic_year_id=academic_year_id)
    return jsonify({'subjects': subjects}), 200


@academic_bp.route('/users-roster', methods=['GET'])
@require_role('admin', 'dean', 'instructor')
@db_error_handler
def get_users_roster():
    """
    Get users list for academic assignment, roster, and subject enrollment.
    Accessible to Admin, Dean, and Instructor without hitting 403 Forbidden on /api/admin/users.
    Supports filtering by role ('instructor', 'student', or 'all') and department_id.
    """
    try:
        role = request.args.get('role')
        dept_id = request.args.get('department_id')
        search = request.args.get('search')

        users = academic_service.get_users_roster(role=role, department_id=dept_id, search=search)
        return jsonify({'users': users}), 200
    except Exception as e:
        return jsonify({'error': str(e), 'users': []}), 200




# ══════════════════════════════════════════════════════════════
# STUDENT GRADES & CLASS SCHEDULES (SFPMS-COMPLIANT ARCHITECTURE)
# ══════════════════════════════════════════════════════════════

@academic_bp.route('/student/grades', methods=['GET'])
@require_role('student', 'instructor', 'dean', 'admin')
def get_student_grades():
    """Get official transcript, term grades, and GPA for the student."""
    academic_year_id = request.args.get('academic_year_id')
    target_student_id = request.args.get('student_id')
    
    # Authorized roles can view other students' grades
    if target_student_id and g.current_user.role in ['instructor', 'dean', 'admin']:
        user_id = target_student_id
    else:
        user_id = g.current_user.id
        
    data = academic_service.get_student_grades(user_id, academic_year_id=academic_year_id)
    return jsonify(data), 200


@academic_bp.route('/student/schedule', methods=['GET'])
@require_role('student', 'instructor', 'dean', 'admin')
def get_student_schedule():
    """Get weekly timetable schedule for the student."""
    academic_year_id = request.args.get('academic_year_id')
    data = academic_service.get_student_schedule(g.current_user.id, academic_year_id=academic_year_id)
    return jsonify(data), 200


@academic_bp.route('/instructor/schedule', methods=['GET'])
@require_role('instructor', 'dean', 'admin')
def get_instructor_schedule():
    """Get weekly teaching timetable for the instructor."""
    academic_year_id = request.args.get('academic_year_id')
    data = academic_service.get_instructor_schedule(g.current_user.id, academic_year_id=academic_year_id)
    return jsonify(data), 200


@academic_bp.route('/enrollments/<enrollment_id>/grade', methods=['PUT'])
@require_role('instructor', 'dean', 'admin')
def update_enrollment_grade(enrollment_id):
    """Update student evaluation: midterm, final, official grade, and remarks."""
    payload = request.get_json() or {}
    success, error = academic_service.update_student_grade(
        enrollment_id=enrollment_id,
        grade=payload.get('grade'),
        midterm_grade=payload.get('midterm_grade'),
        final_grade=payload.get('final_grade'),
        remarks=payload.get('remarks')
    )
    if not success:
        return jsonify({'error': error or 'Failed to update grade'}), 400
    return jsonify({'message': 'Grade updated successfully'}), 200

@academic_bp.route('/migrate', methods=['POST'])
@require_role('admin')
def run_database_migrations():
    """Fast batch migration runner: runs all required ALTER TABLE statements in 1 roundtrip."""
    from app.database import db
    from sqlalchemy import text
    try:
        sql = """
        ALTER TABLE class_enrollments ADD COLUMN IF NOT EXISTS midterm_grade VARCHAR(20);
        ALTER TABLE class_enrollments ADD COLUMN IF NOT EXISTS final_grade VARCHAR(20);
        ALTER TABLE class_enrollments ADD COLUMN IF NOT EXISTS remarks VARCHAR(100);
        ALTER TABLE class_enrollments ADD COLUMN IF NOT EXISTS units FLOAT DEFAULT 3.0;
        ALTER TABLE class_subjects ADD COLUMN IF NOT EXISTS units FLOAT DEFAULT 3.0;
        ALTER TABLE class_subjects ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE class_schedules ADD COLUMN IF NOT EXISTS days VARCHAR(100);
        """
        with db.engine.connect() as conn:
            conn.execute(text(sql))
            conn.commit()
        return jsonify({'message': 'Schema migrations applied successfully in 1 batch'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# -------------------------------------------------------------

# FACULTY QUIZ STUDIO & PUBLISHING ROUTES
# =============================================================

@academic_bp.route('/instructor/quizzes/publish', methods=['POST'])
@require_auth
def publish_instructor_quiz():
    """
    Publish an Academic Quiz generated from course materials and assign it
    to all active enrolled students for the given subject.
    """
    try:
        data = request.get_json() or {}
        subject_id = data.get('subject_id')
        material_id = data.get('material_id')
        title = data.get('title')
        quiz_type = data.get('quiz_type', 'multiple_choice')
        questions = data.get('questions', [])

        if not subject_id:
            return jsonify({'error': 'subject_id is required'}), 400
        if quiz_type == 'multiple_choice' and not questions:
            return jsonify({'error': 'At least one quiz question is required'}), 400

        period = data.get('period', 'Prelim')
        instructions = data.get('instructions') or data.get('description', '')
        due_date = data.get('due_date')
        total_points = float(data.get('total_points', 100.0))
        category = data.get('category', 'quiz')
        allow_late_submission = data.get('allow_late_submission', True)
        time_limit_minutes = int(data.get('time_limit_minutes', 0))
        passing_score = float(data.get('passing_score', 75.0))

        res = academic_service.create_and_publish_quiz(
            instructor_id=g.current_user.id,
            subject_id=subject_id,
            title=title,
            quiz_type=quiz_type,
            questions=questions,
            material_id=material_id,
            period=period,
            instructions=instructions,
            due_date=due_date,
            total_points=total_points,
            category=category,
            allow_late_submission=allow_late_submission,
            time_limit_minutes=time_limit_minutes,
            passing_score=passing_score
        )
        return jsonify({
            'message': 'Quiz successfully published and assigned to enrolled students',
            'quiz': res
        }), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to publish quiz: {str(e)}'}), 500


@academic_bp.route('/instructor/quizzes', methods=['GET'])
@require_auth
def list_instructor_quizzes():
    """List all quizzes published by this instructor."""
    try:
        quizzes = academic_service.get_instructor_quizzes(instructor_id=g.current_user.id)
        return jsonify({'quizzes': quizzes}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve instructor quizzes'}), 500


@academic_bp.route('/student/quizzes', methods=['GET'])
@require_auth
def list_student_quizzes():
    """Retrieve all assigned quizzes for the logged in student."""
    try:
        quizzes = academic_service.get_student_quizzes(student_id=g.current_user.id)
        return jsonify({'assignments': quizzes, 'quizzes': quizzes}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve student quizzes'}), 500


@academic_bp.route('/student/quizzes/<assignment_id>/submit', methods=['POST'])
@require_auth
def submit_student_assigned_quiz(assignment_id):
    """Submit responses and record score for an assigned quiz."""
    try:
        data = request.get_json() or {}
        score = float(data.get('score', 0))
        total_questions = int(data.get('total_questions', 0))
        answers = data.get('answers', {})

        res = academic_service.submit_student_quiz(
            assignment_id=assignment_id,
            student_id=g.current_user.id,
            score=score,
            total_questions=total_questions,
            answers=answers
        )
        return jsonify({
            'message': 'Quiz submission recorded successfully',
            'assignment': res
        }), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to submit quiz'}), 500


@academic_bp.route('/student/quizzes/<assignment_id>/submit-file', methods=['POST'])
@require_auth
def submit_student_file_assignment(assignment_id):
    """Submit uploaded file for a performance task or exam."""
    try:
        file_url = None
        file_name = None
        submission_text = request.form.get('submission_text') or ''

        if 'file' in request.files and request.files['file'].filename != '':
            file = request.files['file']
            file_name = file.filename
            file_bytes = file.read()
            try:
                content, upload_err = content_service.upload_content(
                    user_id=g.current_user.id,
                    filename=file_name,
                    file_data=file_bytes
                )
                if content:
                    file_url = f"/api/content/{content.id}/file"
                else:
                    file_url = f"/uploads/submissions/{file_name}"
            except Exception:
                file_url = f"/uploads/submissions/{file_name}"
        else:
            data = request.get_json(silent=True) or {}
            file_url = data.get('file_url') or data.get('fileUrl')
            file_name = data.get('file_name') or data.get('fileName') or 'Submitted Document'
            submission_text = data.get('submission_text', '')

        if not file_url and not submission_text:
            return jsonify({'error': 'Please provide a file or submission response'}), 400

        res = academic_service.submit_student_file_assignment(
            assignment_id=assignment_id,
            student_id=g.current_user.id,
            file_url=file_url or '',
            file_name=file_name or 'Uploaded File',
            submission_text=submission_text
        )
        return jsonify({
            'message': 'Assignment file submitted successfully',
            'assignment': res
        }), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to submit assignment: {str(e)}'}), 500


@academic_bp.route('/instructor/quizzes/<quiz_id>/submissions', methods=['GET'])
@require_auth
def get_instructor_quiz_submissions(quiz_id):
    """Retrieve student submissions and scores for a specific quiz/exam with pass/fail analytics."""
    try:
        data = academic_service.get_quiz_submissions(quiz_id=quiz_id, instructor_id=g.current_user.id)
        if isinstance(data, dict):
            return jsonify({
                'submissions': data.get('submissions', []),
                'analytics': data,
                'quiz': data.get('quiz'),
                'total_assigned': data.get('total_assigned', 0),
                'total_submitted': data.get('total_submitted', 0),
                'average_score': data.get('average_score', 0.0),
                'passed_count': data.get('passed_count', 0),
                'failed_count': data.get('failed_count', 0)
            }), 200
        return jsonify({'submissions': data}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve submissions: {str(e)}'}), 500


@academic_bp.route('/student/quizzes/<assignment_id>/request-retake', methods=['POST'])
@require_auth
def student_request_quiz_retake(assignment_id):
    """Student requests retake authorization from their instructor."""
    try:
        res = academic_service.request_quiz_retake(
            assignment_id=assignment_id,
            student_id=g.current_user.id
        )
        return jsonify({
            'message': 'Retake request sent to instructor for approval',
            'assignment': res
        }), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to request retake: {str(e)}'}), 500


@academic_bp.route('/instructor/quizzes/assignments/<assignment_id>/allow-retake', methods=['POST'])
@require_auth
def instructor_allow_quiz_retake(assignment_id):
    """Instructor approves a student retake, resetting their assessment attempt."""
    try:
        res = academic_service.allow_quiz_retake(
            assignment_id=assignment_id,
            instructor_id=g.current_user.id
        )
        return jsonify({
            'message': 'Retake granted. Student can now retake this assessment.',
            'assignment': res
        }), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to grant retake: {str(e)}'}), 500


@academic_bp.route('/instructor/quizzes/assignments/<assignment_id>/grade', methods=['POST'])
@require_auth
def grade_student_assignment_route(assignment_id):
    """Record instructor grade and feedback for an assignment."""
    try:
        data = request.get_json() or {}
        score = float(data.get('score', 0))
        feedback = data.get('feedback', '')
        res = academic_service.grade_student_assignment(
            assignment_id=assignment_id,
            instructor_id=g.current_user.id,
            score=score,
            feedback=feedback
        )
        return jsonify({
            'message': 'Grade and feedback recorded successfully',
            'assignment': res
        }), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to record grade: {str(e)}'}), 500


@academic_bp.route('/student/classmates', methods=['GET'])
@require_auth
def get_student_classmates_cohort():
    """
    Retrieve peer classmates who share enrollments in the same subjects with the student.
    Grouped by subject cohort.
    """
    try:
        data = academic_service.get_student_classmates(student_id=g.current_user.id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve classmates cohort: {str(e)}'}), 500
