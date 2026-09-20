-- ========================================================
-- RULEVISION - Supabase Database Schema
-- SIH26034: Legal Metrology (Packaged Commodities) Rules, 2011 Auditor
-- ========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Primary Inspections Table
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_code VARCHAR(64) UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  commodity_name TEXT,
  mrp VARCHAR(64),
  net_quantity VARCHAR(64),
  manufacturing_or_packing_date VARCHAR(64),
  expiry_or_best_before VARCHAR(128),
  consumer_care_contact TEXT,
  manufacturer_name TEXT,
  manufacturer_address TEXT,
  country_of_origin VARCHAR(128),
  overall_status VARCHAR(32) NOT NULL CHECK (overall_status IN ('COMPLIANT', 'NON_COMPLIANT', 'NEEDS_REVIEW')),
  passed_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  review_count INT DEFAULT 0,
  extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  compliance_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  violations JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location_name TEXT,
  is_demo BOOLEAN DEFAULT FALSE,
  reviewed_by_inspector BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(overall_status);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON inspections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_code ON inspections(inspection_code);
CREATE INDEX IF NOT EXISTS idx_inspections_product ON inspections USING gin (to_tsvector('english', product_name));

-- Row Level Security (RLS)
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- Allow read/write for inspection operations (public read, authenticated/anon write for prototype)
CREATE POLICY "Allow public read access for audit verification"
  ON inspections FOR SELECT
  USING (true);

CREATE POLICY "Allow insert for new inspections"
  ON inspections FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update for inspector reviews"
  ON inspections FOR UPDATE
  USING (true);

-- Storage bucket creation instruction:
-- In Supabase dashboard: Storage -> Create Bucket -> Name: 'package-images' -> Public: true
