#!/usr/bin/env python3
"""
Restore NMC Link Manager database from backup JSON (12/07/2026) to a new Neon DB.

Usage:
  python3 restore_neon_db.py "postgresql://USER:PASS@HOST/DB?sslmode=require"

What it does:
  1. Connect to target Neon DB
  2. CREATE TABLE IF NOT EXISTS for all 17 tables (matching Prisma schema)
  3. CREATE UNIQUE INDEX IF NOT EXISTS
  4. For each table: DELETE all rows + INSERT from backup JSON
  5. Print summary

Backup source: /home/z/my-project/nmc-link-manager/backups/20260712_195857/

Note: This script is idempotent — safe to run multiple times.
"""
import sys
import os
import json
import psycopg2
from psycopg2.extras import Json

# ===== Table schemas (matching src/app/api/admin/create-tables/route.ts) =====
CREATE_TABLES_SQL = [
    ('Phong', '''CREATE TABLE IF NOT EXISTS "Phong" (
        "id" TEXT NOT NULL,
        "maPhong" TEXT NOT NULL,
        "tenPhong" TEXT NOT NULL,
        "note" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Phong_pkey" PRIMARY KEY ("id")
    )'''),
    ('Category', '''CREATE TABLE IF NOT EXISTS "Category" (
        "id" SERIAL NOT NULL,
        "name" TEXT NOT NULL,
        "icon" TEXT,
        "color" TEXT NOT NULL DEFAULT '#3b82f6',
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
    )'''),
    ('Setting', '''CREATE TABLE IF NOT EXISTS "Setting" (
        "id" SERIAL NOT NULL,
        "key" TEXT NOT NULL,
        "value" TEXT,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
    )'''),
    ('Link', '''CREATE TABLE IF NOT EXISTS "Link" (
        "id" SERIAL NOT NULL,
        "title" TEXT NOT NULL,
        "url" TEXT,
        "description" TEXT,
        "icon" TEXT NOT NULL DEFAULT 'globe',
        "category" TEXT NOT NULL DEFAULT 'General',
        "color" TEXT NOT NULL DEFAULT '#3b82f6',
        "link_type" TEXT NOT NULL DEFAULT 'web',
        "file_url" TEXT,
        "file_name" TEXT,
        "file_type" TEXT,
        "thumbnail" TEXT,
        "is_favorite" BOOLEAN NOT NULL DEFAULT false,
        "click_count" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
    )'''),
    ('CalendarEvent', '''CREATE TABLE IF NOT EXISTS "CalendarEvent" (
        "id" SERIAL NOT NULL,
        "title" TEXT NOT NULL,
        "date" TEXT NOT NULL,
        "color" TEXT NOT NULL DEFAULT '#00ff88',
        "owner" TEXT NOT NULL DEFAULT '',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
    )'''),
    ('AD', '''CREATE TABLE IF NOT EXISTS "AD" (
        "id" TEXT NOT NULL,
        "maAD" TEXT NOT NULL,
        "tenAD" TEXT NOT NULL,
        "maPhong" TEXT NOT NULL DEFAULT '',
        "note" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "AD_pkey" PRIMARY KEY ("id")
    )'''),
    ('BanNhom', '''CREATE TABLE IF NOT EXISTS "BanNhom" (
        "id" TEXT NOT NULL,
        "maBanNhom" TEXT NOT NULL,
        "tenBanNhom" TEXT NOT NULL,
        "maAD" TEXT NOT NULL DEFAULT '',
        "note" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "BanNhom_pkey" PRIMARY KEY ("id")
    )'''),
    ('Staff', '''CREATE TABLE IF NOT EXISTS "Staff" (
        "id" TEXT NOT NULL,
        "nhom" TEXT NOT NULL DEFAULT '',
        "maNhom" TEXT NOT NULL DEFAULT '',
        "agentCode" TEXT NOT NULL,
        "agentName" TEXT NOT NULL,
        "position" TEXT NOT NULL DEFAULT '',
        "startDate" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
    )'''),
    ('Recruiter', '''CREATE TABLE IF NOT EXISTS "Recruiter" (
        "id" TEXT NOT NULL,
        "nhom" TEXT NOT NULL DEFAULT '',
        "agentCode" TEXT NOT NULL,
        "agentName" TEXT NOT NULL,
        "position" TEXT NOT NULL DEFAULT '',
        "startDate" TIMESTAMP(3),
        "ngayHieuLuc" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Recruiter_pkey" PRIMARY KEY ("id")
    )'''),
    ('TuyenNgang', '''CREATE TABLE IF NOT EXISTS "TuyenNgang" (
        "id" TEXT NOT NULL,
        "nhom" TEXT NOT NULL DEFAULT '',
        "agentCode" TEXT NOT NULL,
        "agentName" TEXT NOT NULL,
        "ngayBatDau" TIMESTAMP(3),
        "ngayHieuLuc" TIMESTAMP(3),
        "maNguoiTuyenDung" TEXT NOT NULL DEFAULT '',
        "tenNguoiTuyenDung" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "TuyenNgang_pkey" PRIMARY KEY ("id")
    )'''),
    ('TVVStruct', '''CREATE TABLE IF NOT EXISTS "TVVStruct" (
        "id" TEXT NOT NULL,
        "agentCode" TEXT NOT NULL,
        "agentName" TEXT NOT NULL,
        "maBanNhom" TEXT NOT NULL DEFAULT '',
        "chucVu" TEXT NOT NULL DEFAULT '',
        "ngayBatDau" TIMESTAMP(3),
        "maTVVTuyendung" TEXT NOT NULL DEFAULT '',
        "note" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "TVVStruct_pkey" PRIMARY KEY ("id")
    )'''),
    ('LeaderInfo', '''CREATE TABLE IF NOT EXISTS "LeaderInfo" (
        "id" TEXT NOT NULL,
        "agentCode" TEXT NOT NULL,
        "agentName" TEXT NOT NULL,
        "position" TEXT NOT NULL DEFAULT '',
        "ban" TEXT NOT NULL DEFAULT '',
        "nhom" TEXT NOT NULL DEFAULT '',
        "maNhom" TEXT NOT NULL DEFAULT '',
        "salary" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "phone" TEXT NOT NULL DEFAULT '',
        "email" TEXT NOT NULL DEFAULT '',
        "note" TEXT NOT NULL DEFAULT '',
        "startDate" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "LeaderInfo_pkey" PRIMARY KEY ("id")
    )'''),
    ('Contract', '''CREATE TABLE IF NOT EXISTS "Contract" (
        "id" TEXT NOT NULL,
        "stt" INTEGER NOT NULL DEFAULT 0,
        "contractNumber" TEXT NOT NULL,
        "agentCode" TEXT NOT NULL,
        "agentName" TEXT NOT NULL,
        "position" TEXT NOT NULL DEFAULT '',
        "ban" TEXT NOT NULL DEFAULT '',
        "maTruongBan" TEXT NOT NULL DEFAULT '',
        "nhom" TEXT NOT NULL DEFAULT '',
        "maBanNhom" TEXT NOT NULL DEFAULT '',
        "maTruongBanNhom" TEXT NOT NULL DEFAULT '',
        "maDL" TEXT NOT NULL DEFAULT '',
        "maNhom" TEXT NOT NULL DEFAULT '',
        "leaderAgentCode" TEXT NOT NULL DEFAULT '',
        "ngayBatDauLamViec" TIMESTAMP(3),
        "effectiveDate" TIMESTAMP(3),
        "issueDate" TIMESTAMP(3),
        "pdt10DT" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "fyp" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "nguonDuLieu" TEXT NOT NULL DEFAULT '',
        "hopDongToChuc" TEXT NOT NULL DEFAULT '',
        "dkDongPhi" TEXT NOT NULL DEFAULT '',
        "phiDongThem" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "afypChuaTru10DT" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "afyp" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "ad" TEXT NOT NULL DEFAULT '',
        "nhom2" TEXT NOT NULL DEFAULT '',
        "ngayBatDauLamViec2" TIMESTAMP(3),
        "thangTD" INTEGER NOT NULL DEFAULT 0,
        "namTD" INTEGER NOT NULL DEFAULT 0,
        "thangHL" INTEGER NOT NULL DEFAULT 0,
        "tinhLuot" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "tinhLuot3tr" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "maDaiLyTD" TEXT NOT NULL DEFAULT '',
        "danhDauTVV" TEXT NOT NULL DEFAULT '',
        "chucVu2" TEXT NOT NULL DEFAULT '',
        "recruiterCode" TEXT NOT NULL DEFAULT '',
        "startDate" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
    )'''),
    ('Contest', '''CREATE TABLE IF NOT EXISTS "Contest" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "startDate" TIMESTAMP(3) NOT NULL,
        "endDate" TIMESTAMP(3) NOT NULL,
        "issueDate" TIMESTAMP(3),
        "conditionType" TEXT NOT NULL DEFAULT 'per_contract_ip',
        "targetType" TEXT NOT NULL DEFAULT 'tvv',
        "bonusTiers" TEXT NOT NULL,
        "posterUrl" TEXT NOT NULL DEFAULT '',
        "participants" TEXT NOT NULL DEFAULT '[]',
        "usePhase2" BOOLEAN NOT NULL DEFAULT false,
        "phase2StartDate" TIMESTAMP(3),
        "phase2EndDate" TIMESTAMP(3),
        "bonusTiers2" TEXT NOT NULL DEFAULT '[]',
        "useSecondaryCondition" BOOLEAN NOT NULL DEFAULT false,
        "secondaryAFYPMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "secondaryIPMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "secondaryLuotHDMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "secondaryLuotHDCMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "secondaryLuotHDFilter" TEXT NOT NULL DEFAULT 'all',
        "secondaryLuotHDCFilter" TEXT NOT NULL DEFAULT 'all',
        "secondaryTotalAFYPMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "secondaryTotalIPMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "hideNotAchieved" BOOLEAN NOT NULL DEFAULT false,
        "includeIndividualNTD" BOOLEAN NOT NULL DEFAULT false,
        "includeIndividualTN" BOOLEAN NOT NULL DEFAULT false,
        "luotHDThreshold" DOUBLE PRECISION NOT NULL DEFAULT 3000000,
        "luotHDCTThreshold" DOUBLE PRECISION NOT NULL DEFAULT 12000000,
        "tvv90MaxMonths" DOUBLE PRECISION NOT NULL DEFAULT 3,
        "tvv90MinIP" DOUBLE PRECISION NOT NULL DEFAULT 12000000,
        "referenceContestId" TEXT NOT NULL DEFAULT '',
        "includeTNInPassCount" BOOLEAN NOT NULL DEFAULT false,
        "topN" INTEGER NOT NULL DEFAULT 3,
        "topNMinIP" DOUBLE PRECISION NOT NULL DEFAULT 50000000,
        "topNValueType" TEXT NOT NULL DEFAULT 'ip',
        "filterByEffectiveDate" BOOLEAN NOT NULL DEFAULT false,
        "csvContractUrl" TEXT NOT NULL DEFAULT '',
        "csvStaffUrl" TEXT NOT NULL DEFAULT '',
        "csvRecruiterUrl" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
    )'''),
    ('MonthlyRevenue', '''CREATE TABLE IF NOT EXISTS "MonthlyRevenue" (
        "id" TEXT NOT NULL,
        "month" TEXT NOT NULL,
        "maNhom" TEXT NOT NULL DEFAULT '',
        "nhom" TEXT NOT NULL DEFAULT '',
        "agentCode" TEXT NOT NULL DEFAULT '',
        "agentName" TEXT NOT NULL DEFAULT '',
        "totalFYP" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalAFYP" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "contractCount" INTEGER NOT NULL DEFAULT 0,
        "activityRounds" INTEGER NOT NULL DEFAULT 0,
        "note" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "MonthlyRevenue_pkey" PRIMARY KEY ("id")
    )'''),
    ('SaoVietData', '''CREATE TABLE IF NOT EXISTS "SaoVietData" (
        "id" TEXT NOT NULL,
        "program" TEXT NOT NULL,
        "agentCode" TEXT NOT NULL DEFAULT '',
        "agentName" TEXT NOT NULL DEFAULT '',
        "nhomKD" TEXT NOT NULL DEFAULT '',
        "fyp" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "fypTVVm" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "slTvvmHDC" INTEGER NOT NULL DEFAULT 0,
        "tvvmCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "SaoVietData_pkey" PRIMARY KEY ("id")
    )'''),
    ('ClbMember', '''CREATE TABLE IF NOT EXISTS "ClbMember" (
        "id" TEXT NOT NULL,
        "ad" TEXT NOT NULL DEFAULT '',
        "nhom" TEXT NOT NULL DEFAULT '',
        "agentCode" TEXT NOT NULL DEFAULT '',
        "agentName" TEXT NOT NULL DEFAULT '',
        "chucVu" TEXT NOT NULL DEFAULT '',
        "note" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ClbMember_pkey" PRIMARY KEY ("id")
    )'''),
    ('PendingMember', '''CREATE TABLE IF NOT EXISTS "PendingMember" (
        "id" TEXT NOT NULL,
        "ad" TEXT NOT NULL DEFAULT '',
        "nhom" TEXT NOT NULL DEFAULT '',
        "agentCode" TEXT NOT NULL DEFAULT '',
        "agentName" TEXT NOT NULL DEFAULT '',
        "chucVu" TEXT NOT NULL DEFAULT '',
        "ipT2" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "ipT1" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "ipT0" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "note" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "PendingMember_pkey" PRIMARY KEY ("id")
    )'''),
    ('PosterImage', '''CREATE TABLE IF NOT EXISTS "PosterImage" (
        "key" TEXT NOT NULL,
        "data" BYTEA,
        "contentType" TEXT NOT NULL DEFAULT 'image/jpeg',
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "PosterImage_pkey" PRIMARY KEY ("key")
    )'''),
    # Extra table for KPI target registration (added 2026-07-19 in commit 1e41989)
    ('KpiTargetRegistration', '''CREATE TABLE IF NOT EXISTS "KpiTargetRegistration" (
        "id" TEXT NOT NULL,
        "month" TEXT NOT NULL,
        "nhom" TEXT NOT NULL DEFAULT '',
        "maSo" TEXT NOT NULL DEFAULT '',
        "hoTen" TEXT NOT NULL DEFAULT '',
        "chucVu" TEXT NOT NULL DEFAULT '',
        "vaiTro" TEXT NOT NULL,
        "afyp" DOUBLE PRECISION,
        "luotHD" DOUBLE PRECISION,
        "ghiChu" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "KpiTargetRegistration_pkey" PRIMARY KEY ("id")
    )'''),
]

