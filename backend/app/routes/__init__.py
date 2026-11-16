from flask import Blueprint

api_bp = Blueprint('api', __name__)

# Register auth routes
from app.routes.auth import auth_bp
api_bp.register_blueprint(auth_bp, url_prefix='/auth')

# Register chat routes
from app.routes.chat import chat_bp
api_bp.register_blueprint(chat_bp, url_prefix='/chat')

# Register content routes
from app.routes.content import content_bp
api_bp.register_blueprint(content_bp, url_prefix='/content')

# Register quiz routes
from app.routes.quiz import quiz_bp
api_bp.register_blueprint(quiz_bp, url_prefix='/quiz')

# Register progress routes
from app.routes.progress import progress_bp
api_bp.register_blueprint(progress_bp, url_prefix='/progress')

# Register seed routes for demo data
from app.routes.seed import seed_bp
api_bp.register_blueprint(seed_bp)

# Register friends routes
from app.routes.friends import friends_bp
api_bp.register_blueprint(friends_bp, url_prefix='/friends')

# Register direct chat routes (extends /chat)
from app.routes.direct_chat import direct_chat_bp
api_bp.register_blueprint(direct_chat_bp, url_prefix='/chat')

# Register groups routes
from app.routes.groups import groups_bp
api_bp.register_blueprint(groups_bp, url_prefix='/groups')

# Register calls routes
from app.routes.calls import calls_bp
api_bp.register_blueprint(calls_bp, url_prefix='/calls')

# Register admin routes
from app.routes.admin import admin_bp
api_bp.register_blueprint(admin_bp, url_prefix='/admin')

# Register academic routes
from app.routes.academic import academic_bp
api_bp.register_blueprint(academic_bp, url_prefix='/academic')



@api_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return {'status': 'healthy', 'message': 'Knowrizon API is running'}


@api_bp.route('/health/nebius', methods=['GET'])
def test_nebius_health():
    """
    Test Nebius Token Factory connection and return non-billable diagnostic status.
    Strictly zero-inference: queries GET /models catalog only, never executes billable chat or embedding calls.
    """
    import os
    import json
    import urllib.request
    import urllib.error
    from flask import jsonify
    from app.services.nebius_config import _resolve_api_key
    from app.services.nebius_policy import (
        PINNED_ROUTES,
        APPROVED_MODEL_IDS,
        NebiusOperation
    )
    
    api_key = (os.environ.get("NEBIUS_API_KEY") or _resolve_api_key() or "").strip()
    masked_key = api_key[:12] + "..." + api_key[-6:] if len(api_key) > 20 else "NOT SET"
    
    eu_route = PINNED_ROUTES[NebiusOperation.GENERAL_TEXT]
    us_route = PINNED_ROUTES[NebiusOperation.VISION]
    emb_route = PINNED_ROUTES[NebiusOperation.EMBEDDINGS]
    
    status = {
        "status": "healthy",
        "configured_key": masked_key,
        "pinned_models": {
            "general_text": eu_route.model_id,
            "embeddings": emb_route.model_id,
            "vision": us_route.model_id
        },
        "endpoints": {
            "eu_north1": eu_route.base_url,
            "us_central1": us_route.base_url
        },
        "catalog_check": {}
    }
    
    if not api_key:
        status["connected"] = False
        status["status"] = "unhealthy"
        status["error"] = "NEBIUS_API_KEY is not configured"
        return jsonify(status), 503
        
    # Check EU catalog (non-billable GET /models)
    try:
        req_eu = urllib.request.Request(
            eu_route.base_url.rstrip('/') + '/models',
            headers={"Authorization": f"Bearer {api_key}"}
        )
        with urllib.request.urlopen(req_eu, timeout=10.0) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            models = {m.get('id') for m in data.get('data', [])}
            status["catalog_check"]["eu_north1"] = {
                "connected": True,
                "gpt_oss_120b_available": eu_route.model_id in models,
                "qwen3_embedding_available": emb_route.model_id in models
            }
    except Exception as e:
        status["catalog_check"]["eu_north1"] = {
            "connected": False,
            "error": str(e)
        }
        
    # Check US catalog (non-billable GET /models)
    try:
        req_us = urllib.request.Request(
            us_route.base_url.rstrip('/') + '/models',
            headers={"Authorization": f"Bearer {api_key}"}
        )
        with urllib.request.urlopen(req_us, timeout=10.0) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            models = {m.get('id') for m in data.get('data', [])}
            status["catalog_check"]["us_central1"] = {
                "connected": True,
                "qwen3_8_27b_available": us_route.model_id in models
            }
    except Exception as e:
        status["catalog_check"]["us_central1"] = {
            "connected": False,
            "error": str(e)
        }
        
    status["connected"] = any(
        c.get("connected") for c in status["catalog_check"].values()
    )
    return jsonify(status), 200
