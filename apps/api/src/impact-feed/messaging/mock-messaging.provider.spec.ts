import { MockMessagingProvider } from './mock-messaging.provider';

describe('MockMessagingProvider', () => {
  it('records each send and returns a deterministic success ref', async () => {
    const provider = new MockMessagingProvider();

    const first = await provider.send({
      channel: 'WHATSAPP',
      to: '+490000',
      body: 'Hi',
    });
    const second = await provider.send({
      channel: 'TELEGRAM',
      to: '123',
      subject: 'Update',
      body: 'New milestone',
    });

    expect(first).toEqual({
      ok: true,
      channel: 'WHATSAPP',
      ref: 'mock_whatsapp_1',
    });
    expect(second).toEqual({
      ok: true,
      channel: 'TELEGRAM',
      ref: 'mock_telegram_2',
    });
    expect(provider.count).toBe(2);
  });

  it('exposes the most recent sends without leaking the internal array', async () => {
    const provider = new MockMessagingProvider();
    await provider.send({ channel: 'PUSH', to: 'a', body: '1' });
    await provider.send({ channel: 'PUSH', to: 'b', body: '2' });
    await provider.send({ channel: 'PUSH', to: 'c', body: '3' });

    const recent = provider.recent(2);
    expect(recent.map((m) => m.body)).toEqual(['2', '3']);

    recent.pop();
    expect(provider.count).toBe(3);
  });

  it('defaults recent() to the last 10 sends', async () => {
    const provider = new MockMessagingProvider();
    for (let i = 0; i < 12; i += 1) {
      await provider.send({ channel: 'PUSH', to: 'a', body: `${i}` });
    }
    expect(provider.recent()).toHaveLength(10);
    expect(provider.recent().map((m) => m.body)).toEqual([
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
    ]);
  });

  it('never throws and requires no network', async () => {
    const provider = new MockMessagingProvider();
    await expect(
      provider.send({ channel: 'MESSENGER', to: 'x', body: '' }),
    ).resolves.toMatchObject({ ok: true, channel: 'MESSENGER' });
  });
});
