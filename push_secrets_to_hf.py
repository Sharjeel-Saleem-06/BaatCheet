#!/usr/bin/env python3
"""
Push secrets to HuggingFace Space using the HuggingFace Hub API
"""
import os
import sys

try:
    from huggingface_hub import HfApi
except ImportError:
    print("Installing huggingface_hub...")
    os.system("pip3 install huggingface_hub -q")
    from huggingface_hub import HfApi

# Read the .env file
env_file = "/Users/muhammadsharjeel/Documents/BaatCheet/backend/.env"

secrets = {}
with open(env_file, 'r') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            value = value.strip('"').strip("'")
            if value and not value.startswith('your') and not value.startswith('sk_test'):
                secrets[key] = value

# Filter to only include API keys and important config
important_keys = [
    'JWT_SECRET',
]

# API key prefixes to include
api_prefixes = [
    'GROQ_API_KEY', 'DEEPSEEK_API_KEY', 'OPENROUTER_API_KEY',
    'HUGGINGFACE_API_KEY', 'GEMINI_API_KEY', 'OCR_SPACE_API_KEY',
    'BRAVE_SEARCH_KEY', 'SERPAPI_KEY', 'ELEVENLABS_API_KEY',
]

filtered_secrets = {}
for key, value in secrets.items():
    if key in important_keys:
        filtered_secrets[key] = value
    else:
        for prefix in api_prefixes:
            if key.startswith(prefix):
                filtered_secrets[key] = value
                break

print(f"Found {len(filtered_secrets)} secrets to upload")

# Get HuggingFace token from environment or prompt
hf_token = os.environ.get('HF_TOKEN')
if not hf_token:
    print("\nYou need to provide your HuggingFace token.")
    print("Get it from: https://huggingface.co/settings/tokens")
    print("Make sure it has 'write' permissions.")
    hf_token = input("\nEnter your HuggingFace token: ").strip()

if not hf_token:
    print("No token provided. Exiting.")
    sys.exit(1)

# Initialize the API
api = HfApi(token=hf_token)

# Space repo ID
repo_id = "sharry121/baatcheet"
repo_type = "space"

print(f"\nUploading secrets to {repo_id}...")
print("="*50)

success_count = 0
fail_count = 0

for key, value in sorted(filtered_secrets.items()):
    try:
        api.add_space_secret(
            repo_id=repo_id,
            key=key,
            value=value,
        )
        masked = value[:6] + '...' + value[-4:] if len(value) > 14 else value[:4] + '...'
        print(f"✅ {key}: {masked}")
        success_count += 1
    except Exception as e:
        print(f"❌ {key}: Failed - {str(e)[:50]}")
        fail_count += 1

print("="*50)
print(f"\nDone! Uploaded {success_count} secrets, {fail_count} failed.")

if success_count > 0:
    print("\n⚠️  IMPORTANT: You need to restart your Space for changes to take effect!")
    print("Go to: https://huggingface.co/spaces/sharry121/baatcheet/settings")
    print("Click 'Restart this Space' or 'Factory reboot'")
