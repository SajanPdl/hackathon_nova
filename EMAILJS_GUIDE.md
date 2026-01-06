# EmailJS Sponsorship Inquiry Guide

To make the sponsorship form functional, follow these steps to set up your EmailJS account.

## 1. Get Your Keys
1.  Go to your [EmailJS Dashboard](https://dashboard.emailjs.com/admin).
2.  Copy your **Public Key** from the "Account" section.
3.  In `pages/sponsor-contact.html`, find the line `// emailjs.init("YOUR_PUBLIC_KEY");` and replace `YOUR_PUBLIC_KEY` with your actual key, then uncomment the line.

## 2. Professional Email Template
In your EmailJS dashboard, create a new Email Template for the auto-reply or notification. Here is a professional structure:

### Subject:
Sponsorship Inquiry: {{company_name}} - Hackathon Nova 2026

### Body Content:
```html
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #ea580c; color: white; padding: 20px; text-align: center;">
    <img src="https://hackathon-nova.vercel.app/assets/logo.png" alt="Hackathon Nova Logo" style="width: 60px; height: 60px; border-radius: 8px; margin-bottom: 10px;">
    <h1 style="margin: 0;">Sponsorship Inquiry</h1>
    <p style="margin: 5px 0 0;">Hackathon Nova 2026</p>
  </div>
  
  <div style="padding: 20px;">
    <p>Dear <strong>CAPEC Team</strong>,</p>
    <p>We have received a new sponsorship inquiry from the website. Here are the details:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">Company Name:</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">{{company_name}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Industry:</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">{{industry}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Contact Person:</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">{{contact_name}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Designation:</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">{{designation}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;"><a href="mailto:{{email}}" style="color: #ea580c;">{{email}}</a></td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">{{phone}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Interest Level:</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">{{interest}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Budget Range:</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">{{budget}}</td>
      </tr>
    </table>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #ea580c;">
      <h3 style="margin-top: 0; font-size: 16px;">Message:</h3>
      <p style="white-space: pre-wrap; margin-bottom: 0;">{{message}}</p>
    </div>
    
    <p style="margin-top: 30px;">This inquiry was sent via the Sponsorship Contact Form on the official Hackathon Nova website.</p>
  </div>
  
  <div style="background-color: #f4f4f4; color: #777; padding: 15px; text-align: center; font-size: 12px;">
    &copy; 2026 CAPEC - Computer Association of Pokhara Engineering College. All rights reserved.
  </div>
</div>
```

## 3. Stylized Auto-Reply for Sponsors
In your EmailJS dashboard, create another template for the **Auto-Reply**. This will be sent automatically to the person who filled the form.

### Subject:
Thank you for your interest in Hackathon Nova 2026!

### Body (HTML):
```html
<div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
  <!-- Header with Brand Colors and Logo -->
  <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 20px; text-align: center; color: white;">
    <img src="https://hackathon-nova.vercel.app/assets/logo.png" alt="Hackathon Nova Logo" style="width: 80px; height: 80px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
    <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">HACKATHON NOVA</h1>
    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 16px; font-weight: 500;">CAPEC × ITEC-PEC</p>
  </div>
  
  <div style="padding: 40px 30px; background-color: #ffffff;">
    <p style="font-size: 16px; margin-bottom: 24px;">Dear <strong>{{contact_name}}</strong>,</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">Thank you for reaching out to us and expressing your interest in sponsoring <strong>Hackathon Nova</strong>, organized by CAPEC × ITEC-PEC at Pokhara Engineering College.</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">We have successfully received your sponsorship inquiry and truly appreciate your interest in supporting student innovation and technology-driven initiatives.</p>
    
    <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; color: #9a3412; font-weight: 500;">
        Our organizing team is currently reviewing your message and will get back to you shortly with detailed information regarding sponsorship opportunities, benefits, and next steps.
      </p>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 24px;">If you have any additional details to share in the meantime, feel free to reply directly to this email.</p>
    
    <p style="font-size: 16px; margin-bottom: 8px;">Thank you once again for your interest and support.</p>
    
    <div style="margin-top: 40px; border-top: 1px solid #f3f4f6; pt: 24px;">
      <p style="margin: 0; font-weight: 700; color: #111827;">Warm regards,</p>
      <p style="margin: 4px 0 0; color: #4b5563; font-size: 15px;">Hackathon Nova Organizing Team</p>
      <p style="margin: 2px 0 0; color: #6b7280; font-size: 14px;">CAPEC × ITEC-PEC</p>
      <p style="margin: 2px 0 0; color: #6b7280; font-size: 14px;">Pokhara Engineering College</p>
    </div>
  </div>
  
  <!-- Footer -->
  <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #f3f4f6;">
    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
      &copy; 2026 CAPEC. All rights reserved.<br>
      You are receiving this because you filled out the sponsorship form on our website.
    </p>
  </div>
</div>
```
