#!/usr/bin/env python3
"""
Upload secrets to HuggingFace Space
"""
import os
import subprocess

# Read the .env file
env_file = "/Users/muhammadsharjeel/Documents/BaatCheet/backend/.env"

secrets = {}
with open(env_file, 'r') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            # Remove quotes if present
            value = value.strip('"').strip("'")
            if value and not value.startswith('your') and not value.startswith('sk_test'):
                secrets[key] = value

# Filter to only include API keys and important config
important_keys = [
    'DATABASE_URL', 'JWT_SECRET', 'NODE_ENV',
    'CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY',
    'DEFAULT_MODEL', 'MAX_CONTEXT_MESSAGES', 'MAX_TOKENS',
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

print(f"Found {len(filtered_secrets)} secrets to upload:")
for key in sorted(filtered_secrets.keys()):
    # Mask the value for display
    val = filtered_secrets[key]
    masked = val[:8] + '...' + val[-4:] if len(val) > 16 else val[:4] + '...'
    print(f"  - {key}: {masked}")

print("\n" + "="*50)
print("SECRETS TO ADD TO HUGGINGFACE SPACE:")
print("="*50)
print("\nGo to: https://huggingface.co/spaces/sharry121/baatcheet/settings")
print("Click 'Repository secrets' and add each of these:\n")

for key in sorted(filtered_secrets.keys()):
    print(f"{key}={filtered_secrets[key]}")
