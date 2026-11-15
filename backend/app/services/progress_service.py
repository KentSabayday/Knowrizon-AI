"""
Progress service for tracking and calculating user learning progress.
Implements Mastery Learning, Retrieval Practice Theory, mistake intelligence,
and Socratic remediation recommendations.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from collections import defaultdict
import math

from app.database import db
from app.models.quiz_result import QuizResult
from app.models.quiz_data import QuizData


class ProgressService:
    """Service for managing user learning progress, mistake tracking, and mastery analytics."""
    
    def record_quiz_result(
        self,
        user_id: str,
        quiz_id: str,
        topic: Optional[str],
        score: int,
        total_questions: int,
        answers: Optional[Dict[str, Any]] = None,
        concept_scores: Optional[Dict[str, Any]] = None,
        time_taken: Optional[int] = None,
        conversation_id: Optional[int] = None
    ) -> QuizResult:
        result = QuizResult(
            user_id=user_id,
            quiz_id=quiz_id,
            topic=topic,
            score=score,
            total_questions=total_questions,
            time_taken=time_taken,
            conversation_id=conversation_id
        )
        if answers:
            result.answers = answers
        if concept_scores:
            result.concept_scores = concept_scores
            
        db.session.add(result)
        db.session.commit()
        return result
    
    def get_progress(self, user_id: str) -> Dict[str, Any]:
        results = QuizResult.query.filter_by(user_id=user_id, is_archived=False).all()
        
        if not results:
            return {
                'totalQuizzes': 0,
                'totalQuestions': 0,
                'correctAnswers': 0,
                'successRate': 0.0,
                'topicProgress': {},
                'recentActivity': []
            }
        
        total_questions = sum(r.total_questions for r in results)
        correct_answers = sum(r.score for r in results)
        
        topic_stats = defaultdict(lambda: {'correct': 0, 'total': 0, 'quizzes': 0, 'scores': []})
        for r in results:
            t = r.topic or 'General'
            topic_stats[t]['correct'] += r.score
            topic_stats[t]['total'] += r.total_questions
            topic_stats[t]['quizzes'] += 1
            topic_stats[t]['scores'].append(r.percentage)
        
        topic_progress = {}
        for topic, stats in topic_stats.items():
            pct = (stats['correct'] / stats['total'] * 100) if stats['total'] > 0 else 0.0
            topic_progress[topic] = {
                'percentage': round(pct, 1),
                'quizzes': stats['quizzes'],
                'correct': stats['correct'],
                'total': stats['total'],
                'trend': 'improving' if len(stats['scores']) > 1 and stats['scores'][-1] >= stats['scores'][0] else 'stable'
            }
        
        recent = sorted(results, key=lambda r: r.created_at or datetime.min, reverse=True)[:10]
        recent_activity = [{
            'quizId': r.quiz_id,
            'topic': r.topic,
            'score': r.score,
            'total': r.total_questions,
            'percentage': r.percentage,
            'date': r.created_at.isoformat() if r.created_at else None
        } for r in recent]
        
        success_rate = round((correct_answers / total_questions * 100), 1) if total_questions > 0 else 0.0
        
        return {
            'totalQuizzes': len(results),
            'totalQuestions': total_questions,
            'correctAnswers': correct_answers,
            'successRate': success_rate,
            'topicProgress': topic_progress,
            'recentActivity': recent_activity
        }
        
    def get_quiz_results(self, user_id: str) -> List[QuizResult]:
        """Get all quiz results for a user."""
        return QuizResult.query.filter_by(user_id=user_id, is_archived=False).order_by(
            QuizResult.created_at.desc()
        ).all()

    def get_topics_mastered(self, user_id: str) -> List[str]:
        """Get topics with >= 80% success rate."""
        progress = self.get_progress(user_id)
        return [
            topic for topic, data in progress.get('topicProgress', {}).items()
            if data.get('percentage', 0) >= 80.0
        ]

    def get_topics_needing_work(self, user_id: str) -> List[str]:
        """Get topics with < 50% success rate."""
        progress = self.get_progress(user_id)
        return [
            topic for topic, data in progress.get('topicProgress', {}).items()
            if data.get('percentage', 0) < 50.0
        ]
        
    def get_learning_profile(self, user_id: str) -> Dict[str, Any]:
        """Generate comprehensive mastery profile grounded in cognitive science."""
        results = QuizResult.query.filter_by(user_id=user_id, is_archived=False).order_by(QuizResult.created_at.asc()).all()
        
        if not results:
            return {
                'masteryLevel': 'Novice Learner',
                'masteryScore': 0,
                'totalAttempts': 0,
                'improvementRate': 0.0,
                'streakDays': 0,
                'retrievalEfficiency': 'Establishing Baseline',
                'academicReference': 'Roediger & Butler (2011): Retrieval practice strengthens memory retention and facilitates higher-order knowledge transfer.',
                'topicProgression': []
            }
            
        total_quizzes = len(results)
        percentages = [r.percentage for r in results]
        avg_score = sum(percentages) / total_quizzes
        
        # Improvement rate between first half and second half
        improvement = 0.0
        if total_quizzes >= 2:
            mid = total_quizzes // 2
            first_half = sum(percentages[:mid]) / max(mid, 1)
            second_half = sum(percentages[mid:]) / max(total_quizzes - mid, 1)
            improvement = round(second_half - first_half, 1)
            
        # Mastery Level determination
        if avg_score >= 90:
            level = "Mastery Scholar"
        elif avg_score >= 80:
            level = "Advanced Practitioner"
        elif avg_score >= 65:
            level = "Developing Thinker"
        else:
            level = "Active Apprentice"
            
        # Calculate genuine consecutive daily study streak
        active_dates = sorted(
            {r.created_at.date() for r in results if r.created_at is not None},
            reverse=True
        )
        streak = 0
        if active_dates:
            today = datetime.utcnow().date()
            latest = active_dates[0]
            # Streak continues if learner practiced today or yesterday
            if latest in (today, today - timedelta(days=1)):
                expected = latest
                for d in active_dates:
                    if d == expected:
                        streak += 1
                        expected -= timedelta(days=1)
                    elif d > expected:
                        continue
                    else:
                        break

        # Topic progression mapping
        topic_history = defaultdict(list)
        for r in results:
            t = r.topic or 'General'
            topic_history[t].append({
                'score': r.percentage,
                'date': r.created_at.isoformat() if r.created_at else None
            })
            
        topic_progression = []
        for t, attempts in topic_history.items():
            topic_progression.append({
                'topic': t,
                'attemptsCount': len(attempts),
                'firstScore': attempts[0]['score'],
                'latestScore': attempts[-1]['score'],
                'netGain': round(attempts[-1]['score'] - attempts[0]['score'], 1)
            })
            
        return {
            'masteryLevel': level,
            'masteryScore': round(avg_score, 1),
            'totalAttempts': total_quizzes,
            'improvementRate': improvement,
            'streakDays': streak,
            'retrievalEfficiency': 'High Retention' if avg_score >= 80 else 'Building Fluency',
            'academicReference': 'Karpicke & Blunt (2011): Retrieval practice produces more durable learning than elaborative studying or concept mapping.',
            'topicProgression': topic_progression
        }
        
    def get_mistake_patterns(self, user_id: str) -> Dict[str, Any]:
        """Analyze mistakes across quizzes and generate Socratic remediation hints."""
        quizzes = QuizData.query.filter_by(user_id=user_id, is_submitted=True, is_archived=False).all()
        quiz_results = QuizResult.query.filter_by(user_id=user_id, is_archived=False).all()
        results_by_quiz = {r.quiz_id: r for r in quiz_results}
        
        concept_mistakes = defaultdict(int)
        
        for q in quizzes:
            q_result = results_by_quiz.get(q.id)
            if not q_result:
                continue

            # If user scored 100%, there are zero mistakes for this quiz!
            if q_result.total_questions > 0 and q_result.score == q_result.total_questions:
                continue

            stored = q.get_stored_data()
            questions = stored.get('questions', [])
            submitted_answers = (q_result.answers or {}).get('submitted', [])

            if isinstance(submitted_answers, list) and len(submitted_answers) == len(questions):
                grade_info = q.grade(submitted_answers)
                for res_item in grade_info.get('results', []):
                    if not res_item.get('isCorrect'):
                        cid = res_item.get('topic') or res_item.get('conceptId') or 'Core Principle'
                        concept_mistakes[cid] += 1
            else:
                if q_result.percentage < 80.0:
                    topic = q.topic or 'General Concept'
                    concept_mistakes[topic] += max(1, q_result.total_questions - q_result.score)
                
        # Top weak areas
        weak_concepts = sorted(concept_mistakes.items(), key=lambda x: x[1], reverse=True)[:5]
        
        mistake_items = []
        for concept, count in weak_concepts:
            mistake_items.append({
                'concept': concept,
                'mistakeCount': count,
                'recommendation': f"Ask AI Tutor: 'Can you guide me through {concept} with a real-life analogy?'",
                'action': 'socratic_remediation'
            })
            
        return {
            'totalMistakesTracked': sum(concept_mistakes.values()),
            'weakAreas': mistake_items,
            'educationalNote': 'Mistakes are normal and necessary for cognitive schema reconstruction.'
        }
        
    def get_recommendations(self, user_id: str) -> List[Dict[str, Any]]:
        """AI-driven study recommendations based on student's weak areas and quizzes."""
        progress = self.get_progress(user_id)
        recommendations = []
        
        for topic, data in progress.get('topicProgress', {}).items():
            if data['percentage'] < 75.0:
                recommendations.append({
                    'type': 'quiz_retake',
                    'title': f"Retake & Master: {topic}",
                    'description': f"Current accuracy is {data['percentage']}%. Practice a 5-question Socratic retake to solidify memory traces.",
                    'topic': topic,
                    'priority': 'high'
                })
            else:
                recommendations.append({
                    'type': 'retrieval_challenge',
                    'title': f"Deepen Mastery: {topic}",
                    'description': f"Strong score ({data['percentage']}%). Challenge yourself with scenario-based critical thinking questions.",
                    'topic': topic,
                    'priority': 'medium'
                })
                
        if not recommendations:
            recommendations.append({
                'type': 'onboarding',
                'title': "Begin Retrieval Practice",
                'description': "Select your study materials or choose a topic to take your first diagnostic quiz.",
                'topic': 'Getting Started',
                'priority': 'normal'
            })
            
        return recommendations
        
    def get_mastery_dashboard(self, user_id: str) -> Dict[str, Any]:
        """Unified analytics combining profile, progress, mistakes, and recommendations."""
        return {
            'profile': self.get_learning_profile(user_id),
            'progress': self.get_progress(user_id),
            'mistakes': self.get_mistake_patterns(user_id),
            'recommendations': self.get_recommendations(user_id)
        }


progress_service = ProgressService()
