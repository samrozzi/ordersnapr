# Database Migrations

## Structure

This directory contains 105+ SQL migration files that build up the OrderSnapr database schema.

## Migration Snapshot

For faster new environment setup, consider using the consolidated snapshot approach:

### Option 1: Full Snapshot (Recommended for new deployments)
Create a single migration file that contains the complete current schema. This allows new environments to skip running 100+ individual migrations.

**Location:** `20251118000000_schema_snapshot_v1.sql`

**Contents:**
- All table definitions
- All indexes
- All RLS policies
- All functions and triggers
- All views

**Usage:**
- New environments: Run only the snapshot + recent migrations
- Existing environments: Skip the snapshot (it checks for existing tables)

### Option 2: Keep Individual Migrations (Current approach)
Maintains full history but slower for new setups.

## Recent Important Migrations

1. **20251115174734_voice_assistant_schema.sql** - Voice assistant & username features
2. **20251111000000_create_custom_fields_system.sql** - Custom fields system
3. **20251110000002_create_invoice_email_system.sql** - Invoice email functionality
4. **20251109230000_create_payments_system.sql** - Payment processing with Stripe

## Best Practices

- Always test migrations locally before deploying
- Migrations should be idempotent (safe to run multiple times)
- Use IF NOT EXISTS for table/column creation
- Use DROP POLICY IF EXISTS before CREATE POLICY
- Include rollback instructions in comments

## Migration Consolidation Plan

To create a snapshot migration:

```sql
-- 20251118000000_schema_snapshot_v1.sql
-- CONSOLIDATED SCHEMA SNAPSHOT
-- Generated: 2025-11-18
-- Replaces: Migrations 1-100

-- This migration creates the complete schema in one go
-- Existing installations will skip this (all tables already exist)

-- Tables, policies, functions, views all in one file
-- See individual migrations for detailed history
```

This is marked as a TODO for future optimization.
