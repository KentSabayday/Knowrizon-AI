"""
Conversation and Message models for chat history persistence.
Supports workspace-linked documents, quizzes, and study topics.
"""
import json
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import db


class Conversation(db.Model):
    """Model for storing chat conversations with workspace context."""
    __tablename__ = 'conversations'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    title = Column(String(255), nullable=True)  # Auto-generated from first message or topic
    topic = Column(String(255), nullable=True)  # Study topic (e.g., "Calculus", "Integrative Programming")
    content_ids_json = Column(Text, nullable=True)  # JSON array of linked content IDs
    quiz_ids_json = Column(Text, nullable=True)  # JSON array of generated quiz IDs
    study_mode = Column(String(20), default='socratic')  # 'socratic' or 'direct'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship('User', backref='conversations')
    messages = relationship('Message', backref='conversation', lazy='dynamic', 
                          order_by='Message.created_at', cascade='all, delete-orphan')
    
    # ── JSON property helpers ──
    
    @property
    def content_ids(self) -> List[str]:
        """Get linked content IDs."""
        return json.loads(self.content_ids_json) if self.content_ids_json else []
    
    @content_ids.setter
    def content_ids(self, value: Optional[List[str]]) -> None:
        self.content_ids_json = json.dumps(value) if value else None
    
    @property
    def quiz_ids(self) -> List[str]:
        """Get linked quiz IDs."""
        return json.loads(self.quiz_ids_json) if self.quiz_ids_json else []
    
    @quiz_ids.setter
    def quiz_ids(self, value: Optional[List[str]]) -> None:
        self.quiz_ids_json = json.dumps(value) if value else None
    
    def add_content_id(self, content_id: str) -> None:
        """Link a content item to this conversation."""
        ids = self.content_ids
        if content_id not in ids:
            ids.append(content_id)
            self.content_ids = ids
    
    def add_quiz_id(self, quiz_id: str) -> None:
        """Link a quiz to this conversation."""
        ids = self.quiz_ids
        if quiz_id not in ids:
            ids.append(quiz_id)
            self.quiz_ids = ids
    
    def to_dict(self, include_messages=False):
        """Convert conversation to dictionary."""
        result = {
            'id': self.id,
            'userId': self.user_id,
            'title': self.title or 'New Conversation',
            'topic': self.topic,
            'studyMode': self.study_mode or 'socratic',
            'contentIds': self.content_ids,
            'quizIds': self.quiz_ids,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'isActive': self.is_active,
            'messageCount': self.messages.count()
        }
        
        if include_messages:
            result['messages'] = [msg.to_dict() for msg in self.messages.all()]
        
        return result
    
    def get_context_messages(self, limit=20):
        """Get recent messages for AI context."""
        recent_messages = self.messages.order_by(Message.created_at.desc()).limit(limit).all()
        return [
            {'role': msg.role, 'content': msg.content}
            for msg in reversed(recent_messages)
        ]


class Message(db.Model):
    """Model for storing individual chat messages."""
    __tablename__ = 'messages'
    
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey('conversations.id'), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    message_id = Column(String(36), nullable=True)  # UUID for frontend reference
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert message to dictionary."""
        return {
            'id': self.id,
            'conversationId': self.conversation_id,
            'role': self.role,
            'content': self.content,
            'messageId': self.message_id,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'timestamp': self.created_at.isoformat() if self.created_at else None
        }
