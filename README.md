# Weather-Boy

Hyperlocal ML-corrected weather forecasts for Norwegian farmers. Beats Yr by learning its systematic errors at specific agricultural stations.

## How it works

```
Yr forecast → XGBoost correction model → Better forecast
                     ↑
         Trained on historical Yr errors vs Frost observations
```

**Decision signals for farmers:**
- Frost risk (critical for crops in valleys)
- Mowing conditions (dry + warm + wind)
- Spraying windows (low wind, no rain)
- Drying score (hay drying conditions)

## Architecture

| Component | Tech | Hosting |
|-----------|------|---------|
| Frontend | Next.js + Tailwind | Vercel (free) |
| ML pipeline | Python + XGBoost | GitHub Actions (free) |
| Database | PostgreSQL | Supabase (free) |
| Data sources | Yr Locationforecast + MET Frost API | Free |

## Setup

See the [setup checklist](#setup-checklist) below.

## Stations

| Station | Region | Focus |
|---------|--------|-------|
| Ås (NMBU) | Akershus | General agriculture |
| Lier | Buskerud | Fruit farming |
| Kvithamar | Trøndelag | Research farm |
| Særheim | Jæren | Grass/livestock |
| Kise | Hedmark | Grain |
| Tjølling | Vestfold | Vegetables |
| Holt | Tromsø | Northern agriculture |

## Setup checklist

1. **Register for MET Frost API** at https://frost.met.no/auth/requestCredentials.html
2. **Create a Supabase project** at https://supabase.com
3. **Run the schema** — paste `supabase/schema.sql` in Supabase SQL editor
4. **Set GitHub secrets** in your repo settings:
   - `FROST_CLIENT_ID`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
5. **Set Vercel env vars:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. **Deploy frontend** to Vercel (connect `web/` directory)
7. **Trigger first collection** — run the `collect.yml` workflow manually
8. **Wait for data** — model needs ~60-90 days of data for temperature correction
9. **Train model** — run `train.yml` workflow when enough data is collected
