import { Resend } from 'resend'

// ─── Client ───────────────────────────────────────────────────────────────────

const APP = 'Arivarangam'
const FROM = process.env.RESEND_FROM || `${APP} <noreply@arivarangam.com>`

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[Email] RESEND_API_KEY not set — emails will be logged to console only')
    return null
  }
  return new Resend(key)
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const client = getClient()
  if (!client) {
    console.log(`[Email] Would send "${subject}" to ${to}`)
    return
  }
  const { error } = await client.emails.send({ from: FROM, to, subject, html })
  if (error) {
    console.error(`[Email] Resend error for "${subject}" to ${to}:`, error)
  } else {
    console.log(`[Email] Sent "${subject}" to ${to}`)
  }
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function layout(body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F6F3;font-family:Inter,-apple-system,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F6F3;padding:48px 16px;">
<tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:linear-gradient(135deg,#1E3461 0%,#243D73 100%);padding:28px 40px;">
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="width:38px;height:38px;background:linear-gradient(135deg,#1E3461 0%,#C4882A 100%);border-radius:9px;text-align:center;vertical-align:middle;border:1.5px solid rgba(196,136,42,0.5);">
          <span style="color:#fff;font-size:19px;font-weight:800;line-height:1;">A</span>
        </td>
        <td style="padding-left:12px;vertical-align:middle;">
          <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">${APP}</span>
        </td>
      </tr></table>
    </td>
  </tr>
  <tr><td style="padding:40px 40px 32px;">${body}</td></tr>
  <tr>
    <td style="padding:20px 40px 28px;border-top:1px solid #F0EDE8;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;line-height:1.7;">
        © 2025 ${APP}. If you didn't request this email, you can safely ignore it.
      </p>
    </td>
  </tr>
</table>
</td></tr></table>
</body></html>`
}

function btn(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="background:#1E3461;border-radius:10px;">
      <a href="${href}" style="display:inline-block;padding:14px 32px;color:#fff;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;">${label}</a>
    </td>
  </tr></table>`
}

// ─── Emails ───────────────────────────────────────────────────────────────────

export async function sendVerificationEmail(
  to: string, name: string, token: string, webUrl: string
): Promise<void> {
  const url = `${webUrl}/verify-email?token=${token}`
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0A0D14;">Verify your email address</h2>
    <p style="margin:0 0 6px;font-size:15px;color:#6B7280;line-height:1.65;">
      Hi <strong style="color:#374151;">${name}</strong>, welcome to ${APP}!
    </p>
    <p style="margin:0 0 28px;font-size:15px;color:#6B7280;line-height:1.65;">
      Click the button below to verify your email and activate your account.
    </p>
    <div style="margin-bottom:28px;">${btn(url, 'Verify Email Address')}</div>
    <p style="margin:0 0 6px;font-size:13px;color:#9CA3AF;">Or copy and paste this link:</p>
    <p style="margin:0 0 24px;font-size:12px;color:#6B7280;word-break:break-all;">${url}</p>
    <div style="background:#FEF3C7;border:1px solid rgba(196,136,42,0.3);border-radius:8px;padding:12px 16px;">
      <p style="margin:0;font-size:13px;color:#92400E;">⏱ This link expires in <strong>24 hours</strong>.</p>
    </div>
  `)
  await send(to, `Verify your email — ${APP}`, html)
}

export async function sendPasswordResetEmail(
  to: string, name: string, token: string, webUrl: string
): Promise<void> {
  const url = `${webUrl}/reset-password?token=${token}`
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0A0D14;">Reset your password</h2>
    <p style="margin:0 0 6px;font-size:15px;color:#6B7280;line-height:1.65;">Hi <strong style="color:#374151;">${name}</strong>,</p>
    <p style="margin:0 0 28px;font-size:15px;color:#6B7280;line-height:1.65;">
      We received a request to reset your ${APP} password. Click below to choose a new one.
    </p>
    <div style="margin-bottom:28px;">${btn(url, 'Reset Password')}</div>
    <p style="margin:0 0 6px;font-size:13px;color:#9CA3AF;">Or copy and paste this link:</p>
    <p style="margin:0 0 24px;font-size:12px;color:#6B7280;word-break:break-all;">${url}</p>
    <div style="background:#FEF3C7;border:1px solid rgba(196,136,42,0.3);border-radius:8px;padding:12px 16px;">
      <p style="margin:0;font-size:13px;color:#92400E;">⏱ Expires in <strong>1 hour</strong>. Didn't request this? You can ignore it.</p>
    </div>
  `)
  await send(to, `Reset your password — ${APP}`, html)
}

export async function sendAdminOtpEmail(to: string, otp: string): Promise<void> {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0A0D14;">Admin Login Verification</h2>
    <p style="margin:0 0 28px;font-size:15px;color:#6B7280;line-height:1.65;">
      Your one-time passcode for admin sign-in. Expires in <strong>5 minutes</strong>.
    </p>
    <div style="background:#F7F6F3;border:2px solid #E8E5DF;border-radius:14px;padding:28px;text-align:center;margin-bottom:28px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#9CA3AF;letter-spacing:0.12em;text-transform:uppercase;">One-Time Passcode</p>
      <p style="margin:0;font-size:44px;font-weight:800;color:#1E3461;letter-spacing:0.25em;">${otp}</p>
    </div>
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:12px 16px;">
      <p style="margin:0;font-size:13px;color:#DC2626;">⚠️ Never share this code. If you didn't attempt login, change your password immediately.</p>
    </div>
  `)
  await send(to, `Admin OTP: ${otp} — ${APP}`, html)
}

export async function sendAdminNewUserNotification(
  adminEmail: string,
  user: { name: string; email: string; createdAt: Date }
): Promise<void> {
  const signedUp = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
  }).format(new Date(user.createdAt))

  const row = (label: string, value: string, shade = false) =>
    `<tr>
      <td style="padding:11px 16px;font-size:13px;font-weight:600;color:#374151;width:110px;${shade ? 'background:#F7F6F3;' : ''}border-top:1px solid #E8E5DF;">${label}</td>
      <td style="padding:11px 16px;font-size:14px;color:#0A0D14;${shade ? 'background:#F7F6F3;' : ''}border-top:1px solid #E8E5DF;">${value}</td>
    </tr>`

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0A0D14;">New User Registered 🎉</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6B7280;line-height:1.65;">
      A new user has created an account. Their email is pending verification.
    </p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E8E5DF;border-radius:10px;overflow:hidden;margin-bottom:20px;">
      ${row('Name', user.name, true)}
      ${row('Email', user.email)}
      ${row('Signed up', `${signedUp} IST`, true)}
    </table>
  `)
  await send(adminEmail, `New user: ${user.name} — ${APP}`, html)
}
