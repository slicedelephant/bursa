import { TestBed } from '@angular/core/testing';
import { AuditorGrant } from '../../core/models';
import { AuditorAccessPanelComponent } from './auditor-access-panel.component';

const grant = (over: Partial<AuditorGrant> = {}): AuditorGrant => ({
  id: 'g1',
  label: 'PwC',
  expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
  revokedAt: null,
  lastUsedAt: null,
  status: 'ACTIVE',
  ...over,
});

describe('AuditorAccessPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditorAccessPanelComponent],
    }).compileComponents();
  });

  function render(grants: AuditorGrant[]) {
    const fixture = TestBed.createComponent(AuditorAccessPanelComponent);
    fixture.componentRef.setInput('grants', grants);
    fixture.detectChanges();
    return fixture;
  }

  it('lists grants with status chips', () => {
    const el = render([grant(), grant({ id: 'g2', label: 'KPMG', status: 'REVOKED' })])
      .nativeElement as HTMLElement;
    expect(el.textContent).toContain('PwC');
    expect(el.textContent).toContain('Active');
    expect(el.textContent).toContain('Revoked');
  });

  it('emits create with the label and ttl', () => {
    const fixture = render([]);
    const events: { label: string; ttlHours: number }[] = [];
    fixture.componentInstance.create.subscribe((e) => events.push(e));
    fixture.componentInstance.label = 'Deloitte';
    fixture.componentInstance.ttlHours = 24;
    fixture.componentInstance.emitCreate();
    expect(events).toEqual([{ label: 'Deloitte', ttlHours: 24 }]);
  });

  it('does not emit create with an empty label', () => {
    const fixture = render([]);
    const events: unknown[] = [];
    fixture.componentInstance.create.subscribe((e) => events.push(e));
    fixture.componentInstance.label = '   ';
    fixture.componentInstance.emitCreate();
    expect(events).toHaveLength(0);
  });

  it('emits revoke only for an active grant (revoke button present)', () => {
    const fixture = render([grant()]);
    const revoked: string[] = [];
    fixture.componentInstance.revoke.subscribe((id) => revoked.push(id));
    const btn = (fixture.nativeElement as HTMLElement).querySelector(
      'button.text-brand-orange',
    ) as HTMLButtonElement;
    btn.click();
    expect(revoked).toEqual(['g1']);
  });

  it('shows the one-time portal link after creation', () => {
    const fixture = render([]);
    fixture.componentRef.setInput('created', {
      id: 'g1',
      label: 'PwC',
      token: 'abc',
      expiresAt: new Date().toISOString(),
      portalUrl: '/audit-portal/abc',
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('/audit-portal/abc');
  });
});
