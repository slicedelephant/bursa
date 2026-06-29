import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { CampaignWizardComponent } from './campaign-wizard.component';
import {
  WIZARD_STORAGE_KEY,
  emptyWizardState,
} from './campaign-wizard.storage';

const school = {
  id: 's1',
  name: 'ESMT Berlin',
  country: 'Germany',
  payoutVerified: true,
};

function setup(createImpl = of({ id: 'c1' })) {
  const api = {
    listSchools: jest.fn().mockReturnValue(of([school])),
    createCampaign: jest.fn().mockReturnValue(createImpl),
    // E10: the embedded AI coach panel reads the budget on init.
    aiBudget: jest.fn().mockReturnValue(
      of({
        limitTokens: 20000,
        usedTokens: 0,
        remainingTokens: 20000,
        generations: 0,
        exhausted: false,
      }),
    ),
    aiTitle: jest.fn(),
    aiStory: jest.fn(),
    aiShare: jest.fn(),
  };
  TestBed.configureTestingModule({
    imports: [CampaignWizardComponent],
    providers: [{ provide: ApiService, useValue: api }],
  });
  const fixture = TestBed.createComponent(CampaignWizardComponent);
  fixture.detectChanges();
  return { fixture, comp: fixture.componentInstance, api };
}

function fillBasics(comp: CampaignWizardComponent) {
  comp.schoolId.set('s1');
  comp.programName.set('Full-Time MBA');
  comp.title.set('Help me finish my MBA');
  comp.goalEur.set(42000);
}

describe('CampaignWizardComponent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('starts on step 1 and shows a 3-step progress indicator', () => {
    const { fixture } = setup();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Step 1 of 3');
  });

  it('does not advance past step 1 until the basics are valid', () => {
    const { comp } = setup();
    comp.next();
    expect(comp.step()).toBe(1);
    fillBasics(comp);
    comp.next();
    expect(comp.step()).toBe(2);
  });

  it('shows the guided story prompts on step 2', () => {
    const { fixture, comp } = setup();
    fillBasics(comp);
    comp.next();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Where you are coming from');
    expect(el.textContent).toContain('The funding gap');
  });

  it('requires a long enough composed story before leaving step 2', () => {
    const { comp } = setup();
    fillBasics(comp);
    comp.next();
    comp.background.set('too short');
    comp.next();
    expect(comp.step()).toBe(2);
    comp.background.set('I built a payments team serving many thousands of users.');
    comp.next();
    expect(comp.step()).toBe(3);
  });

  it('flags an unsupported video link and blocks creation', () => {
    const { comp } = setup();
    fillBasics(comp);
    comp.background.set('I built a payments team serving many thousands of users.');
    comp.step.set(3);
    comp.videoUrl.set('https://example.com/clip');
    expect(comp.videoInvalid()).toBe(true);
    expect(comp.canCreate()).toBe(false);
  });

  it('accepts a valid video link and shows a preview', () => {
    const { fixture, comp } = setup();
    fillBasics(comp);
    comp.background.set('I built a payments team serving many thousands of users.');
    comp.step.set(3);
    comp.videoUrl.set('https://youtu.be/dQw4w9WgXcQ');
    fixture.detectChanges();
    expect(comp.videoInvalid()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('app-campaign-video')).not.toBeNull();
  });

  it('creates the campaign with the composed story, blocks and video', () => {
    const { fixture, comp, api } = setup();
    fillBasics(comp);
    comp.background.set('I built and scaled a mobile payments team in Lagos.');
    comp.challenge.set('Currency devaluation pushed tuition beyond my savings.');
    comp.vision.set('I will bring operational experience back to West Africa.');
    comp.videoUrl.set('https://youtu.be/dQw4w9WgXcQ');
    comp.step.set(3);

    const saved = jest.fn();
    comp.saved.subscribe(saved);
    comp.create();
    fixture.detectChanges();

    expect(api.createCampaign).toHaveBeenCalledTimes(1);
    const body = api.createCampaign.mock.calls[0][0];
    expect(body.story).toContain('I built and scaled a mobile payments team in Lagos.');
    expect(body.story).toContain('West Africa');
    expect(body.videoUrl).toBe('https://youtu.be/dQw4w9WgXcQ');
    expect(body.storyBackground).toContain('Lagos');
    expect(body.storyChallenge).toContain('devaluation');
    expect(body.storyVision).toContain('West Africa');
    expect(body.goalCents).toBe(4200000);
    expect(saved).toHaveBeenCalled();
    expect(localStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
  });

  it('autosaves progress to localStorage', () => {
    const { fixture, comp } = setup();
    comp.title.set('Autosaved title');
    fixture.detectChanges(); // flush the autosave effect
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    expect(raw).toContain('Autosaved title');
  });

  it('restores a saved draft on init (Zwischenspeichern)', () => {
    localStorage.setItem(
      WIZARD_STORAGE_KEY,
      JSON.stringify({
        ...emptyWizardState(),
        step: 2,
        title: 'Restored title',
        schoolId: 's1',
        programName: 'MBA',
        goalEur: 1000,
      }),
    );
    const { comp } = setup();
    expect(comp.step()).toBe(2);
    expect(comp.title()).toBe('Restored title');
  });

  it('goes back a step', () => {
    const { comp } = setup();
    comp.step.set(3);
    comp.back();
    expect(comp.step()).toBe(2);
    comp.step.set(1);
    comp.back();
    expect(comp.step()).toBe(1);
  });

  it('surfaces an API error and stops submitting', () => {
    const { comp } = setup({
      subscribe: (obs: { error: (e: unknown) => void }) =>
        obs.error({ error: { error: { message: 'Boom' } } }),
    } as never);
    fillBasics(comp);
    comp.background.set('I built a payments team serving many thousands of users.');
    comp.step.set(3);
    comp.create();
    expect(comp.error()).toBe('Boom');
    expect(comp.submitting()).toBe(false);
  });

  it('resolves the selected school name for the coach context', () => {
    const { comp } = setup();
    comp.schoolId.set('s1');
    expect(comp.schoolName()).toBe('ESMT Berlin');
    comp.schoolId.set('missing');
    expect(comp.schoolName()).toBe('');
  });

  it('applies an AI-suggested title on a deliberate action', () => {
    const { comp } = setup();
    comp.title.set('manual title');
    comp.onApplyTitle('AI generated title');
    expect(comp.title()).toBe('AI generated title');
  });

  it('applies an AI story draft into the three guided parts', () => {
    const { comp } = setup();
    comp.onApplyStory({
      background: 'AI background',
      challenge: 'AI challenge',
      vision: 'AI vision',
    });
    expect(comp.background()).toBe('AI background');
    expect(comp.challenge()).toBe('AI challenge');
    expect(comp.vision()).toBe('AI vision');
  });

  it('never wipes existing parts with empty AI fields', () => {
    const { comp } = setup();
    comp.background.set('kept background');
    comp.challenge.set('kept challenge');
    comp.vision.set('kept vision');
    comp.onApplyStory({ background: 'new background', challenge: '', vision: '' });
    expect(comp.background()).toBe('new background');
    expect(comp.challenge()).toBe('kept challenge');
    expect(comp.vision()).toBe('kept vision');
  });
});
