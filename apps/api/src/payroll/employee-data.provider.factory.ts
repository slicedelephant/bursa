import { Logger } from '@nestjs/common';
import { AdpEmployeeDataProvider } from './adp-employee-data.provider';
import { EmployeeDataProvider } from './employee-data.provider.interface';
import { MockEmployeeDataProvider } from './mock-employee-data.provider';
import { WorkdayEmployeeDataProvider } from './workday-employee-data.provider';

export interface EmployeeDataProviderEnv {
  HRIS_PROVIDER?: string;
  ADP_CLIENT_ID?: string;
  ADP_CLIENT_SECRET?: string;
  WORKDAY_CLIENT_ID?: string;
  WORKDAY_CLIENT_SECRET?: string;
}

/** True only when ADP is explicitly requested AND both credentials are present. */
export function shouldUseAdp(env: EmployeeDataProviderEnv): boolean {
  return (
    (env.HRIS_PROVIDER ?? 'mock').toLowerCase() === 'adp' &&
    !!env.ADP_CLIENT_ID &&
    !!env.ADP_CLIENT_SECRET
  );
}

/** True only when Workday is explicitly requested AND both credentials are present. */
export function shouldUseWorkday(env: EmployeeDataProviderEnv): boolean {
  return (
    (env.HRIS_PROVIDER ?? 'mock').toLowerCase() === 'workday' &&
    !!env.WORKDAY_CLIENT_ID &&
    !!env.WORKDAY_CLIENT_SECRET
  );
}

/**
 * Picks the HRIS employee-data provider from the environment. Default is the
 * deterministic Mock, which runs without any keys and never hits the network or
 * OAuth. A real provider is used only when its flag AND credentials are present;
 * if construction fails for any reason we fall back to Mock so the app never
 * crashes. Mirrors `createPaymentProvider` / `createEmployerMatchProvider`.
 */
export function createEmployeeDataProvider(
  env: EmployeeDataProviderEnv,
  logger: Logger = new Logger('EmployeeDataProviderFactory'),
): EmployeeDataProvider {
  try {
    if (shouldUseAdp(env)) {
      logger.log('Using AdpEmployeeDataProvider (HRIS_PROVIDER=adp)');
      return new AdpEmployeeDataProvider(
        env.ADP_CLIENT_ID as string,
        env.ADP_CLIENT_SECRET as string,
      );
    }
    if (shouldUseWorkday(env)) {
      logger.log('Using WorkdayEmployeeDataProvider (HRIS_PROVIDER=workday)');
      return new WorkdayEmployeeDataProvider(
        env.WORKDAY_CLIENT_ID as string,
        env.WORKDAY_CLIENT_SECRET as string,
      );
    }
  } catch (error) {
    logger.warn(
      `HRIS provider unavailable, falling back to Mock: ${(error as Error).message}`,
    );
    return new MockEmployeeDataProvider();
  }
  return new MockEmployeeDataProvider();
}
