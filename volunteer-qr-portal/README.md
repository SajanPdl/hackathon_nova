# Volunteer QR Attendance & Activity Management System

A production-ready system for managing volunteer attendance and activities for CAPEC and ITEC-PEC organizations.

## Features
- **Dual Organization Support**: Separate portals for CAPEC and ITEC-PEC.
- **QR Attendance**: Mobile scanning for check-in/check-out.
- **Device Kiosk**: Dedicated mode for attendance kiosks.
- **Admin Panel**: Real-time dashboard, approvals, and reporting.
- **Offline-First (Lite)**: Robust error handling (though strictly online enforced).
- **Security**: Device API keys, RLS policies, and Audit Logging.

## Setup & Deployment

1.  **Database**:
    - Run `schema.sql` in your Supabase SQL Editor.
    - Run `policies.sql` to apply RLS.

2.  **Environment Variables**:
    - Configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your frontend `app.js` files (or injected via build).
    - Set `ORG` variable in `volunteer-portal/*/app.js` (`'CAPEC'` or `'ITECPEC'`).

3.  **Edge Functions**:
    - Deploy functions in `edge-functions/` using Supabase CLI:
      ```bash
      supabase functions deploy checkin
      supabase functions deploy checkout
      supabase functions deploy task
      # ... etc
      ```

4.  **QR Generation**:
    - Run `node qr-generator/generate-qr.js` to create badges from `mock-data/`.

## Documentation
- **[Interactive Portal](./documentation/index.html) (Recommended)**: A premium, interactive guide for volunteers and technical staff.
- **[Markdown Source](./documentation/README.md)**: Raw documentation files.

## Tech Stack
- Frontend: HTML5, CSS3, Vanilla JS
- Backend: Supabase (Postgres, RLS, Edge Functions)
- Tools: `html5-qrcode`

## License
MIT
