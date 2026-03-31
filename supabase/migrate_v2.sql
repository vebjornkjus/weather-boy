-- Migration: add new columns for improved data collection
-- Run this in Supabase SQL Editor on existing databases

-- Forecasts: add cloud layers, dewpoint, fog, precip period
ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS precip_period_h INTEGER DEFAULT 1;
ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS cloud_cover_low REAL;
ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS cloud_cover_high REAL;
ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS dew_point REAL;
ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS fog REAL;

-- Observations: add surface temp, min temp, dewpoint
ALTER TABLE observations ADD COLUMN IF NOT EXISTS temp_min REAL;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS surface_temp REAL;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS dew_point REAL;

-- Corrections: add precip, humidity, cloud_cover for frontend display
ALTER TABLE corrections ADD COLUMN IF NOT EXISTS precip REAL;
ALTER TABLE corrections ADD COLUMN IF NOT EXISTS humidity REAL;
ALTER TABLE corrections ADD COLUMN IF NOT EXISTS cloud_cover REAL;
