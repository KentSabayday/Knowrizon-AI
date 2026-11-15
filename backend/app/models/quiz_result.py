"""
QuizResult model for database persistence.

Defines the QuizResult table with SQLAlchemy ORM for storing quiz scores,
question analytics, concept mastery, and archive states.
"""
import uuid
import json
from datetime import datetime
from typing import Optional, Dict, Any

from app.database import db


class QuizResult(db.Model):
    """QuizResult model representing completed quiz results with mastery telemetry."""
    
    __tablename__ = 'quiz_results'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    quiz_id = db.Column(db.String(36), nullable=False)
    topic = db.Column(db.String(255), nullable=True)
    score = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    answers_json = db.Column(db.Text, nullable=True)  # JSON object
    concept_scores_json = db.Column(db.Text, nullable=True)
    question_types_json = db.Column(db.Text, nullable=True)
    time_taken = db.Column(db.Integer, nullable=True)
    conversation_id = db.Column(db.Integer, nullable=True)
    is_archived = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<QuizResult {self.id}: {self.score}/{self.total_questions}>'
    
    @property
    def answers(self) -> Dict[str, Any]:
        """Get answers as a dictionary."""
        return json.loads(self.answers_json) if self.answers_json else {}
    
    @answers.setter
    def answers(self, value: Optional[Dict[str, Any]]) -> None:
        """Set answers from a dictionary."""
        self.answers_json = json.dumps(value) if value else None
        
    @property
    def concept_scores(self) -> Dict[str, Any]:
        return json.loads(self.concept_scores_json) if self.concept_scores_json else {}
        
    @concept_scores.setter
    def concept_scores(self, value: Optional[Dict[str, Any]]) -> None:
        self.concept_scores_json = json.dumps(value) if value else None
    
    @property
    def percentage(self) -> float:
        """Calculate the percentage score."""
        if self.total_questions == 0:
            return 0.0
        return round((self.score / self.total_questions) * 100, 1)
    
    def to_dict(self) -> dict:
        """Convert quiz result to dictionary for API responses."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'quiz_id': self.quiz_id,
            'topic': self.topic,
            'score': self.score,
            'total_questions': self.total_questions,
            'percentage': self.percentage,
            'answers': self.answers,
            'conceptScores': self.concept_scores,
            'timeTaken': self.time_taken,
            'conversationId': self.conversation_id,
            'isArchived': self.is_archived,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'QuizResult':
        """Create a QuizResult instance from a dictionary."""
        result = cls(
            id=data.get('id', str(uuid.uuid4())),
            user_id=data['user_id'],
            quiz_id=data['quiz_id'],
            topic=data.get('topic'),
            score=data['score'],
            total_questions=data['total_questions'],
            is_archived=data.get('is_archived', False),
            created_at=datetime.fromisoformat(data['created_at']) if data.get('created_at') else datetime.utcnow()
        )
        result.answers = data.get('answers', {})
        return result
