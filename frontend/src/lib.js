export const BRAND = 'Waypoint';

export const INTERESTS = [
  'Food', 'Sightseeing', 'History', 'Nature', 'Adventure',
  'Nightlife', 'Shopping', 'Art & museums', 'Beaches', 'Wellness',
];

// A stable dark colour per destination, used for trip covers.
export function coverStyle(name = '') {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return { backgroundColor: `hsl(${h} 38% 24%)` };
}

const toNumber = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

// New trips store a numeric `cost`; trips saved earlier only have a `cost_estimate` string.
export const parseCost = (item) => {
  if (!item) return 0;
  if (item.cost !== undefined && item.cost !== null) return toNumber(item.cost);
  return toNumber(item.cost_estimate);
};

export function money(value, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value)}`;
  }
}

export const travelersOf = (it) => it?.meta?.travelers || 1;

// Activities and meals are stored per person, so scale by group size.
export function dayTotal(day, travelers = 1) {
  const acts = (day.activities || []).reduce((s, a) => s + parseCost(a), 0);
  return (acts + parseCost(day.dining)) * travelers;
}

export function stayTotal(it) {
  const nights = Math.max(1, (it.days?.length || 1) - 1);
  return toNumber(it.accommodation?.price_per_night) * nights;
}

export function tripTotal(it) {
  const t = travelersOf(it);
  const days = (it.days || []).reduce((s, d) => s + dayTotal(d, t), 0);
  return days + stayTotal(it);
}

export function normalize(it) {
  const copy = JSON.parse(JSON.stringify(it || {}));
  copy.days = (copy.days || []).map((d, i) => ({
    ...d,
    day: d.day ?? i + 1,
    theme: d.theme || '',
    activities: (d.activities || []).map((a) => ({ ...a })),
    dining: { lunch: '', dinner: '', ...(d.dining || {}) },
    transport_note: d.transport_note || '',
  }));
  copy.meta = copy.meta || {};
  return copy;
}

export function dayDate(start, index) {
  if (!start) return '';
  const d = new Date(`${start}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + index);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export const tripDays = (trip) =>
  trip.itinerary_data?.meta?.days || trip.itinerary_data?.days?.length || 0;