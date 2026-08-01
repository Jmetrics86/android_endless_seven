import os
from google.cloud import storage

print("=== Google Cloud Storage Bucket Finder & APK Uploader ===")

creds_path = "/data/data/com.termux/files/home/google_credentials.json"
if not os.path.exists(creds_path):
    print(f"Error: {creds_path} not found.")
    exit(1)

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = creds_path

client = storage.Client(project="jb-personal-project-2024")

buckets = list(client.list_buckets())
print(f"Found {len(buckets)} GCS buckets in project 'jb-personal-project-2024':")
for b in buckets:
    print(f" - {b.name}")

if not buckets:
    print("No buckets found!")
    exit(0)

# Target APK
apk_source = "app-debug-v0.0.40.apk"
if not os.path.exists(apk_source):
    # Check if app-debug.apk exists in Gradle build output
    grad_apk = "app/build/outputs/apk/debug/app-debug.apk"
    if os.path.exists(grad_apk):
        import shutil
        shutil.copyfile(grad_apk, apk_source)
        print(f"Copied {grad_apk} -> {apk_source}")
    else:
        # Fallback copy from previous build
        print(f"{apk_source} build in progress or not found yet.")

if os.path.exists(apk_source):
    # Upload to first available bucket or endless_seven bucket
    target_bucket_name = buckets[0].name
    for b in buckets:
        if "endless" in b.name.lower() or "apk" in b.name.lower() or "seven" in b.name.lower() or "game" in b.name.lower():
            target_bucket_name = b.name
            break

    print(f"\nUploading {apk_source} to gs://{target_bucket_name}/{apk_source}...")
    bucket = client.bucket(target_bucket_name)
    blob = bucket.blob(apk_source)
    blob.upload_from_filename(apk_source)
    print(f"✅ Successfully uploaded {apk_source} to gs://{target_bucket_name}/{apk_source}")
    print(f"Public URL (if enabled): {blob.public_url}")
