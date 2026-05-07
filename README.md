<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# TherapistMatchingApp

A therapist matching tool to help users find the therapist that fits.

View your app in AI Studio: https://ai.studio/apps/temp/1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Local API

The dev server persists local backend state to `server/data/therapist-matcher-db.json`.
That JSON file is ignored by git so local users, preferences, TMTI profiles, ingested therapist profiles, and generated matches do not get committed.

The dev server includes `GET /therapists` for therapist directory search:

`/therapists?areaCode=10001&therapyType=Anxiety&insuranceProvider=Aetna&insurancePlan=PPO`

Required filters are `areaCode`, `therapyType`, and `insuranceProvider` (or `insurance`). `insurancePlan` is optional.

Generate and persist ranked matches with:

`POST /matches/generate`

```json
{
  "userId": "demo-user",
  "areaCode": "10001",
  "therapyTypes": ["Anxiety", "Relationship conflict"],
  "insuranceProvider": "Aetna",
  "insurancePlan": "PPO",
  "preferredLanguage": "Mandarin",
  "carePreference": "Virtual"
}
```

Read the latest persisted matches for a user with `GET /users/demo-user/matches`.

Read persisted records with:

`GET /users/demo-user`
`GET /users/demo-user/preferences`
`GET /users/demo-user/onboarding`
`GET /users/demo-user/tmti-profile`

Persist raw conversation-style answers and generate a C-NIP conversation profile with:

`POST /users/demo-user/tmti-responses`

```json
{
  "responses": [
    { "questionCode": "directive_preference", "responseValue": "8" },
    { "questionCode": "warm_support", "responseValue": "reflective support" }
  ]
}
```

Persist explicit C-NIP conversation-style scoring with `POST /users/demo-user/tmti-profile`.

Turn a scraper-ready PsychologyToday profile into an immediate live result with:

`POST /therapists/psychologytoday`

```json
{
  "profileUrl": "https://www.psychologytoday.com/us/therapists/jane-li-new-york-ny",
  "fullName": "Jane Li",
  "credentials": "LCSW",
  "languages": ["Mandarin", "English"],
  "areaCodes": ["10001"],
  "expertise": ["Anxiety"],
  "sessionFormats": ["Virtual"],
  "insurance": [{ "provider": "Aetna", "plan": "PPO", "acceptingNewPatients": true }],
  "searchFilters": {
    "areaCode": "10001",
    "therapyType": "Anxiety",
    "insuranceProvider": "Aetna",
    "insurancePlan": "PPO"
  }
}
```

The response includes `liveResult`, and subsequent `/therapists` searches and `/matches/generate` calls use the ingested profile immediately.

Fetch a PsychologyToday profile URL directly, extract the page facts, persist the therapist, and reflect the fetched therapist against matching preferences with:

`POST /therapists/psychologytoday/fetch`

```json
{
  "profileUrl": "https://www.psychologytoday.com/us/therapists/jane-li-new-york-ny",
  "searchFilters": {
    "areaCode": "10001",
    "therapyType": "Anxiety",
    "insuranceProvider": "Aetna",
    "insurancePlan": "PPO"
  },
  "matchPreferences": {
    "userId": "demo-user",
    "areaCode": "10001",
    "therapyTypes": ["Anxiety"],
    "insuranceProvider": "Aetna",
    "insurancePlan": "PPO",
    "preferredLanguage": "Mandarin",
    "carePreference": "Virtual"
  }
}
```

If the fetched page omits structured ZIP, specialty, or insurance details, include `profileOverrides` with those fields; the response returns `scraped`, `liveResult`, and `matchReflection`.
