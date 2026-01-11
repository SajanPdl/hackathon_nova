# cPanel Deployment Guide - WhatsApp Action System

This guide explains how to host the static frontend files on cPanel.

## Subdomain Mapping
We recommend mapping subdomains for a professional feel:
1.  **scan.yourdomain.com** -> `/public_html/scan/`
2.  **admin.yourdomain.com** -> `/public_html/admin/`
3.  **verify.yourdomain.com** -> `/public_html/admin-action/`

## Steps to Upload
1.  Login to **cPanel File Manager**.
2.  Navigate to `/public_html/`.
3.  Create the following folders:
    - `scan`
    - `admin`
    - `admin-action`
4.  Upload the corresponding files from the `frontends/` directory into these folders.
    - `frontends/scan/*` -> `/public_html/scan/`
    - `frontends/admin-dashboard/*` -> `/public_html/admin/`
    - `frontends/admin-action/*` -> `/public_html/admin-action/`

## Configuration
Before uploading, ensure you have updated the `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_KEY` placeholders in:
- `scan/app.js`
- `admin/admin.js`
- `admin-action/app.js`

## Security (Recommended)
Use **cPanel Directory Privacy** to password protect the `admin` folder so that only authorized staff can access the dashboard.
