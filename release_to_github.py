#!/usr/bin/env python3
"""
Release script for Endless Seven Android APK.

Workflow:
1. (Optional) Increment version via increment_version.py.
2. Build web production assets into app/src/main/assets/web.
3. Commit release changes and create a git tag (e.g. v0.0.42).
4. Push commit and tag to GitHub to trigger GitHub Actions release workflow.
5. GitHub Actions builds the APK and uploads it to GitHub Releases.
"""

import os
import sys
import subprocess
import re

def run_command(cmd, cwd=None, check=True, env=None):
    print(f"==> Running: {cmd} (cwd: {cwd or '.'})")
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    res = subprocess.run(cmd, shell=True, cwd=cwd, text=True, capture_output=True, env=merged_env)
    if res.stdout:
        print(res.stdout.strip())
    if res.stderr and res.returncode != 0:
        print(f"Error: {res.stderr.strip()}", file=sys.stderr)
    if check and res.returncode != 0:
        sys.exit(res.returncode)
    return res

def get_current_version():
    gradle_file = 'app/build.gradle.kts'
    if not os.path.exists(gradle_file):
        print(f"Error: {gradle_file} not found.", file=sys.stderr)
        sys.exit(1)
    with open(gradle_file, 'r') as f:
        content = f.read()
    m = re.search(r'versionName\s*=\s*"([^"]+)"', content)
    if not m:
        print("Error: Could not find versionName in build.gradle.kts", file=sys.stderr)
        sys.exit(1)
    return m.group(1)

def main():
    repo_root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(repo_root)

    # If --bump or no arguments passed, bump version; otherwise use existing version
    bump = "--bump" in sys.argv or "--increment" in sys.argv

    print("==================================================")
    print("      Endless Seven — GitHub APK Release tool     ")
    print("==================================================")

    if bump and os.path.exists('increment_version.py'):
        print("1. Incrementing version code and name...")
        run_command(f"{sys.executable} increment_version.py")
    
    version = get_current_version()
    tag = f"v{version}"
    print(f"\nTarget Release Version: {tag}")

    print("\n2. Building web production assets into Android assets...")
    web_dir = os.path.abspath('web')
    assets_out = os.path.abspath('app/src/main/assets/web')
    vite_bin = os.path.join(web_dir, 'node_modules', 'vite', 'bin', 'vite.js')
    
    build_cmd = f'node "{vite_bin}" build "{web_dir}" --outDir "{assets_out}" --emptyOutDir'
    run_command(build_cmd, cwd=web_dir, env={'VITE_BASE': './'})

    print("\n3. Staging and committing release files...")
    run_command("git add app/build.gradle.kts web/ .version_name .github/ AGENTS.md README.md release_to_github.py")
    
    # Check if there are staged changes to commit
    status = run_command("git status --porcelain", check=False).stdout
    if status.strip():
        run_command(f'git commit -m "chore(release): bump version to {tag}"', check=False)
    else:
        print("No staged changes to commit.")

    print(f"\n4. Creating Git tag {tag}...")
    # Delete existing tag locally and remotely if replacing
    run_command(f"git tag -d {tag}", check=False)
    run_command(f'git tag -a {tag} -m "Release {tag}"')

    print(f"\n5. Pushing commits and tag to GitHub...")
    run_command("git push origin main")
    run_command(f"git push origin {tag} --force")

    print("\n==================================================")
    print(f"[*] Release {tag} successfully triggered on GitHub!")
    print(f"GitHub Actions is now compiling the APK and publishing the release.")
    print(f"Download link will be live at:")
    print(f"  -> https://github.com/Jmetrics86/android_endless_seven/releases/tag/{tag}")
    print("==================================================")

if __name__ == '__main__':
    main()
