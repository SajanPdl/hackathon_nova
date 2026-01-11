# Volunteer Portal: SendZen WhatsApp Notifications

This system integrates secure, **SendZen WhatsApp-driven** admin notifications and actions into the existing Volunteer Attendance Portal. 

## Key Features

1.  **Automatic Action Tokens**: Backend edge functions ([checkin.js](file:///c:/Users/Sajan/Desktop/9th%20expo/hackathon/volunteer-qr-portal/edge-functions/checkin.js) and [checkout.js](file:///c:/Users/Sajan/Desktop/9th%20expo/hackathon/volunteer-qr-portal/edge-functions/checkout.js)) automatically trigger token generation on scanning.
2.  **Automated WhatsApp Alerts**: Messages are sent **instantly** via SendZen whenever a volunteer scans their QR code.
3.  **Secure Action Link**: Mobile-optimized landing page for admins to approve/decline check-ins directly from the WhatsApp message.

## Deployment Steps

### 1. Database (Supabase)
- Run the SQL in [schema.sql](file:///c:/Users/Sajan/Desktop/9th%20expo/hackathon/volunteer-qr-portal/volunteer-whatsapp-links/schema.sql) and [policies.sql](file:///c:/Users/Sajan/Desktop/9th%20expo/hackathon/volunteer-qr-portal/volunteer-whatsapp-links/policies.sql).

### 2. SendZen Integration
1.  **Get API Key**: Copy your SendZen Bearer token (`sz_sandbox_zNnpJWJPoLSDRMBeVj77xZNoUKZ4pwLS7tV3m8iNDqGi-Q`).
2.  **Sandbox Number**: Note your SendZen "from" number (`919099912730`).
3.  **Supabase Config**: Add these Environment Variables to Supabase:
    - `SENDZEN_API_KEY`: `sz_sandbox_zNnpJWJPoLSDRMBeVj77xZNoUKZ4pwLS7tV3m8iNDqGi-Q`
    - `SENDZEN_FROM_NUMBER`: `919099912730`
    - `NOTIFY_PHONE_DEFAULT`: `+9779765630970`
    - `ACTION_LINK_BASE`: The URL of your action-page (e.g., `https://verify.hackathon-nova.com/?t=`).

> [!NOTE]
> The system automatically cleans the `+` and spaces from the phone number for SendZen compatibility.

### 3. Edge Functions
- Deploy the functions in [edge-functions/](file:///c:/Users/Sajan/Desktop/9th%20expo/hackathon/volunteer-qr-portal/volunteer-whatsapp-links/edge-functions/).

### 4. Admin Action Page
- Host the files in [frontends/admin-action/](file:///c:/Users/Sajan/Desktop/9th%20expo/hackathon/volunteer-qr-portal/volunteer-whatsapp-links/frontends/admin-action/) on your cPanel host (e.g., `verify.hackathon-nova.com`).

## Workflow
1.  **Volunteer Scans**: Scanning at a kiosk triggers the backend.
2.  **SendZen Alert**: Admin receives an instant WhatsApp message via SendZen with the **Approval Link**.
3.  **One-Tap Action**: Admin clicks the link, confirms details on the mobile page, and clicks **Approve**.
4.  **Instant Update**: The attendance record is updated in Supabase immediately.
