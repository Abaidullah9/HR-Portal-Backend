jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { sendMail } from '../utils/mailer';

const originalKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.MAIL_FROM;
const originalNodeEnv = process.env.NODE_ENV;

const restore = () => {
  if (originalKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalKey;
  if (originalFrom === undefined) delete process.env.MAIL_FROM;
  else process.env.MAIL_FROM = originalFrom;
  process.env.NODE_ENV = originalNodeEnv;
};

describe('sendMail', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    restore();
  });

  it('reports that mail is not configured when the provider is missing', async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;

    const result = await sendMail({ to: 'a@example.com', subject: 'Hi', text: 'Body' });
    expect(result).toEqual({ delivered: false, reason: 'Mail provider is not configured' });
  });

  it('posts to the provider and reports success', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.MAIL_FROM = 'HR <hr@example.com>';
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 200 } as unknown as Response);

    const result = await sendMail({ to: 'a@example.com', subject: 'Reset', text: 'Link' });

    expect(result).toEqual({ delivered: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer re_test' });
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ from: 'HR <hr@example.com>', to: ['a@example.com'], subject: 'Reset' });
  });

  it('surfaces a provider rejection without throwing', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.MAIL_FROM = 'HR <hr@example.com>';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'invalid from address',
    } as unknown as Response);

    const result = await sendMail({ to: 'a@example.com', subject: 'Reset', text: 'Link' });
    expect(result.delivered).toBe(false);
    expect(result.reason).toContain('422');
  });

  it('swallows a network failure', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.MAIL_FROM = 'HR <hr@example.com>';
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNRESET'));

    const result = await sendMail({ to: 'a@example.com', subject: 'Reset', text: 'Link' });
    expect(result).toEqual({ delivered: false, reason: 'Could not reach the mail provider' });
  });
});
