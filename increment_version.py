import re
import sys
import os

file_path = 'app/build.gradle.kts'

if not os.path.exists(file_path):
    print(f"Error: {file_path} not found.")
    sys.exit(1)

with open(file_path, 'r') as file:
    content = file.read()

# Parse versionCode
code_match = re.search(r'versionCode\s*=\s*(\d+)', content)
if not code_match:
    print("Error: Could not find versionCode in build.gradle.kts")
    sys.exit(1)

old_code = int(code_match.group(1))
new_code = old_code + 1

# Parse versionName
name_match = re.search(r'versionName\s*=\s*"([^"]+)"', content)
if not name_match:
    print("Error: Could not find versionName in build.gradle.kts")
    sys.exit(1)

old_name = name_match.group(1)
parts = old_name.split('.')
if len(parts) >= 3:
    try:
        patch = int(parts[-1])
        parts[-1] = str(patch + 1)
        new_name = '.'.join(parts)
    except ValueError:
        new_name = old_name + "-1"
else:
    new_name = old_name + ".1"

# Replace in content
content = re.sub(r'(versionCode\s*=\s*)(\d+)', r'\g<1>' + str(new_code), content)
content = re.sub(r'(versionName\s*=\s*)"([^"]+)"', r'\g<1>"' + new_name + '"', content)

with open(file_path, 'w') as file:
    file.write(content)

print(f"Incremented version to Code: {new_code}, Name: {new_name}")

# Save the version name to a temporary file for the shell script to read
with open('.version_name', 'w') as f:
    f.write(new_name)
