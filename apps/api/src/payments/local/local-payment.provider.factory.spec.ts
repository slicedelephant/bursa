import { Logger } from '@nestjs/common';
import { MockLocalDepositProvider } from './mock-local-payment.provider';
import { MpesaDepositProvider } from './mpesa-payment.provider';
import {
  createLocalDepositProvider,
  shouldUseMpesa,
} from './local-payment.provider.factory';

describe('createLocalDepositProvider (E20)', () => {
  const silent = new Logger('test');
  beforeAll(() => {
    jest.spyOn(silent, 'log').mockImplementation(() => undefined);
    jest.spyOn(silent, 'warn').mockImplementation(() => undefined);
  });

  it('defaults to the mock provider with no env', () => {
    expect(createLocalDepositProvider({}, silent)).toBeInstanceOf(
      MockLocalDepositProvider,
    );
  });

  it('uses the mock when mpesa is requested but keys are missing', () => {
    expect(
      createLocalDepositProvider({ LOCAL_DEPOSIT_PROVIDER: 'mpesa' }, silent),
    ).toBeInstanceOf(MockLocalDepositProvider);
  });

  it('uses M-Pesa when the flag and both keys are present', () => {
    const provider = createLocalDepositProvider(
      {
        LOCAL_DEPOSIT_PROVIDER: 'mpesa',
        MPESA_CONSUMER_KEY: 'k',
        MPESA_CONSUMER_SECRET: 's',
      },
      silent,
    );
    expect(provider).toBeInstanceOf(MpesaDepositProvider);
  });

  it('shouldUseMpesa is true only with flag + both keys', () => {
    expect(shouldUseMpesa({})).toBe(false);
    expect(
      shouldUseMpesa({
        LOCAL_DEPOSIT_PROVIDER: 'mpesa',
        MPESA_CONSUMER_KEY: 'k',
      }),
    ).toBe(false);
    expect(
      shouldUseMpesa({
        LOCAL_DEPOSIT_PROVIDER: 'mpesa',
        MPESA_CONSUMER_KEY: 'k',
        MPESA_CONSUMER_SECRET: 's',
      }),
    ).toBe(true);
  });
});
