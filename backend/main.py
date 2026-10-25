import os
import traceback

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ai_service import generate_itinerary, regenerate_day
from database import supabase
from models import (
    ItineraryUpdate,
    RegenerateDayRequest,
    TripRequest,
    TripResponse,
)

app = FastAPI(title="Travel Planner API")

origins = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer = HTTPBearer()


def current_user_id(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    """Verify the Supabase access token and return the user's id."""
    user = None
    try:
        user = supabase.auth.get_user(creds.credentials).user
    except Exception:
        pass
    if user is None:
        raise HTTPException(status_code=401, detail="Your session has expired. Please sign in again.")
    return user.id


def get_owned_trip(trip_id: str, user_id: str) -> dict:
    res = (
        supabase.table("itineraries")
        .select("*")
        .eq("id", trip_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Trip not found")
    return res.data[0]


def fail(e: Exception):
    traceback.print_exc()
    raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/trips")
def list_trips(user_id: str = Depends(current_user_id)):
    try:
        res = (
            supabase.table("itineraries")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data
    except Exception as e:
        fail(e)


@app.post("/api/generate-trip", response_model=TripResponse)
def create_trip(request: TripRequest, user_id: str = Depends(current_user_id)):
    try:
        itinerary = generate_itinerary(request)
        row = (
            supabase.table("itineraries")
            .insert(
                {
                    "user_id": user_id,
                    "destination": request.destination,
                    "budget": request.budget,
                    "itinerary_data": itinerary,
                }
            )
            .execute()
            .data[0]
        )
        return TripResponse(id=row["id"], itinerary=itinerary)
    except Exception as e:
        fail(e)


@app.put("/api/trips/{trip_id}")
def update_trip(trip_id: str, body: ItineraryUpdate, user_id: str = Depends(current_user_id)):
    get_owned_trip(trip_id, user_id)
    try:
        res = (
            supabase.table("itineraries")
            .update(
                {
                    "itinerary_data": body.itinerary,
                    "destination": body.itinerary.get("destination"),
                }
            )
            .eq("id", trip_id)
            .eq("user_id", user_id)
            .execute()
        )
        return res.data[0]
    except Exception as e:
        fail(e)


@app.post("/api/trips/{trip_id}/regenerate-day")
def regenerate_trip_day(
    trip_id: str, body: RegenerateDayRequest, user_id: str = Depends(current_user_id)
):
    row = get_owned_trip(trip_id, user_id)
    itinerary = row["itinerary_data"]
    days = itinerary.get("days", [])
    index = next((i for i, d in enumerate(days) if d.get("day") == body.day), None)
    if index is None:
        raise HTTPException(status_code=400, detail=f"Day {body.day} is not in this trip")
    try:
        days[index] = regenerate_day(itinerary, body.day, body.instruction)
        res = (
            supabase.table("itineraries")
            .update({"itinerary_data": itinerary})
            .eq("id", trip_id)
            .eq("user_id", user_id)
            .execute()
        )
        return res.data[0]
    except Exception as e:
        fail(e)


@app.delete("/api/trips/{trip_id}")
def delete_trip(trip_id: str, user_id: str = Depends(current_user_id)):
    get_owned_trip(trip_id, user_id)
    try:
        supabase.table("itineraries").delete().eq("id", trip_id).eq("user_id", user_id).execute()
        return {"deleted": trip_id}
    except Exception as e:
        fail(e)