"""
Diagnostic script to verify Nebius Token Factory API key, models, and chat completion.

Run with:
    python test_nebius.py
    or double-click test_nebius.bat
"""
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

# Embedded verified fallback key
DEFAULT_KEY = "v1.CmMKHHN0YXRpY2tleS1lMDB0MDU1bW03dzc5ZHd0Nm0SIXNlcnZpY2VhY2NvdW50LWUwMHFxMXgyMjdwOWF5Z3ZjajILCN7FsNcGEODpr1Q6DAjbyMiiBxCAuMHsAUACWgNlMDA.AAAAAAAAAAEOHpKFiyRSKHsKT_KyQPjSAaP6RNJOXy3AfHLomCXNba_9FeNO1wBMf511XJ79Wl9t8fgdKH3R0eOuan8RABUD"

# Resolve key
api_key = os.environ.get("NEBIUS_API_KEY", "").strip()
if not api_key:
    try:
        from dotenv import load_dotenv
        cur_dir = Path(__file__).resolve().parent
        load_dotenv(dotenv_path=cur_dir / '.env')
        load_dotenv(dotenv_path=cur_dir.parent / '.env')
        load_dotenv()
        api_key = os.environ.get("NEBIUS_API_KEY", "").strip()
    except Exception:
        pass

if not api_key or api_key.startswith("serviceaccount-"):
    api_key = DEFAULT_KEY

base_url = "https://api.tokenfactory.eu-north1.nebius.com/v1"

print("=" * 65)
print("  Nebius AI Token Factory Live Diagnostic Tool")
print("=" * 65)
masked_key = api_key[:12] + "..." + api_key[-6:] if len(api_key) > 20 else "***"
print(f"API Key configured : {masked_key}")
print(f"Base URL           : {base_url}/")
print("-" * 65)

# Step 1: List models via direct HTTP
print("[1/2] Connecting to Nebius & listing models...")
req = urllib.request.Request(
    f"{base_url}/models",
    headers={"Authorization": f"Bearer {api_key}"}
)

available_models = []
try:
    with urllib.request.urlopen(req, timeout=15.0) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        available_models = [m.get('id') for m in data.get('data', [])]
        print(f"✅ Connection successful! Found {len(available_models)} available models.")
        print("Sample models available on your account:")
        for m in available_models[:8]:
            print(f"   • {m}")
        if len(available_models) > 8:
            print(f"   ... and {len(available_models) - 8} more.")
except urllib.error.HTTPError as he:
    err_body = he.read().decode('utf-8', errors='ignore')
    print(f"❌ HTTP Error {he.code}: {err_body}")
    print("\nAction needed:")
    if he.code == 401:
        print("Your Nebius API key is invalid or expired. Generate a fresh key at:")
        print("https://tokenfactory.nebius.com/project/api-keys")
    sys.exit(1)
except Exception as e:
    print(f"❌ Connection error: {e}")
    sys.exit(1)

# Step 2: Test Chat Completion
preferred_models = [
    "openai/gpt-oss-120b"
]
test_model = None
for pm in preferred_models:
    if pm in available_models:
        test_model = pm
        break
if not test_model and available_models:
    test_model = available_models[0]

print(f"\n[2/2] Testing live chat completion with model: '{test_model}'...")
chat_payload = json.dumps({
    "model": test_model,
    "messages": [
        {"role": "system", "content": "You are Knowri, an AI tutor."},
        {"role": "user", "content": "Reply in one cheerful sentence saying you are ready to help."}
    ],
    "temperature": 0.7,
    "max_tokens": 50
}).encode('utf-8')

chat_req = urllib.request.Request(
    f"{base_url}/chat/completions",
    data=chat_payload,
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    },
    method="POST"
)

try:
    with urllib.request.urlopen(chat_req, timeout=30.0) as resp:
        chat_data = json.loads(resp.read().decode('utf-8'))
        reply = chat_data['choices'][0]['message']['content'].strip()
        print(f"✅ Response from {test_model}:")
        print(f"   \"{reply}\"")
        print("\n" + "=" * 65)
        print("🎉 Nebius AI Token Factory is 100% OPERATIONAL & READY!")
        print("=" * 65)
except urllib.error.HTTPError as he:
    err_body = he.read().decode('utf-8', errors='ignore')
    print(f"❌ Chat Completion HTTP Error {he.code}: {err_body}")
except Exception as e:
    print(f"❌ Chat Completion failed: {e}")
