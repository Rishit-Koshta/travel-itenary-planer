import { useEffect, useState } from 'react';
import { generateTrip, errorMessage } from '../api';
import { INTERESTS } from '../lib';

const BUDGETS = [
  ['Budget', 'Hostels, street food, public transport'],
  ['Moderate', 'Comfortable hotels, mix of dining'],
  ['Luxury', 'Premium stays, standout restaurants'],
];
const STYLES = ['Relaxing', 'Fast-paced', 'Adventurous', 'Cultural', 'Family-friendly'];
const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP'];

const STEPS = [
  'Choosing neighbourhoods to base each day in',
  'Matching places to your interests',
  'Pricing meals and activities',
  'Ordering stops to cut travel time',
];

function Stepper({ label, value, min, max, onChange }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="stepper">
        <button type="button" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
        <output>{value}</output>
        <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  );
}

export default function TripBuilder({ onCancel, onCreated, notify }) {
  const [form, setForm] = useState({
    destination: '',
    start_date: '',
    days: 3,
    travelers: 1,
    budget: 'Moderate',
    travel_style: 'Relaxing',
    currency: 'USD',
    interests: [],
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2500);
    return () => clearInterval(t);
  }, [loading]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleInterest = (name) =>
    set({
      interests: form.interests.includes(name)
        ? form.interests.filter((i) => i !== name)
        : [...form.interests, name],
    });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStep(0);
    try {
      const res = await generateTrip({
        ...form,
        start_date: form.start_date || null,
        notes: form.notes.trim() || null,
        interests: form.interests.length ? form.interests : ['Sightseeing'],
      });
      onCreated({
        id: res.id,
        destination: res.itinerary.destination || form.destination,
        budget: form.budget,
        itinerary_data: res.itinerary,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      notify(errorMessage(err), 'error');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page narrow">
        <div className="generating" role="status">
          <h1>Building your {form.days}-day trip to {form.destination}</h1>
          <p className="muted">{STEPS[step]}…</p>
          <div className="bar"><span /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page narrow">
      <header className="page-head">
        <div>
          <h1>Plan a trip</h1>
          <p className="muted">The more you tell us, the less you'll need to edit.</p>
        </div>
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
      </header>

      <form className="builder" onSubmit={submit}>
        <label className="field">
          <span>Where to?</span>
          <input
            className="input big"
            required
            minLength={2}
            placeholder="Lisbon, Portugal"
            value={form.destination}
            onChange={(e) => set({ destination: e.target.value })}
          />
        </label>

        <div className="grid-3">
          <label className="field">
            <span>Start date (optional)</span>
            <input
              className="input"
              type="date"
              value={form.start_date}
              onChange={(e) => set({ start_date: e.target.value })}
            />
          </label>
          <Stepper label="Days" value={form.days} min={1} max={14} onChange={(v) => set({ days: v })} />
          <Stepper label="Travelers" value={form.travelers} min={1} max={20} onChange={(v) => set({ travelers: v })} />
        </div>

        <fieldset className="field">
          <legend>Budget</legend>
          <div className="choice-row">
            {BUDGETS.map(([name, hint]) => (
              <button
                type="button"
                key={name}
                aria-pressed={form.budget === name}
                className="choice"
                onClick={() => set({ budget: name })}
              >
                <strong>{name}</strong>
                <small>{hint}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Travel style</legend>
          <div className="chips">
            {STYLES.map((s) => (
              <button
                type="button"
                key={s}
                className="chip"
                aria-pressed={form.travel_style === s}
                onClick={() => set({ travel_style: s })}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Interests</legend>
          <div className="chips">
            {INTERESTS.map((i) => (
              <button
                type="button"
                key={i}
                className="chip"
                aria-pressed={form.interests.includes(i)}
                onClick={() => toggleInterest(i)}
              >
                {i}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid-2">
          <label className="field">
            <span>Anything else we should know?</span>
            <textarea
              className="input"
              rows={3}
              maxLength={600}
              placeholder="Vegetarian, travelling with a toddler, want a day trip outside the city…"
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Show costs in</span>
            <select className="input" value={form.currency} onChange={(e) => set({ currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>

        <button className="btn primary big" type="submit">Generate itinerary</button>
      </form>
    </div>
  );
}