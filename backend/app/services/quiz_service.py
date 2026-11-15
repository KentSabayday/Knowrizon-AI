"""Quiz service for quiz generation, multi-type assessments, and mastery management with database persistence."""
from typing import Optional, List, Tuple
import uuid
import json
from app.database import db
from app.models.quiz import Quiz, QuizQuestion, QuizResult as QuizResultDataclass
from app.models.quiz_data import QuizData
from app.models.conversation import Conversation
from app.services.agent_orchestrator import agent_orchestrator
from app.services.content_service import content_service


class QuizService:
    """Service for managing quizzes, question types, archive states, and results with persistence."""
    
    def generate_quiz(self, user_id: str, topic: Optional[str] = None,
                      content_id: Optional[str] = None,
                      content_ids: Optional[List[str]] = None,
                      question_count: int = 5,
                      source_mode: str = 'topic_based',
                      quiz_type: str = 'multiple_choice',
                      quiz_types: Optional[List[str]] = None,
                      conversation_id: Optional[int] = None) -> Tuple[Optional[Quiz], Optional[str]]:
        """
        Generate a quiz from a topic, single content, or multiple selected contents.
        Strictly document-grounded when content is supplied.
        """
        # Resolve content IDs
        selected_ids = []
        if content_ids and isinstance(content_ids, list):
            selected_ids = [cid for cid in content_ids if cid]
        elif content_id:
            selected_ids = [content_id]
            
        if not topic and not selected_ids:
            return None, "Either topic or study materials must be selected"
        
        if question_count < 1:
            return None, "Question count must be at least 1"
        
        # Build multi-file unified context and metadata
        content_summary = None
        content_meta = None
        
        if selected_ids:
            summaries = []
            filenames = []
            titles = []
            
            for cid in selected_ids:
                c = content_service.get_content(cid)
                if not c or c.user_id != user_id:
                    continue
                filenames.append(c.filename)
                titles.append(c.title or c.filename)
                
                # Combine summary & key concepts
                doc_summary = c.short_summary or c.summary or ""
                if c.learning_objectives:
                    doc_summary += "\nObjectives: " + "; ".join(c.learning_objectives[:4])
                if c.extracted_text:
                    doc_summary += f"\nSample text:\n{c.extracted_text[:4000]}"
                summaries.append(f"[{c.filename}]: {doc_summary}")
                
            if summaries:
                content_summary = "\n\n---\n\n".join(summaries)
                content_meta = {
                    'contentId': selected_ids[0],
                    'contentIds': selected_ids,
                    'filename': ", ".join(filenames),
                    'filenames': filenames,
                    'title': ", ".join(titles),
                    'documentCount': len(selected_ids)
                }
                source_mode = 'uploaded_only'

                # Infer and clean topic from selected documents if topic is generic
                if titles:
                    clean_titles = [t for t in titles if not t.lower().startswith('vision analysis')]
                    usable_title = ", ".join(clean_titles[:2]) if clean_titles else ", ".join(titles[:2])
                    if not topic or topic.strip().lower() in ('general knowledge', 'study studio', 'study quiz', 'general', 'workspace'):
                        topic = usable_title
        
        # Generate questions using QuizAgent with enhanced metadata & question type
        raw_questions = agent_orchestrator.generate_quiz(
            topic=topic,
            content=content_summary,
            question_count=question_count,
            source_mode=source_mode,
            content_meta=content_meta,
            quiz_type=quiz_type,
            quiz_types=quiz_types
        )
        
        if not raw_questions:
            return None, "Failed to generate quiz questions from provided materials"
        
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
            validated_questions.append(question)
        
        if not validated_questions:
            return None, "Failed to format valid quiz questions"
        
        # Create Quiz instance
        quiz_id = str(uuid.uuid4())
        quiz = Quiz(
            id=quiz_id,
            user_id=user_id,
            questions=validated_questions,
            topic=topic or (content_meta.get('title') if content_meta else 'Study Quiz'),
            content_id=selected_ids[0] if selected_ids else None
        )
        
        # Persist to database so it survives across requests
        quiz_data = QuizData(
            id=quiz.id,
            user_id=user_id,
            topic=quiz.topic,
            content_id=selected_ids[0] if selected_ids else None,
            conversation_id=conversation_id
        )
        
        enhanced_questions = []
        for i, q in enumerate(validated_questions):
            raw_q = raw_questions[i] if i < len(raw_questions) else {}
            q_format = raw_q.get('type')
            if quiz_types and len(quiz_types) > 0:
                if not q_format or q_format not in quiz_types:
                    q_format = quiz_types[i % len(quiz_types)]
            elif not q_format or (q_format == 'multiple_choice' and quiz_type and quiz_type != 'mixed'):
                q_format = quiz_type or 'multiple_choice'
            eq = {
                'id': q.id,
                'type': q_format,
                'question': q.question,
                'options': q.options,
                'correct_index': q.correct_index,
                'correct_answer': raw_q.get('correct_answer') or (q.options[q.correct_index] if q.options and 0 <= q.correct_index < len(q.options) else None),
                'explanation': q.explanation,
                'why_incorrect': raw_q.get('why_incorrect', ''),
                'socratic_followup': raw_q.get('socratic_followup', 'What evidence in the text clarifies this concept?'),
                'learningExplanation': raw_q.get('learningExplanation', ''),
                'difficulty': raw_q.get('difficulty', 'medium'),
                'topic': raw_q.get('topic', topic or ''),
                'conceptId': raw_q.get('conceptId', f'concept-{i+1}'),
                'source': raw_q.get('source') or {
                    'document': content_meta.get('filename', 'Selected Document') if content_meta else 'Course Materials',
                    'page': 1,
                    'section': topic or 'Key Concepts'
                },
                'validityScore': raw_q.get('validityScore', 95),
                'sources': raw_q.get('sources', []),
            }
            enhanced_questions.append(eq)
        
        quiz_data.questions = enhanced_questions
        
        quiz_data_meta = {
            'sourceMode': source_mode,
            'quizType': quiz_type,
            'contentMeta': content_meta,
            'conversationId': conversation_id,
            'questions': enhanced_questions,
        }
        quiz_data.questions_json = json.dumps(quiz_data_meta)
        
        db.session.add(quiz_data)
        
        # Link to conversation if present
        if conversation_id:
            conv = Conversation.query.filter_by(id=conversation_id, user_id=user_id).first()
            if conv:
                conv.add_quiz_id(quiz_data.id)
                
        db.session.commit()
        return quiz, None

    def archive_quiz(self, quiz_id: str, user_id: str) -> Tuple[bool, Optional[str]]:
        """Archive a quiz and hide it from default views."""
        qd = QuizData.query.filter_by(id=quiz_id, user_id=user_id).first()
        if not qd:
            return False, "Quiz not found"
        qd.is_archived = True
        db.session.commit()
        return True, None
        
    def unarchive_quiz(self, quiz_id: str, user_id: str) -> Tuple[bool, Optional[str]]:
        qd = QuizData.query.filter_by(id=quiz_id, user_id=user_id).first()
        if not qd:
            return False, "Quiz not found"
        qd.is_archived = False
        db.session.commit()
        return True, None

    def retake_quiz(self, quiz_id: str, user_id: str,
                    incorrect_only: bool = False) -> Tuple[Optional[str], Optional[str]]:
        quiz_data = QuizData.query.get(quiz_id)
        if not quiz_data:
            return None, "Quiz not found"
        if quiz_data.user_id != user_id:
            return None, "Not authorized to access this quiz"
        
        stored = quiz_data.get_stored_data()
        questions = stored.get('questions', [])
        if not questions:
            return None, "No questions found in quiz"

        # If retaking only missed questions, filter questions to only incorrect ones
        filtered_questions = questions
        if incorrect_only:
            from app.models.quiz_result import QuizResult
            last_result = QuizResult.query.filter_by(quiz_id=quiz_id, user_id=user_id).order_by(QuizResult.created_at.desc()).first()
            if last_result and last_result.answers:
                submitted = last_result.answers.get('submitted', [])
                if isinstance(submitted, list) and len(submitted) == len(questions):
                    grade_res = quiz_data.grade(submitted)
                    missed_indices = {i for i, r in enumerate(grade_res.get('results', [])) if not r.get('isCorrect')}
                    if missed_indices:
                        filtered_questions = [q for i, q in enumerate(questions) if i in missed_indices]
        
        new_id = str(uuid.uuid4())
        new_quiz = QuizData(
            id=new_id,
            user_id=user_id,
            topic=quiz_data.topic,
            content_id=quiz_data.content_id,
            conversation_id=quiz_data.conversation_id
        )
        
        new_quiz.questions_json = json.dumps({
            'sourceMode': stored.get('sourceMode', 'uploaded_only'),
            'contentMeta': stored.get('contentMeta'),
            'questions': filtered_questions,
            'parentAttemptId': quiz_id,
            'retakeType': 'incorrect_only' if incorrect_only else 'full',
        })
        
        db.session.add(new_quiz)
        db.session.commit()
        return new_id, None
    
    def get_quiz(self, quiz_id: str) -> Optional[Quiz]:
        quiz_data = QuizData.query.get(quiz_id)
        if not quiz_data:
            return None
        
        questions = [
            QuizQuestion(
                id=q.get('id', ''),
                question=q.get('question', ''),
                options=q.get('options', []),
                correct_index=q.get('correct_index', 0),
                explanation=q.get('explanation', ''),
            )
            for q in quiz_data.questions
        ]
        
        return Quiz(
            id=quiz_data.id,
            user_id=quiz_data.user_id,
            topic=quiz_data.topic,
            content_id=quiz_data.content_id,
            questions=questions,
            created_at=quiz_data.created_at,
        )
    
    def get_user_quizzes(self, user_id: str, include_archived: bool = False) -> List[dict]:
        query = QuizData.query.filter_by(user_id=user_id)
        if not include_archived:
            query = query.filter_by(is_archived=False)
        quiz_records = query.order_by(QuizData.created_at.desc()).all()
        return [q.to_client_dict() for q in quiz_records]

    def get_conversation_quizzes(self, conversation_id: int, user_id: str) -> List[dict]:
        quizzes = QuizData.query.filter_by(
            conversation_id=conversation_id,
            user_id=user_id
        ).order_by(QuizData.created_at.desc()).all()
        return [q.to_client_dict() for q in quizzes]
    
    def submit_quiz(self, quiz_id: str, user_id: str, 
                    answers: list) -> Tuple[Optional[QuizResultDataclass], Optional[str]]:
        quiz_data = QuizData.query.get(quiz_id)
        if not quiz_data:
            return None, "Quiz not found"
        if quiz_data.user_id != user_id:
            return None, "Not authorized to submit this quiz"
        
        questions_list = quiz_data.questions
        if len(answers) != len(questions_list):
            return None, f"Expected {len(questions_list)} answers, got {len(answers)}"
        
        if quiz_data.is_submitted:
            return None, "Quiz has already been submitted"
        
        grade_result = quiz_data.grade(answers)
        quiz_data.is_submitted = True
        db.session.commit()
        
        result = QuizResultDataclass(
            id=str(uuid.uuid4()),
            quiz_id=quiz_id,
            user_id=user_id,
            answers=answers,
            score=grade_result['score'],
            total_questions=grade_result['totalQuestions'],
            correct_count=grade_result['correctCount'],
        )
        return result, None


quiz_service = QuizService()
