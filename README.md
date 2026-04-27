# Noah — Field Sales Hiring Funnel

Static landing page for Noah's Instagram → hiring funnel at `boyerscales.com/iamnoah`.

Visitors hit a 5-question multiple-choice qualifier, drop their phone number,
and land in Noah's webhook so he can follow up by call or text (manually or
automatically).

## Files

- `index.html` — page structure + qualifier markup
- `styles.css` — responsive premium styling (dark hero, multi-step quiz UI)
- `app.js` — hero canvas animation + multi-step funnel logic + submit handler

## How the funnel works

1. **Hero** — direct, no-fluff pitch.
2. **Qualifier** — five multiple-choice screens that auto-advance on tap:
   1. Age (18+ check)
   2. Sales background
   3. Start timeline
   4. Hours per week
   5. Door-to-door / commission fit
3. **Contact** — name, phone (auto-formatted), city/state, SMS consent.
4. **Submit** — payload is POSTed to `data-endpoint` and a success screen renders.

The submitted JSON looks like:

```json
{
  "source": "instagram-landing-page",
  "page": "boyerscales.com/iamnoah",
  "submittedAt": "2026-04-27T17:35:00.000Z",
  "contact": {
    "name": "Jane Doe",
    "phone": "(555) 123-4567",
    "phone_digits": "5551234567",
    "location": "Phoenix, AZ",
    "consent": true
  },
  "qualifier": {
    "age": "18+",
    "experience": "customer_facing",
    "start_timeline": "two_weeks",
    "hours": "full_time",
    "fit": "built_for_it"
  },
  "qualifierLabels": { "...": "human-readable versions for review" }
}
```

## Launch checklist

1. In `index.html`, on the `<form id="qualifierForm">`:
   - Replace `data-endpoint="PASTE_AI_RECEPTIONIST_WEBHOOK_HERE"` with the
     receiving webhook (Make / Zapier / n8n / AI receptionist / CRM).
   - Optionally replace `data-booking-url="PASTE_BOOKING_LINK_HERE"` with a
     Calendly / SavvyCal / etc. link to redirect after submission.
2. Confirm the SMS consent line matches the tools and phone numbers used for
   follow-up.
3. Update the bullets in the `#details` section if Noah wants different
   on-page language about pay, schedule, or training.

If no webhook is set, submissions are logged to the browser console under
`[qualifier preview]` so the payload can be verified before going live.

## Preview locally

Open `index.html` directly in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```
