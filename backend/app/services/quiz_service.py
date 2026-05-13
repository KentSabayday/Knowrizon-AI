"""Quiz service for quiz generation and management with database persistence."""
from typing import Optional
import uuid
from app.database import db
from app.models.quiz import Quiz, QuizQuestion, QuizResult
from app.models.quiz_data import QuizData
from app.services.agent_orchestrator import agent_orchestrator
from app.services.content_service import content_service


class QuizService:
    """Service for managing quizzes and quiz results with database persistence."""
    
    def generate_quiz(self, user_id: str, topic: Optional[str] = None,
                      content_id: Optional[str] = None,
                      question_count: int = 5) -> tuple[Optional[Quiz], Optional[str]]:
        """
        Generate a quiz from a topic or content.
        
        Args:
            user_id: ID of the user requesting the quiz.
            topic: Optional topic for the quiz.
            content_id: Optional content ID to base questions on.
            question_count: Number of questions to generate.
            
        Returns:
            Tuple of (Quiz, error_message). Quiz is None if error occurred.
        """
        if not topic and not content_id:
            return None, "Either topic or contentId must be provided"
        
        if question_count < 1:
            return None, "Question count must be at least 1"
        
        if question_count > 20:
            return None, "Question count cannot exceed 20"
        
        # Get content summary if content_id provided
        content_summary = None
        if content_id:
            content = content_service.get_content(content_id)
            if not content:
                return None, "Content not found"
            if content.user_id != user_id:
                return None, "Not authorized to access this content"
            # Build content summary from key points
            if content.key_points:
                content_summary = ". ".join(content.key_points)
            elif content.summary:
                content_summary = ". ".join(content.summary)
        
        # Generate questions using QuizAgent
        raw_questions = agent_orchestrator.generate_quiz(
            topic=topic,
            content=content_summary,
            question_count=question_count
        )
        
        if not raw_questions:
            return None, "Failed to generate quiz questions"
        
        # Build validated question list
        validated_questions = []
        for i, q in enumerate(raw_questions):
            question = QuizQuestion(
                id=q.get("id", f"q{i+1}"),
                question=q.get("question", ""),
                options=q.get("options", []),
                correct_index=q.get("correct_index", 0),
                explanation=q.get("explanation", "")
            )
            
            if question.is_valid():
                validated_questions.append(question)
        
        if not validated_questions:
            return None, "Failed to generate valid quiz questions"
        
        # Create the in-memory Quiz object (for API response)
        quiz = Quiz.create(
            user_id=user_id,
            questions=validated_questions,
            topic=topic,
            content_id=content_id
        )
        
        # Persist to database so it survives across serverless invocations
        quiz_data = QuizData(
            id=quiz.id,
            user_id=user_id,
            topic=topic,
            content_id=content_id,
        )
        # Store full question data including correct answers and explanations
        quiz_data.questions = [
            {
                'id': q.id,
                'question': q.question,
                'options': q.options,
                'correct_index': q.correct_index,
                'explanation': q.explanation,
            }
            for q in validated_questions
        ]
        
        db.session.add(quiz_data)
        db.session.commit()
        
        return quiz, None
    
    def get_quiz(self, quiz_id: str) -> Optional[Quiz]:
        """Get a quiz by ID from the database."""
        quiz_data = QuizData.query.get(quiz_id)
        if not quiz_data:
            return None
        
        # Reconstruct the Quiz dataclass from persisted data
        questions = []
        for q in quiz_data.questions:
            questions.append(QuizQuestion(
                id=q.get('id', ''),
                question=q.get('question', ''),
                options=q.get('options', []),
                correct_index=q.get('correct_index', 0),
                explanation=q.get('explanation', ''),
            ))
        
        return Quiz(
            id=quiz_data.id,
            user_id=quiz_data.user_id,
            topic=quiz_data.topic,
            content_id=quiz_data.content_id,
            questions=questions,
            created_at=quiz_data.created_at,
        )
    
    def get_user_quizzes(self, user_id: str) -> list[Quiz]:
        """Get all quizzes for a user from the database."""
        quiz_records = QuizData.query.filter_by(user_id=user_id).order_by(
            QuizData.created_at.desc()
        ).all()
        
        quizzes = []
        for qd in quiz_records:
            questions = [
                QuizQuestion(
                    id=q.get('id', ''),
                    question=q.get('question', ''),
                    options=q.get('options', []),
                    correct_index=q.get('correct_index', 0),
                    explanation=q.get('explanation', ''),
                )
                for q in qd.questions
            ]
            quizzes.append(Quiz(
                id=qd.id,
                user_id=qd.user_id,
                topic=qd.topic,
                content_id=qd.content_id,
                questions=questions,
                created_at=qd.created_at,
            ))
        
        return quizzes
    
    def submit_quiz(self, quiz_id: str, user_id: str, 
                    answers: list[int]) -> tuple[Optional[QuizResult], Optional[str]]:
        """
        Submit quiz answers and calculate results.
        
        Args:
            quiz_id: ID of the quiz being submitted.
            user_id: ID of the user submitting.
            answers: List of answer indices.
            
        Returns:
            Tuple of (QuizResult, error_message). Result is None if error occurred.
        """
        # Load quiz from database (persists across serverless invocations)
        quiz_data = QuizData.query.get(quiz_id)
        
        if not quiz_data:
            return None, "Quiz not found"
        
        if quiz_data.user_id != user_id:
            return None, "Not authorized to submit this quiz"
        
        questions_list = quiz_data.questions
        
        # Validate answers count
        if len(answers) != len(questions_list):
            return None, f"Expected {len(questions_list)} answers, got {len(answers)}"
        
        # Validate answer indices
        for i, answer in enumerate(answers):
            if answer < 0 or answer >= len(questions_list[i].get('options', [])):
                return None, f"Answer index {answer} out of range for question {i+1}"
        
        # Check if quiz already submitted
        if quiz_data.is_submitted:
            return None, "Quiz has already been submitted"
        
        # Grade the quiz using the persisted data
        grade_result = quiz_data.grade(answers)
        
        # Mark quiz as submitted
        quiz_data.is_submitted = True
        db.session.commit()
        
        # Create a QuizResult dataclass for backward compatibility
        result = QuizResult(
            id=str(uuid.uuid4()),
            quiz_id=quiz_id,
            user_id=user_id,
            answers=answers,
            score=grade_result['score'],
            total_questions=grade_result['totalQuestions'],
            correct_count=grade_result['correctCount'],
        )
        
        return result, None
    
    def get_result(self, result_id: str) -> Optional[QuizResult]:
        """Get a quiz result by ID (not used in current flow)."""
        return None
    
    def get_quiz_results(self, quiz_id: str) -> list[QuizResult]:
        """Get all results for a quiz (not used in current flow)."""
        return []
    
    def get_user_results(self, user_id: str) -> list[QuizResult]:
        """Get all quiz results for a user (not used in current flow)."""
        return []
    
    def get_answer(self, quiz_id: str, user_id: str, 
                   question_index: int) -> Optional[int]:
        """Get a recorded answer for a specific question."""
        return None
    
    def calculate_score(self, answers: list[int], 
                        questions: list[QuizQuestion]) -> tuple[int, int, float]:
        """Calculate quiz score from answers."""
        total = len(questions)
        correct = 0
        
        for i, answer in enumerate(answers):
            if i < len(questions) and answer == questions[i].correct_index:
                correct += 1
        
        score = (correct / total) if total > 0 else 0.0
        return correct, total, score


# Global quiz service instance
quiz_service = QuizService()
