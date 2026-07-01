import { Logger } from '@nestjs/common';
import {
  createEmployeeDataProvider,
  shouldUseAdp,
  shouldUseWorkday,
} from './employee-data.provider.factory';
import { MockEmployeeDataProvider } from './mock-employee-data.provider';
import { AdpEmployeeDataProvider } from './adp-employee-data.provider';
import { WorkdayEmployeeDataProvider } from './workday-employee-data.provider';

const silentLogger = () => {
  const logger = new Logger('test');
  jest.spyOn(logger, 'log').mockImplementation(() => undefined);
  jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
  return logger;
};

describe('shouldUseAdp / shouldUseWorkday', () => {
  it('is false by default (mock)', () => {
    expect(shouldUseAdp({})).toBe(false);
    expect(shouldUseWorkday({})).toBe(false);
  });

  it('requires the flag AND both credentials', () => {
    expect(shouldUseAdp({ HRIS_PROVIDER: 'adp' })).toBe(false);
    expect(
      shouldUseAdp({
        HRIS_PROVIDER: 'adp',
        ADP_CLIENT_ID: 'id',
        ADP_CLIENT_SECRET: 'secret',
      }),
    ).toBe(true);
    expect(
      shouldUseWorkday({
        HRIS_PROVIDER: 'workday',
        WORKDAY_CLIENT_ID: 'id',
        WORKDAY_CLIENT_SECRET: 'secret',
      }),
    ).toBe(true);
  });
});

describe('createEmployeeDataProvider', () => {
  it('returns the Mock by default', () => {
    const p = createEmployeeDataProvider({}, silentLogger());
    expect(p).toBeInstanceOf(MockEmployeeDataProvider);
  });

  it('returns Mock when only the flag is set (no credentials)', () => {
    const p = createEmployeeDataProvider(
      { HRIS_PROVIDER: 'adp' },
      silentLogger(),
    );
    expect(p).toBeInstanceOf(MockEmployeeDataProvider);
  });

  it('returns the ADP provider when flag + credentials are present', () => {
    const p = createEmployeeDataProvider(
      {
        HRIS_PROVIDER: 'adp',
        ADP_CLIENT_ID: 'id',
        ADP_CLIENT_SECRET: 'secret',
      },
      silentLogger(),
    );
    expect(p).toBeInstanceOf(AdpEmployeeDataProvider);
  });

  it('returns the Workday provider when flag + credentials are present', () => {
    const p = createEmployeeDataProvider(
      {
        HRIS_PROVIDER: 'workday',
        WORKDAY_CLIENT_ID: 'id',
        WORKDAY_CLIENT_SECRET: 'secret',
      },
      silentLogger(),
    );
    expect(p).toBeInstanceOf(WorkdayEmployeeDataProvider);
  });
});
