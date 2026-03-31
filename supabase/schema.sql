-- Weather-Boy: Hyperlocal weather correction for Norwegian farmers

CREATE TABLE stations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    elevation INTEGER,
    region TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forecasts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    station_id TEXT REFERENCES stations(id),
    fetched_at TIMESTAMPTZ NOT NULL,
    valid_at TIMESTAMPTZ NOT NULL,
    lead_time_h INTEGER NOT NULL,
    temp REAL,
    wind_speed REAL,
    wind_dir REAL,
    precip REAL,
    precip_period_h INTEGER DEFAULT 1,
    humidity REAL,
    pressure REAL,
    cloud_cover REAL,
    cloud_cover_low REAL,
    cloud_cover_high REAL,
    dew_point REAL,
    fog REAL,
    UNIQUE (station_id, fetched_at, valid_at)
);

CREATE TABLE observations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    station_id TEXT REFERENCES stations(id),
    observed_at TIMESTAMPTZ NOT NULL,
    temp REAL,
    temp_min REAL,
    surface_temp REAL,
    wind_speed REAL,
    wind_dir REAL,
    precip REAL,
    humidity REAL,
    pressure REAL,
    dew_point REAL,
    UNIQUE (station_id, observed_at)
);

CREATE TABLE corrections (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    station_id TEXT REFERENCES stations(id),
    valid_at TIMESTAMPTZ NOT NULL,
    lead_time_h INTEGER NOT NULL,
    temp_original REAL,
    temp_corrected REAL,
    wind_speed_original REAL,
    wind_speed_corrected REAL,
    precip REAL,
    humidity REAL,
    cloud_cover REAL,
    frost_risk TEXT CHECK (frost_risk IN ('low', 'medium', 'high')),
    mowing_ok BOOLEAN,
    spraying_ok BOOLEAN,
    drying_score REAL,
    confidence REAL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (station_id, valid_at, lead_time_h)
);

CREATE INDEX idx_forecasts_station_valid ON forecasts(station_id, valid_at);
CREATE INDEX idx_observations_station_observed ON observations(station_id, observed_at);
CREATE INDEX idx_corrections_station_valid ON corrections(station_id, valid_at);

ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON stations FOR SELECT USING (true);
CREATE POLICY "Public read" ON forecasts FOR SELECT USING (true);
CREATE POLICY "Public read" ON observations FOR SELECT USING (true);
CREATE POLICY "Public read" ON corrections FOR SELECT USING (true);

CREATE POLICY "Service write" ON stations FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write" ON forecasts FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write" ON observations FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write" ON corrections FOR INSERT WITH CHECK (auth.role() = 'service_role');
