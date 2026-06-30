import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { VoiceSubmitView } from '../../core/models';
import { StudentVoiceComponent } from './student-voice.component';

function setup(
  submitImpl = of<VoiceSubmitView>({ id: 'm1', status: 'APPROVED', reasons: [], delivered: 2 }),
) {
  const api = {
    submitStudentVoice: jest.fn().mockReturnValue(submitImpl),
  } as unknown as ApiService;

  TestBed.configureTestingModule({
    imports: [StudentVoiceComponent],
    providers: [{ provide: ApiService, useValue: api }],
  });

  const fixture = TestBed.createComponent(StudentVoiceComponent);
  fixture.componentRef.setInput('campaignId', 'c1');
  fixture.detectChanges();
  return { fixture, api };
}

describe('StudentVoiceComponent', () => {
  it('renders the form with a character counter', () => {
    const { fixture } = setup();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Send a thank-you message');
    expect(el.textContent).toContain('600 characters left');
  });

  it('blocks submit and shows an error for an empty message', () => {
    const { fixture, api } = setup();
    fixture.componentInstance.submit();
    expect(api.submitStudentVoice).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('short message');
  });

  it('submits a valid draft and shows the approved hint', () => {
    const { fixture, api } = setup();
    fixture.componentInstance.text = 'Thank you for your support!';
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(api.submitStudentVoice).toHaveBeenCalledWith('c1', {
      text: 'Thank you for your support!',
      videoUrl: undefined,
      voiceUrl: undefined,
    });
    expect(fixture.componentInstance.approved()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('approved');
    // form cleared on approval
    expect(fixture.componentInstance.text).toBe('');
  });

  it('shows a moderation hint and keeps the text when rejected', () => {
    const { fixture } = setup(
      of<VoiceSubmitView>({
        id: 'm2',
        status: 'REJECTED',
        reasons: ['slur:idiot'],
        delivered: 0,
      }),
    );
    fixture.componentInstance.text = 'you idiot';
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.componentInstance.approved()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('offensive');
    expect(fixture.componentInstance.text).toBe('you idiot');
  });

  it('surfaces a server error', () => {
    const { fixture } = setup(throwError(() => ({ error: { error: { message: 'Nope' } } })));
    fixture.componentInstance.text = 'Thank you so much!';
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nope');
  });
});