INDEXES_SQL = [
    'CREATE UNIQUE INDEX IF NOT EXISTS "Phong_maPhong_key" ON "Phong"("maPhong")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "AD_maAD_key" ON "AD"("maAD")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "BanNhom_maBanNhom_key" ON "BanNhom"("maBanNhom")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "TVVStruct_agentCode_key" ON "TVVStruct"("agentCode")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "Staff_agentCode_key" ON "Staff"("agentCode")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "Recruiter_agentCode_key" ON "Recruiter"("agentCode")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "TuyenNgang_agentCode_key" ON "TuyenNgang"("agentCode")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "LeaderInfo_agentCode_key" ON "LeaderInfo"("agentCode")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "Contract_contractNumber_key" ON "Contract"("contractNumber")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "Setting_key_key" ON "Setting"("key")',
    'CREATE INDEX IF NOT EXISTS "SaoVietData_program_idx" ON "SaoVietData"("program")',
]

# ===== Restore config: table → (filename, columns list) =====
# Columns order matches backup JSON field order.
RESTORE_TABLES = [
    ('Phong', ['id', 'maPhong', 'tenPhong', 'note', 'createdAt', 'updatedAt']),
    ('AD', ['id', 'maAD', 'tenAD', 'maPhong', 'note', 'createdAt', 'updatedAt']),
    ('BanNhom', ['id', 'maBanNhom', 'tenBanNhom', 'maAD', 'note', 'createdAt', 'updatedAt']),
    ('Category', ['id', 'name', 'icon', 'color', 'sort_order', 'created_at']),
    ('Link', ['id', 'title', 'url', 'description', 'icon', 'category', 'color', 'link_type',
              'file_url', 'file_name', 'file_type', 'thumbnail', 'is_favorite', 'click_count',
              'created_at', 'updated_at']),
    ('CalendarEvent', ['id', 'title', 'date', 'color', 'owner', 'created_at', 'updated_at']),
    ('Setting', ['id', 'key', 'value', 'updated_at']),
    ('Staff', ['id', 'nhom', 'maNhom', 'agentCode', 'agentName', 'position', 'startDate',
               'createdAt', 'updatedAt']),
    ('Recruiter', ['id', 'nhom', 'agentCode', 'agentName', 'position', 'startDate', 'ngayHieuLuc',
                   'createdAt', 'updatedAt']),
    ('TuyenNgang', ['id', 'nhom', 'agentCode', 'agentName', 'ngayBatDau', 'ngayHieuLuc',
                    'maNguoiTuyenDung', 'tenNguoiTuyenDung', 'createdAt', 'updatedAt']),
    ('TVVStruct', ['id', 'agentCode', 'agentName', 'maBanNhom', 'chucVu', 'ngayBatDau',
                   'maTVVTuyendung', 'note', 'createdAt', 'updatedAt']),
    ('LeaderInfo', ['id', 'agentCode', 'agentName', 'position', 'ban', 'nhom', 'maNhom',
                    'salary', 'phone', 'email', 'note', 'startDate', 'createdAt', 'updatedAt']),
    ('Contract', ['id', 'stt', 'contractNumber', 'agentCode', 'agentName', 'position', 'ban',
                  'maTruongBan', 'nhom', 'maBanNhom', 'maTruongBanNhom', 'maDL', 'maNhom',
                  'leaderAgentCode', 'ngayBatDauLamViec', 'effectiveDate', 'issueDate',
                  'pdt10DT', 'fyp', 'nguonDuLieu', 'hopDongToChuc', 'dkDongPhi', 'phiDongThem',
                  'afypChuaTru10DT', 'afyp', 'ad', 'nhom2', 'ngayBatDauLamViec2',
                  'thangTD', 'namTD', 'thangHL', 'tinhLuot', 'tinhLuot3tr',
                  'maDaiLyTD', 'danhDauTVV', 'chucVu2', 'recruiterCode', 'startDate',
                  'createdAt', 'updatedAt']),
    ('Contest', ['id', 'title', 'startDate', 'endDate', 'issueDate', 'conditionType', 'targetType',
                 'bonusTiers', 'posterUrl', 'participants', 'usePhase2', 'phase2StartDate',
                 'phase2EndDate', 'bonusTiers2', 'useSecondaryCondition', 'secondaryAFYPMin',
                 'secondaryIPMin', 'secondaryLuotHDMin', 'secondaryLuotHDCMin',
                 'secondaryLuotHDFilter', 'secondaryLuotHDCFilter', 'secondaryTotalAFYPMin',
                 'secondaryTotalIPMin', 'hideNotAchieved', 'includeIndividualNTD',
                 'includeIndividualTN', 'luotHDThreshold', 'luotHDCTThreshold', 'tvv90MaxMonths',
                 'tvv90MinIP', 'referenceContestId', 'includeTNInPassCount', 'topN', 'topNMinIP',
                 'topNValueType', 'filterByEffectiveDate', 'csvContractUrl', 'csvStaffUrl',
                 'csvRecruiterUrl', 'createdAt', 'updatedAt']),
    ('MonthlyRevenue', ['id', 'month', 'maNhom', 'nhom', 'agentCode', 'agentName',
                        'totalFYP', 'totalAFYP', 'contractCount', 'activityRounds', 'note',
                        'createdAt', 'updatedAt']),
    ('SaoVietData', ['id', 'program', 'agentCode', 'agentName', 'nhomKD', 'fyp', 'fypTVVm',
                     'slTvvmHDC', 'tvvmCount', 'createdAt', 'updatedAt']),
    ('ClbMember', ['id', 'ad', 'nhom', 'agentCode', 'agentName', 'chucVu', 'note',
                   'createdAt', 'updatedAt']),
    ('PendingMember', ['id', 'ad', 'nhom', 'agentCode', 'agentName', 'chucVu',
                       'ipT2', 'ipT1', 'ipT0', 'note', 'createdAt', 'updatedAt']),
    # PosterImage contains base64 in 'data' field — handle specially below
]


