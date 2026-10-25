import { useState } from 'react';
import { saveTrip, regenerateDay, errorMessage } from '../api';
import {
  normalize, parseCost, money, dayTotal, stayTotal, tripTotal,
  travelersOf, dayDate, formatDate,
} from '../lib';

const TIMES = ['Morning', 'Midday', 'Afternoon', 'Evening', 'Night'];

function DayPanel({
  day, index, hidden, editing, currency, travelers, startDate,
  patch, regen,
}) {
  const setActivity = (i, change) =>
    patch(index, (d) => ({
      ...d,
      activities: d.activities.map((a, j) => (j === i ? { ...a, ...change } : a)),
    }));
  const removeActivity = (i) =>
    patch(index, (d) => ({ ...d, activities: d.activities.filter((_, j) => j !== i) }));
  const addActivity = () =>
    patch(index, (d) => ({
      ...d,
      activities: [...d.activities, { time: 'Afternoon', activity: '', details: '', cost: 0 }],
    }));
  const setCost = (i, v) => setActivity(i, { cost: Math.max(0, Number(v) || 0), cost_estimate: undefined });

  return (
    <section className="day-panel" hidden={hidden} aria-label={`Day ${day.day}`}>
      <header className="day-head">
        <div>
          <p className="muted small">
            Day {day.day}{startDate && <>, {dayDate(startDate, index)}</>}
          </p>
          {editing ? (
            <input
              className="input title-input"
              aria-label="Day theme"
              value={day.theme}
              onChange={(e) => patch(index, (d) => ({ ...d, theme: e.target.value }))}
            />
          ) : (
            <h2>{day.theme || `Day ${day.day}`}</h2>
          )}
        </div>
        <div className="day-cost">
          <strong>{money(dayTotal(day, travelers), currency)}</strong>
          <span className="muted small">
            {travelers > 1 ? `for ${travelers} people` : 'this day'}
          </span>
        </div>
      </header>

      <ol className="timeline">
        {day.activities.map((a, i) => (
          <li key={i}>
            <div className="when">
              {editing ? (
                <select
                  className="input"
                  aria-label="Time of day"
                  value={a.time}
                  onChange={(e) => setActivity(i, { time: e.target.value })}
                >
                  {[...new Set([a.time, ...TIMES])].map((t) => <option key={t}>{t}</option>)}
                </select>
              ) : (
                a.time
              )}
            </div>
            <div className="what">
              {editing ? (
                <>
                  <input
                    className="input"
                    aria-label="Activity"
                    placeholder="What are you doing?"
                    value={a.activity}
                    onChange={(e) => setActivity(i, { activity: e.target.value })}
                  />
                  <input
                    className="input"
                    aria-label="Details"
                    placeholder="Notes (optional)"
                    value={a.details || ''}
                    onChange={(e) => setActivity(i, { details: e.target.value })}
                  />
                </>
              ) : (
                <>
                  <h3>{a.activity}</h3>
                  {a.details && <p>{a.details}</p>}
                </>
              )}
            </div>
            <div className="price">
              {editing ? (
                <>
                  <input
                    className="input cost-input"
                    type="number"
                    min="0"
                    aria-label="Cost per person"
                    value={parseCost(a)}
                    onChange={(e) => setCost(i, e.target.value)}
                  />
                  <button className="btn small ghost danger" onClick={() => removeActivity(i)}>
                    Remove
                  </button>
                </>
              ) : parseCost(a) > 0 ? (
                money(parseCost(a), currency)
              ) : (
                <span className="muted">Free</span>
              )}
            </div>
          </li>
        ))}
      </ol>
      {editing && (
        <button className="btn small" onClick={addActivity}>Add a stop</button>
      )}

      <div className="day-extras">
        <div className="extra">
          <h4>Eating</h4>
          {editing ? (
            <>
              <label className="field slim">
                <span>Lunch</span>
                <input className="input" value={day.dining.lunch}
                  onChange={(e) => patch(index, (d) => ({ ...d, dining: { ...d.dining, lunch: e.target.value } }))} />
              </label>
              <label className="field slim">
                <span>Dinner</span>
                <input className="input" value={day.dining.dinner}
                  onChange={(e) => patch(index, (d) => ({ ...d, dining: { ...d.dining, dinner: e.target.value } }))} />
              </label>
              <label className="field slim">
                <span>Meals cost per person</span>
                <input className="input cost-input" type="number" min="0" value={parseCost(day.dining)}
                  onChange={(e) => patch(index, (d) => ({ ...d, dining: { ...d.dining, cost: Math.max(0, Number(e.target.value) || 0), cost_estimate: undefined } }))} />
              </label>
            </>
          ) : (
            <dl>
              <dt>Lunch</dt><dd>{day.dining.lunch || 'Not planned'}</dd>
              <dt>Dinner</dt><dd>{day.dining.dinner || 'Not planned'}</dd>
            </dl>
          )}
        </div>
        <div className="extra">
          <h4>Getting around</h4>
          {editing ? (
            <textarea className="input" rows={4} value={day.transport_note}
              onChange={(e) => patch(index, (d) => ({ ...d, transport_note: e.target.value }))} />
          ) : (
            <p>{day.transport_note || 'No transport notes for this day.'}</p>
          )}
        </div>
      </div>

      {regen}
    </section>
  );
}

