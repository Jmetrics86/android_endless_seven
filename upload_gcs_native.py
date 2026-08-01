import json
import base64
import time
import subprocess
import urllib.request
import urllib.parse
import os

print("=== GCS REST API Uploader for bucket: endless-seven-apk ===")

creds_file = "/data/data/com.termux/files/home/google_credentials.json"
if not os.path.exists(creds_file):
    print(f"Credentials file {creds_file} not found!")
    exit(1)

with open(creds_file, "r") as f:
    creds = json.load(f)

client_email = creds["client_email"]
private_key = creds["private_key"]
project_id = creds.get("project_id", "jb-personal-project-2024")

# Create JWT Header & Payload
now = int(time.time())
header = {"alg": "RS256", "typ": "JWT"}
payload = {
    "iss": client_email,
    "scope": "https://www.googleapis.com/auth/devstorage.full_control",
    "aud": "https://oauth2.googleapis.com/token",
    "exp": now + 3600,
    "iat": now
}

def b64_url_encode(data_bytes):
    return base64.urlsafe_b64encode(data_bytes).decode("utf-8").rstrip("=")

header_b64 = b64_url_encode(json.dumps(header).encode("utf-8"))
payload_b64 = b64_url_encode(json.dumps(payload).encode("utf-8"))
unsigned_jwt = f"{header_b64}.{payload_b64}"

key_temp_path = "temp_key.pem"
with open(key_temp_path, "w") as f:
    f.write(private_key)

try:
    cmd = ["/data/data/com.termux/files/usr/glibc/bin/openssl", "dgst", "-sha256", "-sign", key_temp_path]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    sig_bytes, err = proc.communicate(input=unsigned_jwt.encode("utf-8"))
    if proc.returncode != 0:
        print("OpenSSL signing failed:", err.decode("utf-8"))
        exit(1)
finally:
    if os.path.exists(key_temp_path):
        os.remove(key_temp_path)

sig_b64 = b64_url_encode(sig_bytes)
jwt_token = f"{unsigned_jwt}.{sig_b64}"

# Fetch OAuth Access Token
url = "https://oauth2.googleapis.com/token"
data = urllib.parse.urlencode({
    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
    "assertion": jwt_token
}).encode("utf-8")

req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
try:
    with urllib.request.urlopen(req) as resp:
        token_resp = json.loads(resp.read().decode("utf-8"))
        access_token = token_resp["access_token"]
        print("Obtained GCS OAuth2 Access Token successfully.")
except Exception as e:
    print("OAuth token request failed:", e)
    exit(1)

apk_file = "app-debug-v0.0.41.apk"
if not os.path.exists(apk_file):
    print(f"{apk_file} not found!")
    exit(1)

target_bucket = "endless-seven-apk"
apk_size = os.path.getsize(apk_file)
print(f"Uploading {apk_file} ({apk_size} bytes) to gs://{target_bucket}/{apk_file}...")

upload_url = f"https://storage.googleapis.com/upload/storage/v1/b/{target_bucket}/o?uploadType=media&name={apk_file}"

with open(apk_file, "rb") as f:
    apk_data = f.read()

req_upload = urllib.request.Request(
    upload_url,
    data=apk_data,
    headers={
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/vnd.android.package-archive"
    },
    method="POST"
)

try:
    with urllib.request.urlopen(req_upload) as resp:
        res_json = json.loads(resp.read().decode("utf-8"))
        print(f"\n=======================================================")
        print(f"🎉 SUCCESSFUL GCS UPLOAD!")
        print(f"=======================================================")
        print(f"Bucket URI: gs://{target_bucket}/{apk_file}")
        print(f"Object Name: {res_json.get('name')}")
        print(f"Size: {res_json.get('size')} bytes")
        print(f"Media Link: {res_json.get('mediaLink')}")
        print(f"=======================================================")
except Exception as e:
    print("Upload error:", e)