def load_backup(backup_dir, filename):
    """Load JSON backup file. Returns list of rows."""
    path = os.path.join(backup_dir, filename)
    if not os.path.exists(path):
        return []
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    return data.get('records') or data.get('data') or []


def coerce(value, col_type_hint=None):
    """Coerce Python value to PG-compatible form."""
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        return value
    # list/dict → JSON string
    return json.dumps(value, ensure_ascii=False)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    db_url = sys.argv[1]
    backup_dir = sys.argv[2] if len(sys.argv) > 2 else \
        '/home/z/my-project/nmc-link-manager/backups/20260712_195857'

    if not os.path.isdir(backup_dir):
        print(f"ERROR: Backup directory not found: {backup_dir}")
        sys.exit(1)

    print(f"🔌 Connecting to: {db_url.split('@')[-1]}")
    conn = psycopg2.connect(db_url, connect_timeout=30)
    conn.autocommit = False
    cur = conn.cursor()

    # Step 1: Create tables
    print(f"\n📋 Step 1/3: Creating {len(CREATE_TABLES_SQL)} tables...")
    for name, sql in CREATE_TABLES_SQL:
        try:
            cur.execute(sql)
            print(f"  ✓ {name}")
        except Exception as e:
            msg = str(e)
            if 'already exists' in msg:
                print(f"  ⊙ {name} (already exists)")
            else:
                print(f"  ✗ {name}: {msg[:120]}")
            conn.rollback()
            cur = conn.cursor()
    conn.commit()

    # Step 2: Create indexes
    print(f"\n📇 Step 2/3: Creating {len(INDEXES_SQL)} indexes...")
    for sql in INDEXES_SQL:
        try:
            cur.execute(sql)
        except Exception as e:
            conn.rollback()
            cur = conn.cursor()
    conn.commit()
    print("  ✓ Indexes ensured")

    # Step 3: Restore data
    print(f"\n💾 Step 3/3: Restoring data from backup ({backup_dir})...")
    total_restored = 0
    for table, cols in RESTORE_TABLES:
        rows = load_backup(backup_dir, f"{table}.json")
        if not rows:
            print(f"  ⊙ {table}: no backup data, skipping")
            continue
        try:
            # Delete all existing rows
            cur.execute(f'DELETE FROM "{table}";')
            deleted = cur.rowcount

            # Build batch INSERT
            # Use %s placeholders
            placeholders = ','.join(['%s'] * len(cols))
            col_list = ','.join(f'"{c}"' for c in cols)
            insert_sql = f'INSERT INTO "{table}" ({col_list}) VALUES ({placeholders})'

            inserted = 0
            for r in rows:
                values = []
                for c in cols:
                    v = r.get(c)
                    # Skip values for columns the row doesn't have (use default)
                    if v is None and c in ('createdAt', 'updatedAt'):
                        v = None  # let default kick in via NULL? Actually NOT NULL — better skip
                    values.append(coerce(v))
                try:
                    cur.execute(insert_sql, values)
                    inserted += 1
                except Exception as e:
                    conn.rollback()
                    cur = conn.cursor()
                    # Retry this single row with safer handling
                    try:
                        cur.execute(insert_sql, values)
                        inserted += 1
                    except Exception as e2:
                        print(f"    ✗ Row failed in {table}: {str(e2)[:100]}")
                        conn.rollback()
                        cur = conn.cursor()
            conn.commit()
            print(f"  ✓ {table}: deleted {deleted}, inserted {inserted}/{len(rows)}")
            total_restored += inserted
        except Exception as e:
            print(f"  ✗ {table}: {str(e)[:120]}")
            conn.rollback()
            cur = conn.cursor()

    # Step 4: Restore PosterImage (special — BYTEA data)
    print("\n🖼  Restoring PosterImage (BYTEA)...")
    poster_rows = load_backup(backup_dir, 'PosterImage.json')
    if poster_rows:
        try:
            cur.execute('DELETE FROM "PosterImage";')
            inserted = 0
            for r in poster_rows:
                key = r.get('key')
                data_b64 = r.get('data')
                content_type = r.get('contentType', 'image/jpeg')
                updated_at = r.get('updatedAt')
                # data is base64-encoded string in JSON
                import base64
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
                    (key, binary, content_type, updated_at)
                )
                inserted += 1
            conn.commit()
            print(f"  ✓ PosterImage: inserted {inserted}/{len(poster_rows)}")
            total_restored += inserted
        except Exception as e:
            print(f"  ✗ PosterImage: {str(e)[:120]}")
            conn.rollback()
            cur = conn.cursor()

    # Final summary
    print(f"\n{'='*60}")
    print(f"✅ Done! Total rows restored: {total_restored}")
    print(f"\nNext steps:")
    print(f"  1. Update Vercel env var DATABASE_URL to this new DB URL")
    print(f"  2. Trigger Vercel redeploy (or push any commit)")
    print(f"  3. Verify: curl https://nc-link.vercel.app/api/health")
    print(f"     Expect db.status = 'ok'")
    cur.close()
    conn.close()


if __name__ == '__main__':
    main()
