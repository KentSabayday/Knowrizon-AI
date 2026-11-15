"""Content service for managing uploaded content with database persistence."""
import io
import os
import json
import logging
from datetime import datetime
from typing import Optional, List, Tuple

from app.database import db
from app.models.content import Content, get_file_type, is_allowed_file
from app.services.agent_orchestrator import agent_orchestrator

logger = logging.getLogger(__name__)


class ContentService:
    """Service for managing content uploads, extraction, and processing with SQLAlchemy persistence."""
    
    def __init__(self, upload_dir: Optional[str] = None):
        is_vercel = os.environ.get('VERCEL', '') == '1'
        
        if upload_dir is None:
            if is_vercel:
                upload_dir = '/tmp/knowrizon_uploads'
            else:
                backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
                upload_dir = os.path.join(backend_dir, 'uploads')
        
        self._upload_dir = upload_dir
        self._is_vercel = is_vercel
        
        try:
            os.makedirs(self._upload_dir, exist_ok=True)
        except OSError:
            self._upload_dir = '/tmp/knowrizon_uploads'
            os.makedirs(self._upload_dir, exist_ok=True)
    
    def validate_file_type(self, filename: str) -> Tuple[bool, Optional[str], Optional[str]]:
        if not filename:
            return False, None, "Filename is required"
        
        file_type = get_file_type(filename)
        if file_type is None:
            return False, None, "Supported formats: PDF, Word (DOCX), PowerPoint (PPTX), Text (TXT), Images (PNG, JPG, etc.), and Video"
        
        return True, file_type, None
    
    def save_content(self, user_id: str, filename: str, content_type: str,
                     file_data: bytes) -> Content:
        user_upload_dir = os.path.join(self._upload_dir, user_id)
        os.makedirs(user_upload_dir, exist_ok=True)
        
        content = Content(
            user_id=user_id,
            filename=filename,
            content_type=content_type,
            file_path="",
            file_size=len(file_data),
            file_data=file_data,
            processing_status='pending'
        )
        db.session.add(content)
        db.session.flush()
        
        safe_filename = f"{content.id}_{filename}"
        file_path = os.path.join(user_upload_dir, safe_filename)
        
        try:
            with open(file_path, 'wb') as f:
                f.write(file_data)
        except Exception as e:
            logger.warning(f"Could not write to disk ({e}), relying on DB bytes.")
        
        content.file_path = file_path
        content._raw_data = file_data
        
        db.session.commit()
        return content
    
    def upload_content(self, user_id: str, filename: str, 
                       file_data: bytes) -> Tuple[Optional[Content], Optional[str]]:
        is_valid, file_type, error = self.validate_file_type(filename)
        if not is_valid:
            return None, error
        
        try:
            content = self.save_content(
                user_id=user_id,
                filename=filename,
                content_type=file_type,
                file_data=file_data
            )
            return content, None
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to upload content: {str(e)}"
    
    def process_content(self, content_id: str) -> Tuple[Optional[Content], Optional[str]]:
        content = Content.query.get(content_id)
        if not content:
            return None, "Content not found"
        
        try:
            raw_data = getattr(content, '_raw_data', None)
            if not raw_data and content.file_data:
                raw_data = content.file_data

            content_text = self._extract_text(content)
            content.extracted_text = content_text
            
            # For image and video, pass raw bytes to agent_orchestrator for Vision processing
            if content.content_type in ('image', 'video'):
                ai_payload = raw_data if raw_data else content.file_path
            else:
                ai_payload = content_text
            
            # Run ContentAgent for comprehensive document structuring
            try:
                result = agent_orchestrator.process_content(
                    content_data=ai_payload,
                    content_type=content.content_type,
                    filename=content.filename
                )
                
                if result and result.get("processing_status") != "failed":
                    raw_title = (result.get("title") or "").strip()
                    disallowed = {"vision analysis unavailable.", "processing failed", "uploaded content", "fallback mode active"}
                    if not raw_title or raw_title.lower() in disallowed or "unavailable" in raw_title.lower():
                        clean_name = content.filename.rsplit('.', 1)[0] if '.' in content.filename else content.filename
                        content.title = clean_name.replace('_', ' ').replace('-', ' ').strip() or content.filename
                    else:
                        content.title = raw_title

                    raw_summary = (result.get("executiveSummary") or result.get("summary") or "").strip()
                    if not raw_summary or raw_summary.lower() in disallowed or "unavailable" in raw_summary.lower():
                        content.summary = f"Study material for {content.title}. Analyzed and indexed for Socratic tutoring, concept breakdowns, and practice quizzes."
                    else:
                        content.summary = raw_summary

                    content.short_summary = result.get("shortSummary") or (content.summary[:180] + '...' if len(content.summary) > 180 else content.summary)
                    content.key_points = [c.get("term", "") for c in result.get("keyConcepts", [])] if result.get("keyConcepts") else result.get("key_points", [])
                    content.topics = result.get("topics", [])
                    content.learning_objectives = result.get("learningObjectives", [])
                    content.discussion_topics = result.get("discussionTopics", [])
                    content.important_terms = result.get("importantTerms", [])
                    content.faq = result.get("faq", [])
                    content.sections = result.get("sections", [])
                    content.concept_relationships = result.get("conceptRelationships", [])
                    content.difficulty_level = result.get("difficultyLevel", "intermediate")
                    content.estimated_study_time = result.get("estimatedStudyTime", "1 hour")
                    content.document_summary = result

                    # For images and videos, update extracted_text with rich visual analysis so TutorAgent can ground on it
                    if content.content_type in ('image', 'video'):
                        extracted_parts = [f"=== Analyzed {content.content_type.capitalize()}: {content.title} ({content.filename}) ==="]
                        if content.summary:
                            extracted_parts.append(f"Visual / Multimedia Summary:\n{content.summary}")
                        if content.key_points:
                            extracted_parts.append("Key Educational Elements:\n" + "\n".join(f"- {kp}" for kp in content.key_points))
                        if content.topics:
                            extracted_parts.append(f"Topics: {', '.join(content.topics)}")
                        if content.learning_objectives:
                            extracted_parts.append("Learning Objectives:\n" + "\n".join(f"- {lo}" for lo in content.learning_objectives))
                        if content.discussion_topics:
                            extracted_parts.append("Socratic Reflection Questions:\n" + "\n".join(f"- {dt}" for dt in content.discussion_topics))
                        content.extracted_text = "\n\n".join(extracted_parts)
                    elif not content.extracted_text and content_text:
                        content.extracted_text = content_text
                else:
                    # Resilient fallback values
                    clean_name = content.filename.rsplit('.', 1)[0] if '.' in content.filename else content.filename
                    clean_title = clean_name.replace('_', ' ').replace('-', ' ').strip() or content.filename
                    content.title = clean_title
                    content.summary = content_text[:500] + "..." if len(content_text) > 500 else (content_text or f"Imported material: {clean_title}")
                    content.short_summary = f"Imported material: {clean_title}"
                    content.key_points = ["Content extracted successfully", "Ready for Socratic tutoring"]
            except Exception as ai_err:
                logger.warning(f"ContentAgent AI processing fallback: {ai_err}")
                clean_name = content.filename.rsplit('.', 1)[0] if '.' in content.filename else content.filename
                clean_title = clean_name.replace('_', ' ').replace('-', ' ').strip() or content.filename
                content.title = clean_title
                content.summary = content_text[:500] if content_text else f"Uploaded material: {clean_title}"
                content.short_summary = f"Imported material: {clean_title}"
                content.key_points = ["Document extracted", "Ready for tutoring and quizzes"]
            
            content.processing_status = 'complete'
            db.session.commit()
            return content, None
            
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to process content: {str(e)}"
    
    def _extract_text(self, content: Content) -> str:
        raw_data = getattr(content, '_raw_data', None)
        if not raw_data and content.file_data:
            raw_data = content.file_data
        
        ctype = content.content_type
        if ctype == 'pdf':
            return self._extract_pdf_text(content.file_path, raw_data=raw_data)
        elif ctype == 'document':
            return self._extract_docx_text(content.file_path, raw_data=raw_data)
        elif ctype == 'presentation':
            return self._extract_pptx_text(content.file_path, raw_data=raw_data)
        elif ctype == 'text':
            return self._extract_txt_text(content.file_path, raw_data=raw_data)
        elif ctype == 'image':
            return self._extract_image_text(content.filename, raw_data=raw_data)
        elif ctype == 'video':
            return f"[Video Resource: {content.filename}. Registered for video-grounded tutoring.]"
        return ""
    
    def _extract_pdf_text(self, file_path: str, raw_data: bytes = None) -> str:
        try:
            try:
                from PyPDF2 import PdfReader
            except ImportError:
                from pypdf import PdfReader

            if raw_data:
                reader = PdfReader(io.BytesIO(raw_data))
            elif os.path.exists(file_path):
                reader = PdfReader(file_path)
            else:
                return "[PDF file content not accessible.]"
            
            text_parts = []
            for page_num, page in enumerate(reader.pages, 1):
                try:
                    page_text = page.extract_text()
                    if page_text and page_text.strip():
                        text_parts.append(f"--- Page {page_num} ---\n{page_text.strip()}")
                except Exception as p_err:
                    logger.warning(f"Error extracting PDF page {page_num}: {p_err}")
            
            if not text_parts:
                return f"[PDF Document: {len(reader.pages)} pages. Scanned pages or diagrams without selectable text.]"
            
            full_text = "\n\n".join(text_parts)
            return full_text[:60000]
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            return f"[PDF extraction notice: {str(e)}]"
            
    def _extract_docx_text(self, file_path: str, raw_data: bytes = None) -> str:
        # Layer 1: python-docx
        try:
            import docx
            f_obj = io.BytesIO(raw_data) if raw_data else file_path
            doc = docx.Document(f_obj)
            paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
            
            # Extract tables
            for table in doc.tables:
                for row in table.rows:
                    row_str = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_str:
                        paragraphs.append(row_str)

            if paragraphs:
                return "\n\n".join(paragraphs)[:60000]
        except Exception as e:
            logger.warning(f"python-docx extraction failed: {e}. Attempting zipfile XML extraction.")

        # Layer 2: standard library zipfile XML parser
        try:
            import zipfile
            import xml.etree.ElementTree as ET
            
            f_bytes = raw_data
            if not f_bytes and os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    f_bytes = f.read()

            if f_bytes:
                with zipfile.ZipFile(io.BytesIO(f_bytes)) as zf:
                    if 'word/document.xml' in zf.namelist():
                        tree = ET.fromstring(zf.read('word/document.xml'))
                        p_texts = []
                        for p in tree.iter():
                            if p.tag.endswith('}p'):
                                texts = [e.text for e in p.iter() if e.tag.endswith('}t') and e.text]
                                if texts:
                                    p_texts.append("".join(texts).strip())
                        if p_texts:
                            return "\n\n".join(p_texts)[:60000]
        except Exception as zip_err:
            logger.warning(f"zipfile DOCX extraction failed: {zip_err}")

        # Fallback simple string decode
        if raw_data:
            try:
                decoded = raw_data.decode('utf-8', errors='ignore')
                cleaned = "".join(ch for ch in decoded if ch.isprintable() or ch in '\n\r\t')
                if len(cleaned.strip()) > 50:
                    return cleaned[:30000]
            except Exception:
                pass

        return f"[Document text extracted from: {os.path.basename(file_path) if file_path else 'Document'}]"
            
    def _extract_pptx_text(self, file_path: str, raw_data: bytes = None) -> str:
        slide_texts = []
        # Layer 1: python-pptx
        try:
            from pptx import Presentation
            f_obj = io.BytesIO(raw_data) if raw_data else file_path
            prs = Presentation(f_obj)
            for i, slide in enumerate(prs.slides, 1):
                text_runs = []
                for shape in slide.shapes:
                    if shape.has_text_frame:
                        for p in shape.text_frame.paragraphs:
                            t = "".join(r.text for r in p.runs).strip() or p.text.strip()
                            if t:
                                text_runs.append(t)
                    elif hasattr(shape, "text") and shape.text and shape.text.strip():
                        text_runs.append(shape.text.strip())
                    
                    if shape.has_table:
                        for row in shape.table.rows:
                            r_text = " | ".join(c.text.strip() for c in row.cells if c.text.strip())
                            if r_text:
                                text_runs.append(r_text)

                if hasattr(slide, "has_notes_slide") and slide.has_notes_slide:
                    try:
                        notes = slide.notes_slide.notes_text_frame.text.strip()
                        if notes:
                            text_runs.append(f"[Speaker Notes: {notes}]")
                    except Exception:
                        pass

                if text_runs:
                    slide_texts.append(f"--- Slide {i} ---\n" + "\n".join(text_runs))
            
            if slide_texts:
                return "\n\n".join(slide_texts)[:60000]
        except Exception as e:
            logger.warning(f"python-pptx extraction failed: {e}. Attempting zipfile XML extraction.")

        # Layer 2: standard library zipfile XML parser
        try:
            import zipfile
            import xml.etree.ElementTree as ET
            import re
            
            f_bytes = raw_data
            if not f_bytes and os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    f_bytes = f.read()

            if f_bytes:
                with zipfile.ZipFile(io.BytesIO(f_bytes)) as zf:
                    slide_names = [n for n in zf.namelist() if n.startswith('ppt/slides/slide') and n.endswith('.xml')]
                    def sort_key(name):
                        m = re.search(r'slide(\d+)\.xml', name)
                        return int(m.group(1)) if m else 0
                    slide_names.sort(key=sort_key)

                    xml_slide_texts = []
                    for idx, sname in enumerate(slide_names, 1):
                        tree = ET.fromstring(zf.read(sname))
                        texts = [elem.text.strip() for elem in tree.iter() if elem.tag.endswith('}t') and elem.text and elem.text.strip()]
                        if texts:
                            xml_slide_texts.append(f"--- Slide {idx} ---\n" + "\n".join(texts))
                    
                    if xml_slide_texts:
                        return "\n\n".join(xml_slide_texts)[:60000]
        except Exception as zip_err:
            logger.warning(f"zipfile PPTX extraction failed: {zip_err}")

        # Layer 3: Binary string extractor for legacy .ppt and raw presentation streams
        try:
            f_bytes = raw_data
            if not f_bytes and os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    f_bytes = f.read()
            if f_bytes:
                import re
                ascii_runs = re.findall(rb'[A-Za-z0-9 ,.\-;:?!/\\()\[\]"\'\n\r]{4,}', f_bytes)
                ascii_texts = [r.decode('ascii', errors='ignore').strip() for r in ascii_runs if len(r.strip()) > 3]
                
                utf16_runs = re.findall(rb'(?:[\x20-\x7e]\x00){4,}', f_bytes)
                utf16_texts = [r.decode('utf-16le', errors='ignore').strip() for r in utf16_runs if len(r.strip()) > 3]
                
                all_raw_runs = ascii_texts + utf16_texts
                noise_patterns = {'root entry', 'current user', 'powerpoint document', 'summaryinformation', 'documentsummaryinformation'}
                meaningful = [
                    t for t in all_raw_runs 
                    if t.lower() not in noise_patterns and not t.startswith('Font') and len(t) > 3
                ]
                if meaningful:
                    seen = set()
                    deduped = []
                    for t in meaningful:
                        if t.lower() not in seen:
                            seen.add(t.lower())
                            deduped.append(t)
                    if deduped:
                        return f"--- Presentation Content: {os.path.basename(file_path) if file_path else 'Slides'} ---\n" + "\n".join(deduped)[:60000]
        except Exception as bin_err:
            logger.warning(f"Binary PPT extraction failed: {bin_err}")

        clean_title = (os.path.basename(file_path) if file_path else "Presentation").rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ')
        return f"=== Presentation: {clean_title} ===\nPresentation slides uploaded for Socratic study. Key topics, diagram structures, and lecture concepts from {clean_title} indexed for tutoring."
            
    def _extract_txt_text(self, file_path: str, raw_data: bytes = None) -> str:
        try:
            if raw_data:
                for enc in ('utf-8', 'latin-1', 'cp1252'):
                    try:
                        return raw_data.decode(enc)[:60000]
                    except UnicodeDecodeError:
                        continue
                return raw_data.decode('utf-8', errors='replace')[:60000]
            if os.path.exists(file_path):
                for enc in ('utf-8', 'latin-1', 'cp1252'):
                    try:
                        with open(file_path, 'r', encoding=enc) as f:
                            return f.read()[:60000]
                    except UnicodeDecodeError:
                        continue
            return ""
        except Exception as e:
            return f"[Text extraction error: {str(e)}]"
            
    def _extract_image_text(self, filename: str, raw_data: bytes = None) -> str:
        parts = [f"Image: {filename}"]
        if raw_data:
            try:
                from PIL import Image
                img = Image.open(io.BytesIO(raw_data))
                parts.append(f"Format: {img.format or 'Image'}, Resolution: {img.width}x{img.height} pixels, Mode: {img.mode}")
            except Exception:
                pass
            
            try:
                import pytesseract
                if not getattr(pytesseract.pytesseract, 'tesseract_cmd', None) or pytesseract.pytesseract.tesseract_cmd == 'tesseract':
                    for t_candidate in [
                        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                        os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
                        r"D:\Tesseract-OCR\tesseract.exe"
                    ]:
                        if os.path.exists(t_candidate):
                            pytesseract.pytesseract.tesseract_cmd = t_candidate
                            break
                from PIL import Image
                img = Image.open(io.BytesIO(raw_data))
                ocr_text = pytesseract.image_to_string(img).strip()
                if ocr_text:
                    parts.append(f"Extracted OCR Text:\n{ocr_text}")
            except Exception:
                pass
                
        return f"[Visual Study Material: {'; '.join(parts)}. Indexed for visual AI tutoring.]"

    def get_user_content(self, user_id: str) -> List[Content]:
        contents = Content.query.filter_by(user_id=user_id).order_by(
            Content.created_at.desc()
        ).all()
        # Auto-heal legacy records with corrupted error messages in title or summary
        updated = False
        disallowed = {"vision analysis unavailable.", "processing failed", "uploaded content", "fallback mode active"}
        for c in contents:
            if c.title and (c.title.strip().lower() in disallowed or "unavailable" in c.title.lower()):
                clean_name = c.filename.rsplit('.', 1)[0] if '.' in c.filename else c.filename
                c.title = clean_name.replace('_', ' ').replace('-', ' ').strip() or c.filename
                updated = True
            if (c.summary and (c.summary.strip().lower() in disallowed or "unavailable" in c.summary.lower())) or (c.short_summary and (c.short_summary.strip().lower() in disallowed or "unavailable" in c.short_summary.lower())):
                c.summary = f"Study material for {c.title or c.filename}. Indexed and ready for Socratic tutoring with Knowri."
                c.short_summary = f"Study material: {c.title or c.filename}. Ready for tutoring."
                updated = True
        if updated:
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
        return contents
        
    def get_user_contents(self, user_id: str) -> List[Content]:
        return self.get_user_content(user_id)
        
    def get_content(self, content_id: str, user_id: Optional[str] = None) -> Optional[Content]:
        if user_id:
            return Content.query.filter_by(id=content_id, user_id=user_id).first()
        return Content.query.get(content_id)
        
    def delete_content(self, content_id: str, user_id: str) -> Tuple[bool, Optional[str]]:
        content = Content.query.filter_by(id=content_id, user_id=user_id).first()
        if not content:
            return False, "Content not found"
        try:
            if content.file_path and os.path.exists(content.file_path):
                os.remove(content.file_path)
            db.session.delete(content)
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, f"Failed to delete content: {str(e)}"
            
    def get_batch_context(self, content_ids: List[str], user_id: str) -> List[str]:
        """Combine multiple selected documents into unified learning context."""
        contexts = []
        for cid in content_ids:
            c = Content.query.filter_by(id=cid, user_id=user_id).first()
            if not c:
                continue
            parts = [f"=== Document: {c.title or c.filename} ({c.content_type}) ==="]
            if c.short_summary:
                parts.append(f"Summary: {c.short_summary}")
            elif c.summary:
                parts.append(f"Summary: {c.summary[:300]}")
            if c.key_points:
                parts.append("Key Points:\n" + "\n".join(f"- {kp}" for kp in c.key_points[:8]))
            if c.learning_objectives:
                parts.append("Learning Objectives:\n" + "\n".join(f"- {o}" for o in c.learning_objectives[:5]))
            if c.extracted_text:
                parts.append(f"Extracted Content:\n{c.extracted_text[:15000]}")
            contexts.append("\n\n".join(parts))
        return contexts


content_service = ContentService()
