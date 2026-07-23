"""Quiz routes for quiz generation, submission, retake, and review."""
from flask import Blueprint, request, jsonify, g
from app.services.quiz_service import quiz_service
from app.services.progress_service import progress_service
from app.decorators import require_registered as require_auth
from app.errors import db_error_handler

quiz_bp = Blueprint('quiz', __name__)


@quiz_bp.route('/generate', methods=['POST'])
@require_auth
@db_error_handler
def generate_quiz():
    """
    Generate a quiz from a topic or content.
    
    Request body:
        - topic: str (optional) - Topic for the quiz
        - contentId: str (optional) - Content ID to base questions on
        - questionCount: int (optional, default 5) - Number of questions
        - sourceMode: str (optional) - 'uploaded_only', 'uploaded_web', 'topic_based'
    
    At least one of topic or contentId must be provided.
    
    Returns:
        - 200: Generated quiz with questions (without correct answers)
        - 400: Invalid request (missing topic/contentId, invalid count)
        - 401: Unauthorized
        - 404: Content not found
        - 500: Quiz generation failed
    """
    user_id = g.current_user.id
    
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    topic = data.get('topic')
    content_id = data.get('contentId')
    question_count = data.get('questionCount', 5)
    source_mode = data.get('sourceMode', 'topic_based')
    
    # Validate question count
    if not isinstance(question_count, int):
        return jsonify({'error': 'questionCount must be an integer'}), 400
    
    # Generate quiz
    quiz, error_msg = quiz_service.generate_quiz(
        user_id=user_id,
        topic=topic,
        content_id=content_id,
        question_count=question_count,
        source_mode=source_mode
    )
    
    if error_msg:
        # Determine appropriate status code
        if "not found" in error_msg.lower():
            return jsonify({'error': error_msg}), 404
        elif "not authorized" in error_msg.lower():
            return jsonify({'error': error_msg}), 403
        else:
            return jsonify({'error': error_msg}), 400
    
    # Return quiz without correct answers for client
    # Use the DB-stored version to get enhanced metadata
    from app.models.quiz_data import QuizData
    quiz_data = QuizData.query.get(quiz.id)
    
    if quiz_data:
        client_dict = quiz_data.to_client_dict()
        return jsonify(client_dict), 200
    
    # Fallback: use in-memory quiz dict (backward compat)
    quiz_dict = quiz.to_dict()
    for question in quiz_dict['questions']:
        del question['correctIndex']
        del question['explanation']
    
    return jsonify({
        'quizId': quiz.id,
        'questions': quiz_dict['questions']
    }), 200


@quiz_bp.route('/submit', methods=['POST'])
@require_auth
@db_error_handler
def submit_quiz():
    """
    Submit quiz answers and get results.
    
    Request body:
        - quizId: str (required) - ID of the quiz
        - answers: list[int] (required) - List of answer indices
    
    Returns:
        - 200: Quiz results with score, explanations, validity, and sources
        - 400: Invalid request (missing fields, wrong answer count)
        - 401: Unauthorized
        - 404: Quiz not found
        - 409: Quiz already submitted
    """
    user_id = g.current_user.id
    
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    quiz_id = data.get('quizId')
    answers = data.get('answers')
    
    # Validate required fields
    if not quiz_id:
        return jsonify({'error': 'quizId is required'}), 400
    
    if answers is None:
        return jsonify({'error': 'answers is required'}), 400
    
    if not isinstance(answers, list):
        return jsonify({'error': 'answers must be a list'}), 400
    
    # Validate all answers are integers
    for i, answer in enumerate(answers):
        if not isinstance(answer, int):
            return jsonify({'error': f'Answer at index {i} must be an integer'}), 400
    
    # Submit quiz (validates, grades, and marks as submitted in DB)
    result, error_msg = quiz_service.submit_quiz(
        quiz_id=quiz_id,
        user_id=user_id,
        answers=answers
    )
    
    if error_msg:
        # Determine appropriate status code
        if "not found" in error_msg.lower():
            return jsonify({'error': error_msg}), 404
        elif "not authorized" in error_msg.lower():
            return jsonify({'error': error_msg}), 403
        elif "already been submitted" in error_msg.lower():
            return jsonify({'error': error_msg}), 409
        else:
            return jsonify({'error': error_msg}), 400
    
    # Load the quiz data from DB to build the detailed response
    from app.models.quiz_data import QuizData
    quiz_data = QuizData.query.get(quiz_id)
    grade_result = quiz_data.grade(answers)
    
    # Record quiz result to database for progress tracking
    quiz = quiz_service.get_quiz(quiz_id)
    if quiz:
        answers_dict = {}
        for i, answer in enumerate(answers):
            if i < len(quiz.questions):
                answers_dict[quiz.questions[i].id] = {
                    'userAnswer': answer,
                    'correctAnswer': quiz.questions[i].correct_index,
                    'isCorrect': answer == quiz.questions[i].correct_index
                }
        
        progress_service.record_quiz_result(
            user_id=user_id,
            quiz_id=quiz_id,
            topic=quiz.topic,
            score=result.correct_count,
            total_questions=result.total_questions,
            answers=answers_dict
        )
    
    return jsonify(grade_result), 200


