import { buildProgramOutcome, ScholarOutcome } from './outcome-aggregator';

const scholars: ScholarOutcome[] = [
  { status: 'GRADUATED', alumniNetwork: true },
  { status: 'WORKING', alumniNetwork: true },
  { status: 'ENROLLED', alumniNetwork: false },
  { status: 'WITHDRAWN', alumniNetwork: false },
];

describe('buildProgramOutcome', () => {
  it('counts scholars per status', () => {
    const out = buildProgramOutcome(scholars);
    expect(out.total).toBe(4);
    expect(out.graduated).toBe(1);
    expect(out.working).toBe(1);
    expect(out.enrolled).toBe(1);
    expect(out.withdrawn).toBe(1);
  });

  it('counts alumni-network scholars', () => {
    expect(buildProgramOutcome(scholars).alumni).toBe(2);
  });

  it('computes the retention rate (not withdrawn)', () => {
    // 3 of 4 not withdrawn -> 75
    expect(buildProgramOutcome(scholars).retentionRate).toBe(75);
  });

  it('computes the graduation rate (graduated or working)', () => {
    // 2 of 4 -> 50
    expect(buildProgramOutcome(scholars).graduationRate).toBe(50);
  });

  it('returns zero rates for an empty program', () => {
    const out = buildProgramOutcome([]);
    expect(out.total).toBe(0);
    expect(out.retentionRate).toBe(0);
    expect(out.graduationRate).toBe(0);
  });

  it('does not mutate the scholars input', () => {
    const copy = [...scholars];
    buildProgramOutcome(scholars);
    expect(scholars).toEqual(copy);
  });
});
