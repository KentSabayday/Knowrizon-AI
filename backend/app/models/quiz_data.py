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
    
    @property
    def questions(self) -> List[dict]:
        """Get questions as a list of dictionaries."""
        return json.loads(self.questions_json) if self.questions_json else []
    
    @questions.setter
    def questions(self, value: List[dict]) -> None:
        """Set questions from a list of dictionaries."""
        self.questions_json = json.dumps(value) if value else '[]'
    
    def get_question_count(self) -> int:
        """Get the number of questions."""
        return len(self.questions)
    
    def to_client_dict(self) -> dict:
        """Convert to dictionary for client (without correct answers)."""
        questions = self.questions
        client_questions = []
        for q in questions:
            client_questions.append({
                'id': q.get('id', ''),
                'question': q.get('question', ''),
                'options': q.get('options', []),
            })
        return {
            'quizId': self.id,
            'topic': self.topic,
            'questions': client_questions,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }
    
    def grade(self, answers: List[int]) -> dict:
        """
        Grade the quiz given user answers.
        
        Args:
            answers: List of answer indices selected by the user.
            
        Returns:
            Dictionary with score, correctCount, totalQuestions, and results.
        """
        questions = self.questions
        total = len(questions)
        correct = 0
        results = []
        
        for i, q in enumerate(questions):
            user_answer = answers[i] if i < len(answers) else -1
            correct_index = q.get('correct_index', 0)
            is_correct = user_answer == correct_index
            
            if is_correct:
                correct += 1
            
            result_item = {
                'questionId': q.get('id', f'q{i+1}'),
                'question': q.get('question', ''),
                'userAnswer': user_answer,
                'correctAnswer': correct_index,
                'isCorrect': is_correct,
                'options': q.get('options', []),
            }
            
            # Include explanation for incorrect answers
            if not is_correct:
                result_item['explanation'] = q.get('explanation', '')
            
            results.append(result_item)
        
        score = (correct / total) if total > 0 else 0.0
        
        return {
            'score': score,
            'correctCount': correct,
            'totalQuestions': total,
            'results': results,
        }