export default function ItineraryView({ trip, onSaved, onDelete, onBack, notify }) {
  const [draft, setDraft] = useState(() => normalize(trip.itinerary_data));
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(0);
  const [regenOpen, setRegenOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  const currency = draft.currency || 'USD';
  const travelers = travelersOf(draft);
  const meta = draft.meta || {};
  const budget = meta.budget || trip.budget;
  const total = tripTotal(draft);
  const days = draft.days;
  const activeDay = days[active];

  const patchDay = (index, fn) => {
    setDraft((d) => ({ ...d, days: d.days.map((x, i) => (i === index ? fn(x) : x)) }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const row = await saveTrip(trip.id, draft);
      onSaved(row);
      setDirty(false);
      notify('Changes saved');
      return true;
    } catch (e) {
      notify(errorMessage(e), 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      // The server regenerates from the saved copy, so save any edits first.
      if (dirty) {
        const row = await saveTrip(trip.id, draft);
        onSaved(row);
        setDirty(false);
      }
      const row = await regenerateDay(trip.id, activeDay.day, instruction.trim() || null);
      setDraft(normalize(row.itinerary_data));
      onSaved(row);
      setRegenOpen(false);
      setInstruction('');
      notify(`Day ${activeDay.day} regenerated`);
    } catch (e) {
      notify(errorMessage(e), 'error');
    } finally {
      setRegenerating(false);
    }
  };

  const back = () => {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    onBack();
  };

  const regenBlock = (
    <div className="regen no-print">
      {!regenOpen ? (
        <button className="btn" onClick={() => setRegenOpen(true)} disabled={regenerating}>
          Regenerate day {activeDay?.day}
        </button>
      ) : (
        <div className="regen-form">
          <label className="field slim">
            <span>What should change? (optional)</span>
            <input
              className="input"
              autoFocus
              placeholder="More outdoors, cheaper dinner, start later…"
              value={instruction}
              maxLength={300}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !regenerating && regenerate()}
            />
          </label>
          <div className="row">
            <button className="btn primary" onClick={regenerate} disabled={regenerating}>
              {regenerating ? 'Regenerating…' : 'Regenerate'}
            </button>
            <button className="btn ghost" onClick={() => setRegenOpen(false)} disabled={regenerating}>
              Cancel
            </button>
          </div>
          {dirty && <p className="muted small">Your unsaved edits will be saved first.</p>}
        </div>
      )}
    </div>
  );

  const stay = draft.accommodation;

  return (
    <div className="page trip-page">
      <button className="link back no-print" onClick={back}>Back to all trips</button>

      <header className="trip-head">
        <div>
          <h1>{draft.trip_title || `Trip to ${trip.destination}`}</h1>
          {draft.summary && <p className="lede">{draft.summary}</p>}
        </div>
        <div className="actions no-print">
          {dirty && (
            <button className="btn primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          )}
          <button className={`btn ${editing ? 'dark' : ''}`} onClick={() => setEditing(!editing)}>
            {editing ? 'Done editing' : 'Edit trip'}
          </button>
          <button className="btn ghost" onClick={() => window.print()}>Print</button>
          <button className="btn ghost danger" onClick={onDelete}>Delete</button>
        </div>
      </header>

      <dl className="facts">
        <div><dt>Destination</dt><dd>{draft.destination || trip.destination}</dd></div>
        <div><dt>Length</dt><dd>{days.length} days</dd></div>
        {meta.start_date && <div><dt>Starts</dt><dd>{formatDate(meta.start_date)}</dd></div>}
        <div><dt>Travelers</dt><dd>{travelers}</dd></div>
        {budget && <div><dt>Budget</dt><dd>{budget}</dd></div>}
        {meta.travel_style && <div><dt>Style</dt><dd>{meta.travel_style}</dd></div>}
      </dl>

      <div className="overview">
        <div className="panel">
          <h3>Where you're staying</h3>
          {stay?.name ? (
            <>
              <p className="strong">{stay.name}{stay.area && <span className="muted">, {stay.area}</span>}</p>
              {stay.why && <p>{stay.why}</p>}
              {parseCost({ cost: stay.price_per_night }) > 0 && (
                <p className="muted small">
                  About {money(parseCost({ cost: stay.price_per_night }), currency)} a night
                  {stay.type && <>, {stay.type}</>}
                </p>
              )}
            </>
          ) : (
            <p className="muted">No stay suggested for this trip. Regenerate the trip to get one.</p>
          )}
        </div>
        <div className="panel">
          <h3>Getting there and around</h3>
          {draft.transport ? (
            <>
              {draft.transport.getting_there && <p>{draft.transport.getting_there}</p>}
              {draft.transport.getting_around && <p>{draft.transport.getting_around}</p>}
            </>
          ) : (
            <p className="muted">Each day lists how to move between stops.</p>
          )}
        </div>
        <div className="panel cost">
          <h3>Estimated cost</h3>
          <p className="total">{money(total, currency)}</p>
          <p className="muted small">
            Meals and activities for {travelers} {travelers === 1 ? 'person' : 'people'}
            {stayTotal(draft) > 0 && <>, plus {money(stayTotal(draft), currency)} for the stay</>}.
          </p>
        </div>
      </div>

      <div className="days-layout">
        <nav className="day-rail no-print" aria-label="Days">
          {days.map((d, i) => (
            <button key={i} className={i === active ? 'active' : ''} onClick={() => { setActive(i); setRegenOpen(false); }}>
              <span className="num">{d.day}</span>
              <span className="txt">
                <strong>{d.theme || `Day ${d.day}`}</strong>
                <small>{dayDate(meta.start_date, i) || money(dayTotal(d, travelers), currency)}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="days">
          {days.map((d, i) => (
            <DayPanel
              key={i}
              day={d}
              index={i}
              hidden={i !== active}
              editing={editing}
              currency={currency}
              travelers={travelers}
              startDate={meta.start_date}
              patch={patchDay}
              regen={i === active ? regenBlock : null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}