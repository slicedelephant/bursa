import { Logger } from '@nestjs/common';
import { MockFxRateProvider } from './mock-fx-rate.provider';
import {
  createFxRateProvider,
  shouldUseRealFx,
} from './fx-rate.provider.factory';

describe('createFxRateProvider (E20)', () => {
  const silent = new Logger('test');
  beforeAll(() => {
    jest.spyOn(silent, 'warn').mockImplementation(() => undefined);
  });

  it('defaults to the mock provider', () => {
    expect(createFxRateProvider({}, silent)).toBeInstanceOf(MockFxRateProvider);
  });

  it('falls back to mock when a real provider is requested (none exists yet)', () => {
    expect(
      createFxRateProvider({ FX_RATE_PROVIDER: 'wise' }, silent),
    ).toBeInstanceOf(MockFxRateProvider);
  });

  it('shouldUseRealFx is false for mock/empty and true otherwise', () => {
    expect(shouldUseRealFx({})).toBe(false);
    expect(shouldUseRealFx({ FX_RATE_PROVIDER: 'mock' })).toBe(false);
    expect(shouldUseRealFx({ FX_RATE_PROVIDER: 'wise' })).toBe(true);
  });
});
