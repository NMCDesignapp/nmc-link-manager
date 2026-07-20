#!/usr/bin/env python3
"""
Restore NMC Link Manager database from backup JSON (12/07/2026) to a Neon DB.
Fast version: uses execute_values for batch INSERT.

Usage:
  python3 restore_neon_db_v2.py "postgresql://USER:PASS@HOST/DB?sslmode=require" [backup_dir]

By default, backup_dir = /home/z/my-project/nmc-link-manager/backups/20260712_195857
"""
import sys
import os
import json
import base64
import time
import psycopg2
from psycopg2.extras import execute_values

# Reuse schemas from v1
sys.path.insert(0, '/home/z/my-project/scripts')
from restore_neon_db import CREATE_TABLES_SQL, INDEXES_SQL, RESTORE_TABLES


def log(msg):
    print(msg, flush=True)


def load_backup(backup_dir, filename):
    path = os.path.join(backup_dir, filename)
    if not os.path.exists(path):
        return []
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    return data.get('records') or data.get('data') or []


def coerce(value):
    """Coerce Python value to PG-compatible form."""
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    db_url = sys.argv[1]
    backup_dir = sys.argv[2] if len(sys.argv) > 2 else \
        '/home/z/my-project/nmc-link-manager/backups/20260712_195857'

    if not os.path.isdir(backup_dir):
        log(f"ERROR: Backup directory not found: {backup_dir}")
        sys.exit(1)

    log(f"🔌 Connecting to: {db_url.split('@')[-1]}")
    conn = psycopg2.connect(db_url, connect_timeout=30)
    conn.autocommit = False
    cur = conn.cursor()

    # Set longer statement timeout for big inserts
    cur.execute("SET statement_timeout = '600s';")
    conn.commit()

    # Step 1: Create tables
    log(f"\n📋 Step 1/3: Creating {len(CREATE_TABLES_SQL)} tables...")
    for name, sql in CREATE_TABLES_SQL:
        try:
            cur.execute(sql)
            log(f"  ✓ {name}")
        except Exception as e:
            msg = str(e)
            if 'already exists' in msg:
                log(f"  ⊙ {name} (already exists)")
            else:
                log(f"  ✗ {name}: {msg[:120]}")
            conn.rollback()
            cur = conn.cursor()
            cur.execute("SET statement_timeout = '600s';")
    conn.commit()

    # Step 2: Create indexes
    log(f"\n📇 Step 2/3: Creating {len(INDEXES_SQL)} indexes...")
    for sql in INDEXES_SQL:
        try:
            cur.execute(sql)
        except Exception as e:
            conn.rollback()
            cur = conn.cursor()
            cur.execute("SET statement_timeout = '600s';")
    conn.commit()
    log("  ✓ Indexes ensured")

    # Step 3: Restore data with batch INSERT
    log(f"\n💾 Step 3/3: Restoring data (batch INSERT)...")
    total_restored = 0
    for table, cols in RESTORE_TABLES:
        rows = load_backup(backup_dir, f"{table}.json")
        if not rows:
            log(f"  ⊙ {table}: no backup data, skipping")
            continue
        t0 = time.time()
        try:
            cur.execute(f'DELETE FROM "{table}";')
            deleted = cur.rowcount

            # Build values matrix
            values_matrix = []
            for r in rows:
                values_matrix.append([coerce(r.get(c)) for c in cols])

            # Batch INSERT with execute_values (1 round trip)
            col_list = ','.join(f'"{c}"' for c in cols)
            insert_sql = f'INSERT INTO "{table}" ({col_list}) VALUES %s'
            execute_values(cur, insert_sql, values_matrix, page_size=200)
            inserted = len(values_matrix)

            conn.commit()
            elapsed = time.time() - t0
            log(f"  ✓ {table}: deleted {deleted}, inserted {inserted}/{len(rows)} ({elapsed:.1f}s)")
            total_restored += inserted
        except Exception as e:
            log(f"  ✗ {table}: {str(e)[:200]}")
            conn.rollback()
            cur = conn.cursor()
            cur.execute("SET statement_timeout = '600s';")

    # Step 4: Restore PosterImage (BYTEA)
    log("\n🖼  Restoring PosterImage (BYTEA)...")
    poster_rows = load_backup(backup_dir, 'PosterImage.json')
    if poster_rows:
        t0 = time.time()
        try:
            cur.execute('DELETE FROM "PosterImage";')
            inserted = 0
            for r in poster_rows:
                key = r.get('key')
                data_b64 = r.get('data')
                content_type = r.get('contentType', 'image/jpeg')
                updated_at = r.get('updatedAt')
                if isinstance(data_b64, str) and data_b64:
                    try:
                        binary = base64.b64decode(data_b64)
                    except Exception:
                        binary = None
                elif isinstance(data_b64, (bytes, bytearray)):
                    binary = bytes(data_b64)
                else:
                    binary = None
                cur.execute(
                    'INSERT INTO "PosterImage" ("key", "data", "contentType", "updatedAt") VALUES (%s, %s, %s, %s)',
                    (key, psycopg2.Binary(binary) if binary else None, content_type, updated_at)
                )
                inserted += 1
            conn.commit()
            elapsed = time.time() - t0
            log(f"  ✓ PosterImage: inserted {inserted}/{len(poster_rows)} ({elapsed:.1f}s)")
            total_restored += inserted
        except Exception as e:
            log(f"  ✗ PosterImage: {str(e)[:200]}")
            conn.rollback()
            cur = conn.cursor()

    # Final summary
    log(f"\n{'='*60}")
    log(f"✅ Done! Total rows restored: {total_restored}")
    log(f"\nNext steps:")
    log(f"  1. Update Vercel env var DATABASE_URL to this new DB URL")
    log(f"  2. Trigger Vercel redeploy (push any commit OR click Redeploy in dashboard)")
    log(f"  3. Verify: curl https://nc-link.vercel.app/api/health")
    log(f"     Expect db.status = 'ok'")
    cur.close()
    conn.close()


if __name__ == '__main__':
    main()
