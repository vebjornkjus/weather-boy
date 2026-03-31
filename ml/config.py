"""Station configuration and constants for Weather-Boy."""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()

FROST_CLIENT_ID = os.environ.get("FROST_CLIENT_ID", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

YR_USER_AGENT = "weather-boy/0.1 github.com/vebjornkjus/weather-boy"


@dataclass(frozen=True)
class Station:
    id: str
    name: str
    lat: float
    lon: float
    elevation: int
    region: str


STATIONS = [
    Station("SN17850", "Ås (NMBU)", 59.6606, 10.7814, 94, "Akershus"),
    Station("SN19710", "Lier", 59.7833, 10.2500, 45, "Buskerud"),
    Station("SN69150", "Kvithamar", 63.4889, 10.8750, 40, "Trøndelag"),
    Station("SN44300", "Særheim", 58.7600, 5.6500, 90, "Jæren"),
    Station("SN12680", "Kise", 60.7700, 10.8100, 128, "Hedmark"),
    Station("SN27500", "Tjølling", 59.0833, 10.1333, 25, "Vestfold"),
    Station("SN90450", "Holt", 69.6533, 18.9058, 20, "Tromsø"),
    Station("SN4200", "Kjeller (Leirsund)", 59.9708, 11.0383, 108, "Akershus"),
]
