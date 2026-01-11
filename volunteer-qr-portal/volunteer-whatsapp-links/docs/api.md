# Edge Functions API Documentation

## 1. `create-action-link` (POST)
Generates a new action token and WhatsApp message.
- **Body**: `{ target_table, target_id, action_type, volunteer_name, org }`
- **Returns**: `{ success, token, actionLink, waLink, message }`

## 2. `action-page` (GET)
Retrieves metadata for a specific token.
- **Query Params**: `t=<token>`
- **Returns**: `{ success, action_type, target_summary, require_pin }`

## 3. `action-apply` (POST)
Applies the admin action.
- **Body**: `{ token, action, admin_note, pin }`
- **Returns**: `{ success, message }`

## Internal Utilities (`utils.js`)
- `createAdminClient()`: Initializes Supabase admin client.
- `logAudit()`: Logs actions to `audit_logs`.
- `validateToken()`: Verifies token existence, expiry, and single-use status.
- `formatKathmanduTime()`: Helper for Nepal timezone formatting.
