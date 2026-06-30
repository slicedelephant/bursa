import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { TransparencyView } from '../../core/models';
import { TransparencyPage } from './transparency.page';

const data: TransparencyView = {
  schoolId: 'school-1',
  schoolName: 'ESMT Berlin',
  totalRaisedCents: 100000,
  totalPaidOutCents: 60000,
  donationCount: 8,
  avgDonationCents: 12500,
  studentsSupported: 3,
  donorGeography: [{ country: 'DE', donationCount: 5, amountCents: 60000 }],
};

function route(schoolId: string | null): ActivatedRoute {
  return {
    snapshot: { paramMap: { get: () => schoolId } },
  } as unknown as ActivatedRoute;
}

function setup(api: Partial<ApiService>, schoolId: string | null) {
  TestBed.configureTestingModule({
    providers: [
      { provide: ApiService, useValue: api },
      { provide: ActivatedRoute, useValue: route(schoolId) },
    ],
  });
  return TestBed.runInInjectionContext(() => new TransparencyPage());
}

describe('TransparencyPage', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('loads transparency data for the route school', () => {
    const c = setup({ transparency: () => of(data) } as Partial<ApiService>, 'school-1');
    expect(c.data()).toEqual(data);
    expect(c.tiles()).toHaveLength(4);
    expect(c.bars()).toHaveLength(1);
    expect(c.paidPercent()).toBe(60);
  });

  it('errors when no school is in the route', () => {
    const c = setup({ transparency: () => of(data) } as Partial<ApiService>, null);
    expect(c.error()).toBe('No school specified.');
    expect(c.data()).toBeNull();
    expect(c.tiles()).toHaveLength(0);
    expect(c.bars()).toHaveLength(0);
    expect(c.paidPercent()).toBe(0);
  });

  it('sets an error when the API call fails', () => {
    const c = setup(
      {
        transparency: () => throwError(() => new Error('boom')),
      } as Partial<ApiService>,
      'school-1',
    );
    expect(c.error()).toBe('Could not load the transparency data.');
  });
});
