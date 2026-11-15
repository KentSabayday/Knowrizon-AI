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
    """Test Nebius Token Factory connection and return live diagnostic status."""
    import os
    import json
    import urllib.request
    import urllib.error
    from flask import jsonify
    from app.services.agent_orchestrator import agent_orchestrator
    from app.services.nebius_config import _resolve_api_key
    
    cfg = agent_orchestrator._config
    api_key = (cfg.api_key or os.environ.get("NEBIUS_API_KEY") or _resolve_api_key() or "").strip()
    base_url = cfg.base_url or "https://api.tokenfactory.eu-north1.nebius.com/v1/"
    masked_key = api_key[:12] + "..." + api_key[-6:] if len(api_key) > 20 else "NOT SET"
    
    status = {
        "base_url": cfg.base_url,
        "configured_key": masked_key,
        "tutor_model": cfg.tutor_model.model_id,
        "fallback_model": cfg.tutor_model.fallback_model_id,
    }
    
    if not api_key:
        status["connected"] = False
        status["error"] = "API key not found"
        return jsonify(status), 503
        
    req = urllib.request.Request(
        base_url.rstrip('/') + '/models',
        headers={"Authorization": f"Bearer {api_key}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=15.0) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            models = [m.get('id') for m in data.get('data', [])]
            status["connected"] = True
            status["available_models_count"] = len(models)
            status["sample_models"] = models[:8]
            
            test_model = cfg.tutor_model.model_id
            if test_model not in models and models:
                test_model = models[0]
                
            test_req = urllib.request.Request(
                base_url.rstrip('/') + '/chat/completions',
                data=json.dumps({
                    "model": test_model,
                    "messages": [{"role": "user", "content": "Reply: 'OK'"}],
                    "max_tokens": 5
                }).encode('utf-8'),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                },
                method="POST"
            )
            with urllib.request.urlopen(test_req, timeout=15.0) as test_resp:
                test_data = json.loads(test_resp.read().decode('utf-8'))
                status["live_chat_test"] = {
                    "model": test_model,
                    "status": "success",
                    "reply": test_data['choices'][0]['message']['content'].strip()
                }
            return jsonify(status), 200
    except urllib.error.HTTPError as he:
        err_body = he.read().decode('utf-8', errors='ignore')
        status["connected"] = False
        status["http_code"] = he.code
        status["error"] = f"HTTP {he.code}: {err_body}"
        return jsonify(status), 500
    except Exception as e:
        status["connected"] = False
        status["error"] = f"{type(e).__name__}: {str(e)}"
        return jsonify(status), 500
