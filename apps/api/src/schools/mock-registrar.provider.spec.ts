import { MockRegistrarProvider } from './mock-registrar.provider';

describe('MockRegistrarProvider', () => {
  const provider = new MockRegistrarProvider();

  it('recognises a normal admission ref', async () => {
    const result = await provider.lookupAdmission('school1', 'ADM-1');
    expect(result.found).toBe(true);
    expect(result.programName).toBe('On file with registrar');
    expect(result.admissionRef).toBe('ADM-1');
  });

  it('does not recognise the -UNKNOWN sentinel or an empty ref', async () => {
    expect((await provider.lookupAdmission('s', 'ADM-99-UNKNOWN')).found).toBe(false);
    expect((await provider.lookupAdmission('s', '   ')).found).toBe(false);
    expect((await provider.lookupAdmission('s', 'ADM-99-UNKNOWN')).programName).toBeUndefined();
  });
});
