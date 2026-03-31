-- Weather-Boy: Hyperlokal værkorreksjon for bønder
-- Supabase schema

-- Stasjoner (landbruksstasjoner i Norge)
CREATE TABLE stations (
    id TEXT PRIMARY KEY,            -- MET station ID, e.g. 'SN17850'
    name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    elevation INTEGER,
    region TEXT,                     -- e.g. 'Østfold', 'Jæren', 'Trøndelag'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Yr Locationforecast prognoser
CREATE TABLE forecasts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    station_id TEXT REFERENCES stations(id),
    fetched_at TIMESTAMPTZ NOT NULL,    -- når vi hentet prognosen
    valid_at TIMESTAMPTZ NOT NULL,      -- tidspunkt prognosen gjelder for
    lead_time_h INTEGER NOT NULL,       -- timer frem i tid
    temp REAL,                          -- °C
    wind_speed REAL,                    -- m/s
    wind_dir REAL,                      -- grader
    precip REAL,                        -- mm
    humidity REAL,                      -- %
    pressure REAL,                      -- hPa
    cloud_cover REAL,                   -- %
    UNIQUE (station_id, fetched_at, valid_at)
);

-- Frost observasjoner (faktisk vær)
CREATE TABLE observations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    station_id TEXT REFERENCES stations(id),
    observed_at TIMESTAMPTZ NOT NULL,
    temp REAL,
    wind_speed REAL,
    wind_dir REAL,
    precip REAL,
    humidity REAL,
    pressure REAL,
    UNIQUE (station_id, observed_at)
);

-- ML-korrigerte prognoser
CREATE TABLE corrections (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    station_id TEXT REFERENCES stations(id),
    valid_at TIMESTAMPTZ NOT NULL,
    lead_time_h INTEGER NOT NULL,
    -- korrigerte verdier
    temp_original REAL,
    temp_corrected REAL,
    wind_speed_original REAL,
    wind_speed_corrected REAL,
    -- beslutningssignaler
    frost_risk TEXT CHECK (frost_risk IN ('low', 'medium', 'high')),
    mowing_ok BOOLEAN,
    spraying_ok BOOLEAN,
    drying_score REAL,                  -- 0-1, hvor godt tørkeforhold
    confidence REAL,                    -- 0-1, modellens konfidens
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (station_id, valid_at, lead_time_h)
);

-- Indekser for raske oppslag
CREATE INDEX idx_forecasts_station_valid ON forecasts(station_id, valid_at);
CREATE INDEX idx_observations_station_observed ON observations(station_id, observed_at);
CREATE INDEX idx_corrections_station_valid ON corrections(station_id, valid_at);

-- RLS (Row Level Security) — åpent lesing, beskyttet skriving
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrections ENABLE ROW LEVEL SECURITY;

-- Alle kan lese
CREATE POLICY "Public read" ON stations FOR SELECT USING (true);
CREATE POLICY "Public read" ON forecasts FOR SELECT USING (true);
CREATE POLICY "Public read" ON observations FOR SELECT USING (true);
CREATE POLICY "Public read" ON corrections FOR SELECT USING (true);

-- Kun service_role kan skrive (GitHub Actions bruker service key)
CREATE POLICY "Service write" ON stations FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write" ON forecasts FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write" ON observations FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write" ON corrections FOR INSERT WITH CHECK (auth.role() = 'service_role');
