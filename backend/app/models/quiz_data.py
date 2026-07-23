"""
QuizData model for database persistence of generated quizzes.

On Vercel serverless, in-memory quiz storage is lost between invocations.
This model persists the full quiz (including correct answers and explanations)
in the database so that quiz submission works across separate requests.
"""
import uuid
import json
from datetime import datetime
from typing import Optional, List

from app.database import db


class QuizData(db.Model):
    """Persisted quiz data including questions, correct answers, and explanations."""
    
    __tablename__ = 'quiz_data'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    topic = db.Column(db.String(500), nullable=True)
    content_id = db.Column(db.String(36), nullable=True)
    questions_json = db.Column(db.Text, nullable=False)  # Full quiz data as JSON
    is_submitted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<QuizData {self.id}: topic={self.topic}, submitted={self.is_submitted}>'
    
    def get_stored_data(self) -> dict:
        """
        Get the full stored data structure.
        Handles both old format (plain list) and new format (metadata wrapper).
        """
        if not self.questions_json:
            return {'questions': []}
        
        parsed = json.loads(self.questions_json)
        
        # New format: dict with 'questions' key and metadata
        if isinstance(parsed, dict) and 'questions' in parsed:
            return parsed
        
        # Old format: plain list of questions
        if isinstance(parsed, list):
            return {'questions': parsed}
        
        return {'questions': []}
    
    @property
    def questions(self) -> List[dict]:
        """Get questions as a list of dictionaries."""
        return self.get_stored_data().get('questions', [])
    
    @questions.setter
    def questions(self, value: List[dict]) -> None:
        """Set questions from a list of dictionaries."""
        self.questions_json = json.dumps(value) if value else '[]'
    
    def get_question_count(self) -> int:
        """Get the number of questions."""
        return len(self.questions)
    
    def get_source_mode(self) -> str:
        """Get the source mode used for this quiz."""
        return self.get_stored_data().get('sourceMode', 'topic_based')
    
    def get_content_meta(self) -> Optional[dict]:
        """Get content metadata if available."""
        return self.get_stored_data().get('contentMeta')
    
    def get_parent_attempt_id(self) -> Optional[str]:
        """Get parent attempt ID for retakes."""
        return self.get_stored_data().get('parentAttemptId')
    
    def to_client_dict(self) -> dict:
        """Convert to dictionary for client (without correct answers)."""
        questions = self.questions
        client_questions = []
        for q in questions:
            client_q = {
                'id': q.get('id', ''),
                'question': q.get('question', ''),
                'options': q.get('options', []),
            }
            # Include non-answer metadata that's safe for the client
            if q.get('difficulty'):
                client_q['difficulty'] = q['difficulty']
            if q.get('topic'):
                client_q['topic'] = q['topic']
            if q.get('conceptId'):
                client_q['conceptId'] = q['conceptId']
            client_questions.append(client_q)
        
        return {
            'quizId': self.id,
            'topic': self.topic,
            'questions': client_questions,
            'questionCount': len(client_questions),
            'sourceMode': self.get_source_mode(),
            'contentMeta': self.get_content_meta(),
            'parentAttemptId': self.get_parent_attempt_id(),
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }
    
    def grade(self, answers: List[int]) -> dict:
        """
        Grade the quiz given user answers.
        
        Returns full results including explanations, validity, and sources
        for ALL questions (both correct and incorrect).
        
        Args:
            answers: List of answer indices selected by the user.
            
        Returns:
            Dictionary with score, correctCount, totalQuestions, and results.
        """
        questions = self.questions
        total = len(questions)
        correct = 0
        scored_total = 0  # Only count verified/supported questions
        results = []
        
        for i, q in enumerate(questions):
            user_answer = answers[i] if i < len(answers) else -1
            correct_index = q.get('correct_index', 0)
            is_correct = user_answer == correct_index
            
            # Check validity status for scoring
            validity = q.get('validity', {})
            validity_status = validity.get('status', 'pending_validation')
            
            # Determine if this question should be scored
            is_scored = validity_status in ('verified', 'partially_supported')
            
            if is_correct and is_scored:
                correct += 1
            if is_scored:
                scored_total += 1
            
            result_item = {
                'questionId': q.get('id', f'q{i+1}'),
                'question': q.get('question', ''),
                'userAnswer': user_answer,
                'correctAnswer': correct_index,
                'isCorrect': is_correct,
                'isScored': is_scored,
                'options': q.get('options', []),
                # Always include explanation for all questions
                'explanation': q.get('explanation', ''),
                'learningExplanation': q.get('learningExplanation', ''),
                'difficulty': q.get('difficulty', 'medium'),
                'topic': q.get('topic', ''),
                'conceptId': q.get('conceptId', ''),
                'validity': validity,
                'sources': q.get('sources', []),
            }
            
            results.append(result_item)
        
        # Use scored_total for percentage to exclude unverified questions
        effective_total = scored_total if scored_total > 0 else total
        score = (correct / effective_total) if effective_total > 0 else 0.0
        
        return {
            'score': score,
            'correctCount': correct,
            'totalQuestions': total,
            'scoredQuestions': scored_total,
            'unscoredQuestions': total - scored_total,
            'results': results,
            'sourceMode': self.get_source_mode(),
            'contentMeta': self.get_content_meta(),
            'parentAttemptId': self.get_parent_attempt_id(),
        }
    
    def get_review_data(self, answers: List[int] = None) -> dict:
        """
        Get full quiz data for review mode.
        Includes correct answers, explanations, validity, and sources.
        
        Args:
            answers: Optional list of user's answers to include in review.
            
        Returns:
            Full quiz data dictionary with all metadata.
        """
        questions = self.questions
        review_questions = []
        
        for i, q in enumerate(questions):
            review_q = {
                'id': q.get('id', f'q{i+1}'),
                'question': q.get('question', ''),
                'options': q.get('options', []),
                'correctAnswer': q.get('correct_index', 0),
                'explanation': q.get('explanation', ''),
                'learningExplanation': q.get('learningExplanation', ''),
                'difficulty': q.get('difficulty', 'medium'),
                'topic': q.get('topic', ''),
                'conceptId': q.get('conceptId', ''),
                'validity': q.get('validity', {}),
                'sources': q.get('sources', []),
            }
            if answers and i < len(answers):
                review_q['userAnswer'] = answers[i]
                review_q['isCorrect'] = answers[i] == q.get('correct_index', 0)
            review_questions.append(review_q)
        
        return {
            'quizId': self.id,
            'topic': self.topic,
            'questions': review_questions,
            'sourceMode': self.get_source_mode(),
            'contentMeta': self.get_content_meta(),
        }