@quiz_bp.route('/retake', methods=['POST'])
@require_auth
@db_error_handler
def retake_quiz():
    """
    Create a new attempt for an existing quiz (retake).
    
    Request body:
        - quizId: str (required) - ID of the original quiz
        - incorrectOnly: bool (optional) - Only include incorrect questions
    
    Returns:
        - 200: New quiz data for the retake attempt
        - 400: Invalid request
        - 404: Quiz not found
    """
    user_id = g.current_user.id
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    quiz_id = data.get('quizId')
    incorrect_only = data.get('incorrectOnly', False)
    
    if not quiz_id:
        return jsonify({'error': 'quizId is required'}), 400
    
    new_quiz_id, error_msg = quiz_service.retake_quiz(
        quiz_id=quiz_id,
        user_id=user_id,
        incorrect_only=incorrect_only
    )
    
    if error_msg:
        if "not found" in error_msg.lower():
            return jsonify({'error': error_msg}), 404
        elif "not authorized" in error_msg.lower():
            return jsonify({'error': error_msg}), 403
        else:
            return jsonify({'error': error_msg}), 400
    
    # Return the new quiz data for client
    from app.models.quiz_data import QuizData
    new_quiz = QuizData.query.get(new_quiz_id)
    if new_quiz:
        return jsonify(new_quiz.to_client_dict()), 200
    
    return jsonify({'error': 'Failed to create retake'}), 500


@quiz_bp.route('/<quiz_id>/review', methods=['POST'])
@require_auth
@db_error_handler
def review_quiz(quiz_id: str):
    """
    Get full quiz data for review mode (includes correct answers).
    Only available after quiz has been submitted.
    
    Request body (optional):
        - answers: list[int] - User's answers to include in review
    
    Returns:
        - 200: Full quiz data with correct answers, explanations, sources
        - 403: Not authorized or quiz not yet submitted
        - 404: Quiz not found
    """
    user_id = g.current_user.id
    
    from app.models.quiz_data import QuizData
    quiz_data = QuizData.query.get(quiz_id)
    
    if not quiz_data:
        return jsonify({'error': 'Quiz not found'}), 404
    
    if quiz_data.user_id != user_id:
        return jsonify({'error': 'Not authorized to access this quiz'}), 403
    
    if not quiz_data.is_submitted:
        return jsonify({'error': 'Quiz must be submitted before review'}), 403
    
    # Get answers from request body if provided
    answers = None
    data = request.get_json(silent=True)
    if data and isinstance(data.get('answers'), list):
        answers = data['answers']
    
    review_data = quiz_data.get_review_data(answers)
    return jsonify(review_data), 200


@quiz_bp.route('/<quiz_id>', methods=['GET'])
@require_auth
@db_error_handler
def get_quiz(quiz_id: str):
    """
    Get a quiz by ID.
    
    Returns:
        - 200: Quiz data
        - 401: Unauthorized
        - 404: Quiz not found
    """
    user_id = g.current_user.id
    
    quiz = quiz_service.get_quiz(quiz_id)
    
    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404
    
    if quiz.user_id != user_id:
        return jsonify({'error': 'Not authorized to access this quiz'}), 403
    
    # Return quiz without correct answers
    quiz_dict = quiz.to_dict()
    for question in quiz_dict['questions']:
        del question['correctIndex']
        del question['explanation']
    
    return jsonify(quiz_dict), 200


@quiz_bp.route('/list', methods=['GET'])
@require_auth
@db_error_handler
def list_quizzes():
    """
    List all quizzes for the current user.
    
    Returns:
        - 200: List of quizzes
        - 401: Unauthorized
    """
    user_id = g.current_user.id
    
    quizzes = quiz_service.get_user_quizzes(user_id)
    
    # Return quizzes without correct answers
    quiz_list = []
    for quiz in quizzes:
        quiz_dict = quiz.to_dict()
        for question in quiz_dict['questions']:
            del question['correctIndex']
            del question['explanation']
        quiz_list.append(quiz_dict)
    
    return jsonify({'quizzes': quiz_list}), 200


@quiz_bp.route('/results', methods=['GET'])
@require_auth
@db_error_handler
def list_results():
    """
    List all quiz results for the current user.
    
    Returns:
        - 200: List of quiz results
        - 401: Unauthorized
    """
    user_id = g.current_user.id
    
    results = quiz_service.get_user_results(user_id)
    
    return jsonify({
        'results': [r.to_dict() for r in results]
    }), 200
