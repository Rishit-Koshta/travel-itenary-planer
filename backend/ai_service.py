import json
import os
import re

from dotenv import load_dotenv
from groq import Groq

from typing import Optional

from models import TripRequest

load_dotenv()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "openai/gpt-oss-120b"

DAY_SCHEMA = """{
  "day": 1,
  "theme": "short theme for the day",
  "activities": [
    {"time": "Morning", "activity": "what to do and where", "details": "one practical sentence", "cost": 0}
  ],
  "dining": {"lunch": "place and dish", "dinner": "place and dish", "cost": 0},
  "transport_note": "how to move between today's stops, with rough travel times"
}"""

TRIP_SCHEMA = """{
  "trip_title": "string",
  "destination": "string",
  "summary": "two sentence overview of the trip",
  "currency": "ISO code such as USD",
  "accommodation": {"name": "string", "area": "string", "type": "hotel, hostel, homestay...", "price_per_night": 0, "why": "one sentence"},
  "transport": {"getting_there": "string", "getting_around": "string"},
  "days": [ """ + DAY_SCHEMA + """ ]
}"""


def _chat_json(prompt: str, temperature: float = 0.7) -> dict:
    response = groq_client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You are an expert travel planner. Reply with valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=temperature,
    )
    raw = (response.choices[0].message.content or "").strip()
    raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()
    return json.loads(raw)


def _group_text(req: TripRequest) -> str:
    if req.travelers == 1:
        return "a solo traveler"
    if req.travelers == 2:
        return "a couple or two friends"
    return f"a group of {req.travelers} people"


def generate_itinerary(req: TripRequest) -> dict:
    interests = ", ".join(req.interests) if req.interests else "general sightseeing"
    dates = f"Trip starts on {req.start_date}." if req.start_date else "No fixed dates."
    notes = f"Extra requests from the traveler: {req.notes}" if req.notes else ""

    prompt = f"""
Create a {req.days}-day itinerary for {req.destination} for {_group_text(req)}.
{dates}
Budget level: {req.budget}. Travel style: {req.travel_style}. Interests: {interests}.
{notes}

Rules:
- Give 3 to 4 activities per day with times like Morning, Afternoon, Evening.
- Group each day's stops by neighbourhood so travel time stays short, and say how to get between them in transport_note.
- Match the pace to the travel style and the prices to the budget level.
- All costs are numbers in {req.currency}, per person. dining.cost covers lunch and dinner together, per person. Use 0 for free things.
- accommodation.price_per_night is for one room or unit.
- Use real, well-known places in {req.destination}.
- Number the days from 1 to {req.days}.

Return JSON in exactly this shape:
{TRIP_SCHEMA}
"""
    data = _chat_json(prompt)
    data["currency"] = req.currency
    data["destination"] = data.get("destination") or req.destination
    for i, day in enumerate(data.get("days", []), start=1):
        day["day"] = i
    data["meta"] = {
        "start_date": req.start_date,
        "travelers": req.travelers,
        "budget": req.budget,
        "travel_style": req.travel_style,
        "interests": req.interests,
        "days": req.days,
        "notes": req.notes,
    }
    return data


def regenerate_day(itinerary: dict, day_number: int, instruction: Optional[str] = None) -> dict:
    meta = itinerary.get("meta", {})
    other_days = []
    for d in itinerary.get("days", []):
        if d.get("day") == day_number:
            continue
        stops = ", ".join(a.get("activity", "") for a in d.get("activities", []))
        other_days.append(f"Day {d.get('day')} ({d.get('theme', '')}): {stops}")

    change = instruction.strip() if instruction else "Make a fresh alternative day."
    prompt = f"""
We are replacing day {day_number} of a trip to {itinerary.get('destination')}.
Budget level: {meta.get('budget', 'Moderate')}. Travel style: {meta.get('travel_style', 'Relaxing')}.
Interests: {', '.join(meta.get('interests', [])) or 'general sightseeing'}. Travelers: {meta.get('travelers', 1)}.
Currency: {itinerary.get('currency', 'USD')} (costs are numbers, per person).

The other days already cover these places, so do not repeat them:
{chr(10).join(other_days) or 'none'}

What the traveler wants changed: {change}

Return only the new day as JSON in exactly this shape:
{DAY_SCHEMA}
"""
    new_day = _chat_json(prompt, temperature=0.8)
    new_day["day"] = day_number
    return new_day