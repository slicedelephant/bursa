import { Logger } from '@nestjs/common';
import { MockEsignatureProvider } from './mock-e-signature.provider';
import {
  createEsignatureProvider,
  shouldUseDocusign,
} from './e-signature.provider.factory';

describe('e-signature provider factory', () => {
  it('defaults to mock', () => {
    expect(shouldUseDocusign({})).toBe(false);
    expect(createEsignatureProvider({})).toBeInstanceOf(MockEsignatureProvider);
  });

  it('only selects DocuSign with both the flag and a key', () => {
    expect(shouldUseDocusign({ ESIGNATURE_PROVIDER: 'docusign' })).toBe(false);
    expect(shouldUseDocusign({ ESIGNATURE_PROVIDER: 'docusign', DOCUSIGN_API_KEY: 'k' })).toBe(true);
  });

  it('falls back to mock with a warning when DocuSign is requested but unimplemented', () => {
    const logger = new Logger('test');
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const provider = createEsignatureProvider(
      { ESIGNATURE_PROVIDER: 'docusign', DOCUSIGN_API_KEY: 'k' },
      logger,
    );
    expect(provider).toBeInstanceOf(MockEsignatureProvider);
    expect(warn).toHaveBeenCalled();
  });
});
