/**
 * Send an email via SMTP using nodemailer.
 * No-ops if any of the SMTP env vars are missing.
 *
 * nodemailer is a dynamic import so the orchestrator still runs
 * if email is not configured / nodemailer is not installed.
 */
export async function sendEmail(opts: {
  host: string;
  user: string;
  pass: string;
  recipients: string;
  subject: string;
  html: string;
}): Promise<void> {
  const { host, user, pass, recipients, subject, html } = opts;
  if (!host || !user || !pass || !recipients) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nodemailer: any;
  try {
    // Use eval to bypass TS module resolution at compile time.
    // nodemailer is an optional runtime dependency; if it's not
    // installed, this falls through to the catch block gracefully.
    // eslint-disable-next-line no-eval
    nodemailer = await (eval('import("nodemailer")') as Promise<any>);
  } catch {
    console.error(
      'nodemailer not installed; skipping email. ' +
        'Run `npm install nodemailer` to enable.',
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: 587,
    secure: false,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: user,
      to: recipients,
      subject,
      html,
    });
  } catch (err) {
    console.error('Email send failed (non-fatal):', err);
  }
}