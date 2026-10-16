# VAYVOR auth email templates

Supabase sends these for sign-up confirmation, password recovery and similar. They are **not applied** by this repo:
paste each file into **Authentication → Email Templates** in the Supabase dashboard (or reference them from
`config.toml` if you use the CLI), and set the subjects below.

| Template | File | Subject |
| --- | --- | --- |
| Confirm signup | `confirmation.html` | Confirm your VAYVOR email |
| Reset password | `recovery.html` | Reset your VAYVOR password |
| Change email | `email_change.html` | Confirm your new VAYVOR email |
| Magic link (unused for now) | `magic_link.html` | Your VAYVOR sign-in link |
| Reauthentication | `reauthentication.html` | Your VAYVOR confirmation code |

Notes
- Logo and links use `{{ .SiteURL }}`, so they follow whatever **Site URL** is configured. Until vayvor.com is
  registered and connected, keep Site URL set to the actual working origin (the current Vercel URL). The logo image is
  `public/brand/vayvor-wordmark-email.png`, served from that origin (email clients don't render SVG).
- Add every origin the app is served from (production, preview, local dev) to **Redirect URLs**, including
  `<origin>/auth/callback` and `<origin>/auth/reset`. Adding vayvor.com is a later step, after it is connected.
- Public sign-up needs real email delivery. Supabase's built-in sender is for trying the service and only mails
  project members, so configure custom SMTP (with a verified sending domain) before inviting anyone else.
- Messages are plain, British English, and avoid tracking pixels.
