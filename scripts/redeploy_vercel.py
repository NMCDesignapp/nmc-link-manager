#!/usr/bin/env python3
"""
Trigger production redeploy on both Vercel projects by promoting the latest
existing deployment. This avoids needing a git push.

Strategy: get latest production deployment, then redeploy it with new env vars.
"""
import json
import urllib.request
import urllib.error
import time

import os
VERCEL_TOKEN = os.environ.get("VERCEL_TOKEN", "")
if not VERCEL_TOKEN:
    print("ERROR: Set VERCEL_TOKEN env var first"); sys.exit(1)
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
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return 0, {"error": str(e)}


def get_latest_prod_deployment(pid):
    # v6 endpoint with target=production filter
    status, data = api("GET", f"https://api.vercel.com/v6/deployments?projectId={pid}&limit=10&target=production")
    if status != 200:
        print(f"  ERROR: {status} {data}")
        return None
    deps = data.get("deployments", [])
    if not deps:
        print("  No production deployments found")
        return None
    return deps[0]  # latest


def redeploy(pid, name):
    print(f"\n=== Redeploying: {name} ({pid}) ===")
    latest = get_latest_prod_deployment(pid)
    if not latest:
        return None
    deploy_id = latest["uid"]
    print(f"  Latest production deployment: {deploy_id}")
    print(f"  URL: {latest.get('url')}")
    print(f"  State: {latest.get('readyState')}")
    print(f"  Created: {time.ctime(latest.get('createdAt')/1000)}")

    # Trigger redeploy via /v13/deployments endpoint with deploymentId = latest
    # POST /v13/deployments creates a new deployment from an existing one
    body = {
        "deploymentId": deploy_id,
        "name": name,
        "target": "production",
    }
    status, data = api("POST", f"https://api.vercel.com/v13/deployments", body)
    if status in (200, 201):
        new_id = data.get("id") or data.get("uid")
        new_url = data.get("url")
        print(f"  ✓ Triggered new deployment:")
        print(f"    id: {new_id}")
        print(f"    url: {new_url}")
        return new_id
    else:
        print(f"  ✗ Failed: {status}")
        print(f"    Response: {json.dumps(data, indent=2)[:500]}")
        return None


def wait_for_ready(pid, deploy_id, max_wait=180):
    """Poll deployment status until READY or ERROR."""
    print(f"\n  Waiting for {deploy_id} to be READY...")
    start = time.time()
    while time.time() - start < max_wait:
        time.sleep(10)
        elapsed = int(time.time() - start)
        status, data = api("GET", f"https://api.vercel.com/v13/deployments/{deploy_id}")
        if status != 200:
            print(f"    [{elapsed}s] poll error: {status}")
            continue
        state = data.get("readyState") or data.get("status")
        if state == "READY":
            print(f"    [{elapsed}s] ✓ READY — url={data.get('url')}")
            return True
        if state in ("ERROR", "CANCELED"):
            print(f"    [{elapsed}s] ✗ {state}")
            return False
        print(f"    [{elapsed}s] state={state}")
    print(f"  Timeout after {max_wait}s")
    return False


def main():
    deploy_ids = []
    for pid, name in PROJECTS:
        did = redeploy(pid, name)
        if did:
            deploy_ids.append((pid, name, did))

    # Wait for all to be ready (sequential to avoid rate limit)
    for pid, name, did in deploy_ids:
        wait_for_ready(pid, did, max_wait=240)

    print("\n✅ All redeploys triggered and awaited.")


if __name__ == "__main__":
    main()
