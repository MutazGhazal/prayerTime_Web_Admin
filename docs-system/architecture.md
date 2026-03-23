# Architecture (MVP)

## Mobile (Flutter)

### Data Flow
1. Determine location (GPS or manual city).
2. Fetch prayer times from Aladhan API.
3. Cache daily times locally.
4. Show next prayer countdown and full list.
5. Schedule notifications for each prayer.
6. Generate a daily image and share to WhatsApp.

### Modules
- `data/`
  - `PrayerTimesApi` (Aladhan HTTP client)
  - `PrayerTimesCache` (local storage)
- `domain/`
  - `PrayerTimes` model
  - `NextPrayerCalculator`
- `presentation/`
  - Home screen
  - Settings screen
- `services/`
  - `NotificationsService`
  - `StatusShareService` (Android Intent / iOS Share Extension)

