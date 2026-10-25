from typing import List, Optional

from pydantic import BaseModel, Field


class TripRequest(BaseModel):
    # user_id is taken from the verified Supabase token on the server.
    # It is still accepted here so older clients don't break.
    user_id: Optional[str] = None
    destination: str = Field(min_length=2, max_length=120)
    days: int = Field(ge=1, le=14)
    budget: str
    travel_style: str
    interests: List[str] = []
    start_date: Optional[str] = None
    travelers: int = Field(default=1, ge=1, le=20)
    currency: str = "USD"
    notes: Optional[str] = Field(default=None, max_length=600)


class TripResponse(BaseModel):
    id: Optional[str] = None
    itinerary: dict


class ItineraryUpdate(BaseModel):
    itinerary: dict


class RegenerateDayRequest(BaseModel):
    day: int = Field(ge=1)
    instruction: Optional[str] = Field(default=None, max_length=300)