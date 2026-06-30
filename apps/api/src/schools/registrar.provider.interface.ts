/**
 * The single seam between admission verification and any school registrar / SIS
 * (E8). The prototype ships MockRegistrarProvider; a real registrar API adapter
 * must implement this same interface with zero domain changes. No real registrar
 * call is made anywhere in the prototype.
 */
export interface RegistrarLookupResult {
  readonly found: boolean;
  readonly admissionRef: string;
  readonly programName?: string;
}

export interface RegistrarProvider {
  lookupAdmission(
    schoolId: string,
    admissionRef: string,
  ): Promise<RegistrarLookupResult>;
}

export const REGISTRAR_PROVIDER = Symbol('REGISTRAR_PROVIDER');
