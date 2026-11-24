import { logger } from './logger';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Transactional mail.
 *
 * Uses Resend's HTTP API when `RESEND_API_KEY` and `MAIL_FROM` are configured;
 * otherwise it logs the message and reports `delivered: false` so callers can be
 * honest about it. Delivery failures are logged and swallowed — a missing mail
 * provider must not fail the invite or password-reset call that triggered it.
 */
export const sendMail = async (message: MailMessage): Promise<{ delivered: boolean; reason?: string }> => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    logger.info('mail.not-configured', { to: message.to, subject: message.subject });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[mail] ${message.subject} → ${message.to}\n${message.text}`);
    }
    return { delivered: false, reason: 'Mail provider is not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      logger.warn('mail.rejected', { status: response.status, detail: detail.slice(0, 300) });
      return { delivered: false, reason: `Provider rejected the message (${response.status})` };
    }

    return { delivered: true };
  } catch (error) {
    logger.warn('mail.failed', { error: (error as Error)?.message });
    return { delivered: false, reason: 'Could not reach the mail provider' };
  }
};

export const frontendUrl = (): string =>
  (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
