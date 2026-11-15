"""
QuizData model for database persistence of generated quizzes.

On Vercel serverless, in-memory quiz storage is lost between invocations.
This model persists the full quiz (including correct answers, question types,
socratic feedback, and explanations) in the database.
"""
import uuid
import json
from datetime import datetime
from typing import Optional, List, Any

from app.database import db


class QuizData(db.Model):
    """Persisted quiz data including questions, question types, correct answers, and explanations."""
    
    __tablename__ = 'quiz_data'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    topic = db.Column(db.String(500), nullable=True)
    content_id = db.Column(db.String(36), nullable=True)
    conversation_id = db.Column(db.Integer, nullable=True)
    questions_json = db.Column(db.Text, nullable=False)  # Full quiz data as JSON
    is_submitted = db.Column(db.Boolean, default=False)
    is_archived = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<QuizData {self.id}: topic={self.topic}, submitted={self.is_submitted}>'
    
    def get_stored_data(self) -> dict:
        """Get the full stored data structure."""
        if not self.questions_json:
            return {'questions': []}
        
        parsed = json.loads(self.questions_json)
        if isinstance(parsed, dict) and 'questions' in parsed:
            return parsed
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
    
    def get_source_mode(self) -> str:
        return self.get_stored_data().get('sourceMode', 'topic_based')
    
    def get_content_meta(self) -> Optional[dict]:
        return self.get_stored_data().get('contentMeta')
    
    def get_parent_attempt_id(self) -> Optional[str]:
        return self.get_stored_data().get('parentAttemptId')
    
    def to_client_dict(self) -> dict:
        """Convert to client-safe dictionary (WITHOUT correct answers)."""
        questions = self.questions
        client_questions = []
        
        for i, q in enumerate(questions):
            client_q = {
                'id': q.get('id', f'q{i+1}'),
                'type': q.get('type', 'multiple_choice'),
                'question': q.get('question', ''),
                'options': q.get('options', []),
                'difficulty': q.get('difficulty', 'medium'),
                'topic': q.get('topic', ''),
                'conceptId': q.get('conceptId', ''),
                'source': q.get('source'),
            }
            client_questions.append(client_q)
        
        return {
            'quizId': self.id,
            'topic': self.topic,
            'questions': client_questions,
            'questionCount': len(client_questions),
            'sourceMode': self.get_source_mode(),
            'contentMeta': self.get_content_meta(),
            'parentAttemptId': self.get_parent_attempt_id(),
            'isArchived': self.is_archived,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }
    
    def get_review_data(self) -> dict:
        """Get full review data with questions, options, correct answers, explanations, and sources."""
        return {
            'quizId': self.id,
            'topic': self.topic,
            'questions': self.questions,
            'questionCount': len(self.questions),
            'sourceMode': self.get_source_mode(),
            'contentMeta': self.get_content_meta(),
            'parentAttemptId': self.get_parent_attempt_id(),
            'isArchived': self.is_archived,
            'isSubmitted': self.is_submitted,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }
    
    def grade(self, answers: List[Any]) -> dict:
        """
        Grade the quiz given user answers.
        Returns full results including explanations, why_incorrect,
        socratic_followup, and sources for ALL questions.
        """
        questions = self.questions
        total = len(questions)
        correct = 0
        results = []
        
        for i, q in enumerate(questions):
            user_answer = answers[i] if i < len(answers) else -1
            correct_index = q.get('correct_index', 0)
            
            # Handle both index comparisons and string matches
            is_correct = False
            if isinstance(user_answer, int) and user_answer >= 0:
                is_correct = (user_answer == correct_index)
            elif isinstance(user_answer, str) and user_answer.strip():
                import re
                clean_s = lambda s: re.sub(r'[\s\-_,\.\'\"()]+', ' ', str(s or '').lower()).strip()
                user_clean = clean_s(user_answer)
                expected_str = clean_s(q.get('correct_answer'))
                options = q.get('options', [])
                opt_cleans = [clean_s(opt) for opt in options] if options else []
                if expected_str and user_clean == expected_str:
                    is_correct = True
                elif opt_cleans and 0 <= correct_index < len(opt_cleans) and user_clean == opt_cleans[correct_index]:
                    is_correct = True
                elif len(user_clean) >= 3:
                    if expected_str and (user_clean in expected_str or expected_str in user_clean):
                        is_correct = True
                    elif opt_cleans and 0 <= correct_index < len(opt_cleans):
                        if user_clean in opt_cleans[correct_index] or opt_cleans[correct_index] in user_clean:
                            is_correct = True
                if not is_correct: pass
                user_clean = user_answer.strip().lower()
                expected_str = str(q.get('correct_answer') or '').strip().lower()
                options = q.get('options', [])
                if not expected_str and options and 0 <= correct_index < len(options):
                    expected_str = str(options[correct_index]).strip().lower()
                is_correct = (user_clean == expected_str)
                if not is_correct and options and 0 <= correct_index < len(options):
                    is_correct = (user_clean == str(options[correct_index]).strip().lower())
            
            if is_correct:
                correct += 1
            
            result_item = {
                'questionId': q.get('id', f'q{i+1}'),
                'type': q.get('type', 'multiple_choice'),
                'question': q.get('question', ''),
                'userAnswer': user_answer,
                'correctAnswer': correct_index,
                'correctAnswerText': q.get('correct_answer') or (q.get('options', [])[correct_index] if q.get('options') and 0 <= correct_index < len(q.get('options')) else ''),
                'isCorrect': is_correct,
                'options': q.get('options', []),
                'explanation': q.get('explanation', ''),
                'why_incorrect': q.get('why_incorrect', ''),
                'socratic_followup': q.get('socratic_followup', 'What clues in the text point to the correct principle?'),
                'learningExplanation': q.get('learningExplanation', ''),
                'difficulty': q.get('difficulty', 'medium'),
                'topic': q.get('topic', ''),
                'conceptId': q.get('conceptId', ''),
                'source': q.get('source'),
                'sources': q.get('sources', []),
                'validityScore': q.get('validityScore', 90)
            }
            results.append(result_item)
        
        score = (correct / total) if total > 0 else 0.0
        
        return {
            'score': score,
            'correctCount': correct,
            'totalQuestions': total,
            'results': results,
            'sourceMode': self.get_source_mode(),
            'contentMeta': self.get_content_meta(),
            'parentAttemptId': self.get_parent_attempt_id(),
        }
