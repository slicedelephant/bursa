import {
  RegistrarLookupResult,
  RegistrarProvider,
} from './registrar.provider.interface';

/**
 * Deterministic mock registrar (E8). Recognises any non-empty admission ref
 * except the sentinel suffix `-UNKNOWN`, which it reports as not on file — so the
 * "admission cross-check" path is exercisable without a real registrar API.
 */
export class MockRegistrarProvider implements RegistrarProvider {
  async lookupAdmission(
    _schoolId: string,
    admissionRef: string,
  ): Promise<RegistrarLookupResult> {
    const ref = (admissionRef ?? '').trim();
    const found = ref.length > 0 && !ref.toUpperCase().endsWith('-UNKNOWN');
    return {
      found,
      admissionRef: ref,
      ...(found ? { programName: 'On file with registrar' } : {}),
    };
  }
}
