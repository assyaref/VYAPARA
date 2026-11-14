-- Add contact_person column to suppliers table (snake_case convention used elsewhere in DB)
-- This migration should be run after 004-supplier-management.sql
ALTER TABLE suppliers ADD COLUMN contact_person TEXT;