import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { env } from '../config/env.js';

let client: SESClient | null = null;
function getClient(): SESClient {
  client ??= new SESClient({ region: env.AWS_REGION });
  return client;
}

export interface EmailMessage {
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (env.EMAIL_PROVIDER === 'console') {
    console.log('[email] to=%s subject=%s\n%s', msg.to, msg.subject, msg.textBody);
    return;
  }

  const cmd = new SendEmailCommand({
    Source: env.SES_FROM_EMAIL,
    Destination: { ToAddresses: [msg.to] },
    Message: {
      Subject: { Data: msg.subject, Charset: 'UTF-8' },
      Body: {
        Text: { Data: msg.textBody, Charset: 'UTF-8' },
        ...(msg.htmlBody ? { Html: { Data: msg.htmlBody, Charset: 'UTF-8' } } : {}),
      },
    },
  });

  await getClient().send(cmd);
}

export function loginCodeEmail(email: string, code: string): EmailMessage {
  return {
    to: email,
    subject: `Your Bubbles sign-in code: ${code}`,
    textBody: [
      `Hi,`,
      ``,
      `Your one-time sign-in code for Bubbles is:`,
      ``,
      `    ${code}`,
      ``,
      `It expires in 10 minutes. If you didn't request this, you can ignore the email.`,
      ``,
      `— Bubbles`,
    ].join('\n'),
  };
}
