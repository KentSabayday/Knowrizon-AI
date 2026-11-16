"""
Diagnostic script to verify Nebius Token Factory configuration, policy enforcement, and endpoint reachability.

By default, this tool performs ZERO inference calls (non-billable).
It checks:
1. Pinned model policy and routing rules.
2. API key resolution and masking.
3. Provider model catalog presence via GET /models (zero inference).

To run an opt-in billable smoke test with explicit consent:
    python test_nebius.py --smoke
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

# Add backend directory to sys.path so app modules are resolvable
cur_dir = Path(__file__).resolve().parent
if str(cur_dir) not in sys.path:
    sys.path.insert(0, str(cur_dir))

from app.services.nebius_policy import (
    PINNED_ROUTES,
    APPROVED_MODEL_IDS,
    APPROVED_BASE_URLS,
    NebiusOperation,
    validate_operation_route
)
from app.services.nebius_config import _resolve_api_key

parser = argparse.ArgumentParser(description="Nebius Token Factory Policy & Diagnostic Tool")
parser.add_argument("--smoke", action="store_true", help="Perform opt-in live inference smoke test on pinned models")
args = parser.parse_args()

print("=" * 70)
print("  KnowRizon AI — Nebius Token Factory Verification & Policy Tool")
print("=" * 70)

# Check policy definitions
print("[1/3] Verifying pinned model routes and regional boundaries...")
for op, route in PINNED_ROUTES.items():
    print(f"   • {op.value.upper():<14}: {route.model_id:<25} -> {route.base_url}")
    validate_operation_route(op, route.model_id, route.base_url)
print("   ✅ Pinned policy strictly maps exactly 3 approved models.")

# Resolve key
api_key = (os.environ.get("NEBIUS_API_KEY") or _resolve_api_key() or "").strip()
masked_key = api_key[:12] + "..." + api_key[-6:] if len(api_key) > 20 else ("NOT SET" if not api_key else "***")
print(f"\n[2/3] API Key resolution: {masked_key}")

if not api_key:
    print("   ⚠️ No NEBIUS_API_KEY detected in environment or .env file.")
    print("   Please configure NEBIUS_API_KEY before running live network checks.")
    sys.exit(0)

# Check Catalogs (Non-billable GET /models)
print("\n[3/3] Inspecting provider catalog (Zero-Inference GET /models)...")
for region_name, base_url in [
    ("eu-north1 (General Text & Embeddings)", PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].base_url),
    ("us-central1 (Vision)", PINNED_ROUTES[NebiusOperation.VISION].base_url)
]:
    req = urllib.request.Request(
        base_url.rstrip('/') + '/models',
        headers={"Authorization": f"Bearer {api_key}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            models = {m.get('id') for m in data.get('data', [])}
            print(f"   • {region_name}: Connected! Catalog contains {len(models)} models.")
            for op, route in PINNED_ROUTES.items():
                if route.base_url == base_url:
                    is_avail = route.model_id in models
                    status_icon = "✅" if is_avail else "⚠️"
                    print(f"     {status_icon} Pinned model '{route.model_id}': {'Available' if is_avail else 'Not in catalog'}")
    except urllib.error.HTTPError as he:
        print(f"   ❌ {region_name}: HTTP {he.code} - {he.reason}")
    except Exception as e:
        print(f"   ❌ {region_name}: Connection failed: {e}")

if not args.smoke:
    print("\n✅ Verification complete (Zero inference calls made).")
    print("   To execute live inference smoke testing, pass --smoke.")
    sys.exit(0)

# Opt-in Smoke Test
print("\n" + "=" * 70)
print("  OPT-IN LIVE INFERENCE SMOKE TEST (--smoke)")
print("=" * 70)

from app.services.nebius_client import NebiusClient
client = NebiusClient()

# Test 1: General Text
try:
    print("   Testing chat_completion (openai/gpt-oss-120b)...")
    res = client.chat_completion(
        messages=[{"role": "user", "content": "Reply with 'OK'."}],
        max_tokens=5
    )
    print(f"   ✅ Chat OK: {res.get('choices', [{}])[0].get('message', {}).get('content', '').strip()}")
except Exception as e:
    print(f"   ❌ Chat failed: {e}")

# Test 2: Embedding
try:
    print("   Testing create_embedding (Qwen/Qwen3-Embedding-8B)...")
    emb = client.create_embedding("Sample text for KnowRizon vector retrieval.")
    print(f"   ✅ Embedding OK: vector dimension = {len(emb)}")
except Exception as e:
    print(f"   ❌ Embedding failed: {e}")

print("\nSmoke test complete.")
