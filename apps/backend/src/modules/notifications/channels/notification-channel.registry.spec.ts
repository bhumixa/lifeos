import { DesktopChannel } from './desktop.channel.js';
import { EmailChannel } from './email.channel.js';
import { InAppChannel } from './in-app.channel.js';
import { NotificationChannelRegistry } from './notification-channel.registry.js';
import { PushChannel } from './push.channel.js';
import { SmsChannel } from './sms.channel.js';

describe('NotificationChannelRegistry', () => {
  const inApp = new InAppChannel();
  const email = new EmailChannel();
  const push = new PushChannel();
  const sms = new SmsChannel();
  const desktop = new DesktopChannel();
  const registry = new NotificationChannelRegistry(
    inApp,
    email,
    push,
    sms,
    desktop,
  );

  it('resolves each channel type to its own distinct adapter instance', () => {
    expect(registry.resolve('IN_APP')).toBe(inApp);
    expect(registry.resolve('EMAIL')).toBe(email);
    expect(registry.resolve('PUSH')).toBe(push);
    expect(registry.resolve('SMS')).toBe(sms);
    expect(registry.resolve('DESKTOP')).toBe(desktop);
  });
});

describe('InAppChannel', () => {
  it('always succeeds — nothing external to deliver', async () => {
    await expect(new InAppChannel().send()).resolves.toEqual({
      channel: 'IN_APP',
      success: true,
    });
  });
});

describe('placeholder channels', () => {
  it.each([
    ['EmailChannel', new EmailChannel(), 'EMAIL'],
    ['PushChannel', new PushChannel(), 'PUSH'],
    ['SmsChannel', new SmsChannel(), 'SMS'],
    ['DesktopChannel', new DesktopChannel(), 'DESKTOP'],
  ] as const)(
    '%s always reports NOT_IMPLEMENTED, never throws',
    async (_name, channel, type) => {
      const result = await channel.send();
      expect(result.success).toBe(false);
      expect(result.channel).toBe(type);
      expect(result.error).toMatch(/NOT_IMPLEMENTED/);
    },
  );
});
