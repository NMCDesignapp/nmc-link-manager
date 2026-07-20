#!/usr/bin/env python3
"""
Update Vercel env vars (DATABASE_URL + DIRECT_URL) on both projects:
- prj_yzyA7oAQ3h3xGhQPjLfco9p6mAAa (my-project = nc-link.vercel.app)
- prj_u8zwP6nP2spudPFIkZCC8Ybx9LAe (kpi-nc-link = angiang2026-nhom.vercel.app)

Sets them to the new Neon DB URL (ep-broad-queen) for both production + development.
"""
import sys
import json
import urllib.request
import urllib.error

import os
VERCEL_TOKEN = os.environ.get("VERCEL_TOKEN", "")
if not VERCEL_TOKEN:
    print("ERROR: Set VERCEL_TOKEN env var first"); sys.exit(1)
# Use pooler URL (recommended) — drop channel_binding (Prisma/Node pg driver doesn't support well)
NEW_DB_URL = os.environ.get("NEW_DATABASE_URL", "")
if not NEW_DB_URL:
    print("ERROR: Set NEW_DATABASE_URL env var (pooler URL, e.g. postgresql://user:pass@host-pooler.../db?sslmode=require)"); sys.exit(1)
# Unpooled direct URL for migrations (replace -pooler with nothing)
NEW_DB_URL_UNPOOLED = NEW_DB_URL.replace("-pooler", "")

PROJECTS = [
    ("prj_yzyA7oAQ3h3xGhQPjLfco9p6mAAa", "my-project"),
    ("prj_u8zwP6nP2spudPFIkZCC8Ybx9LAe", "kpi-nc-link"),
]

def api(method, url, body=None):
    headers = {
        "Authorization": f"Bearer {VERCEL_TOKEN}",
        "Content-Type": "application/json",
    }
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return 0, {"error": str(e)}


def list_envs(pid):
    status, data = api("GET", f"https://api.vercel.com/v9/projects/{pid}/env")
    if status != 200:
        print(f"  ERROR listing envs: {status} {data}")
        return []
    return data.get("envs", [])


def delete_env(pid, env_id, key):
    status, data = api("DELETE", f"https://api.vercel.com/v9/projects/{pid}/env/{env_id}")
    if status == 200:
        print(f"  ✓ Deleted {key} (id={env_id[:12]})")
    else:
        print(f"  ✗ Failed to delete {key}: {status} {data.get('error', {}).get('message', '')}")


def create_env(pid, key, value, targets):
    body = {
        "key": key,
        "value": value,
        "type": "encrypted",
        "target": targets,
    }
    status, data = api("POST", f"https://api.vercel.com/v10/projects/{pid}/env", body)
    if status in (200, 201):
        print(f"  ✓ Created {key} (id={data.get('id','?')[:12]}) target={targets}")
    else:
        print(f"  ✗ Failed to create {key}: {status} {data.get('error', {}).get('message', '')}")


def update_project(pid, name):
    print(f"\n=== Updating project: {name} ({pid}) ===")
    envs = list_envs(pid)
    print(f"  Found {len(envs)} env vars")

    # Find DATABASE_URL and DIRECT_URL entries (all targets)
    db_url_envs = [e for e in envs if e.get("key") == "DATABASE_URL"]
    direct_url_envs = [e for e in envs if e.get("key") == "DIRECT_URL"]

    print(f"  DATABASE_URL entries: {len(db_url_envs)}")
    print(f"  DIRECT_URL entries: {len(direct_url_envs)}")

    # Delete all existing DATABASE_URL + DIRECT_URL entries
    for e in db_url_envs:
        delete_env(pid, e["id"], f"DATABASE_URL({e.get('target',[])})")
    for e in direct_url_envs:
        delete_env(pid, e["id"], f"DIRECT_URL({e.get('target',[])})")

    # Create new DATABASE_URL (pooler) for production + preview + development
    create_env(pid, "DATABASE_URL", NEW_DB_URL, ["production", "preview", "development"])
    # Create new DIRECT_URL (unpooled) for production + preview + development
    create_env(pid, "DIRECT_URL", NEW_DB_URL_UNPOOLED, ["production", "preview", "development"])

    # Verify
    envs = list_envs(pid)
    db = [e for e in envs if e.get("key") == "DATABASE_URL"]
    dr = [e for e in envs if e.get("key") == "DIRECT_URL"]
    print(f"  ✓ Verify: DATABASE_URL={len(db)} entries, DIRECT_URL={len(dr)} entries")


def main():
    for pid, name in PROJECTS:
        update_project(pid, name)
    print("\n✅ All env vars updated. Next: trigger redeploy.")


if __name__ == "__main__":
    main()
