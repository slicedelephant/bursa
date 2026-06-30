import { TestBed } from '@angular/core/testing';
import { ChannelPrefsView, ChannelPrefView } from '../../core/models';
import { ChannelPrefsComponent } from './channel-prefs.component';

function view(): ChannelPrefsView {
  return {
    prefs: [
      { channel: 'IN_APP', optIn: true },
      { channel: 'WHATSAPP', optIn: false },
      { channel: 'TELEGRAM', optIn: true, handle: '123' },
    ],
  };
}

describe('ChannelPrefsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChannelPrefsComponent],
    }).compileComponents();
  });

  function render(v: ChannelPrefsView) {
    const fixture = TestBed.createComponent(ChannelPrefsComponent);
    fixture.componentRef.setInput('view', v);
    fixture.detectChanges();
    return fixture;
  }

  it('renders each channel with its label and status', () => {
    const el = render(view()).nativeElement as HTMLElement;
    expect(el.textContent).toContain('In-app feed');
    expect(el.textContent).toContain('WhatsApp');
    expect(el.textContent).toContain('Telegram');
    expect(el.textContent).toContain('Always on'); // IN_APP locked
  });

  it('does not render a toggle button for the locked IN_APP row', () => {
    const fixture = render(view());
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    // IN_APP locked → 2 toggles (WhatsApp + Telegram)
    expect(buttons.length).toBe(2);
  });

  it('emits the flipped preference when a toggle is clicked', () => {
    const fixture = render(view());
    let emitted: ChannelPrefView | undefined;
    fixture.componentInstance.changed.subscribe((p) => (emitted = p));

    const firstToggle = (fixture.nativeElement as HTMLElement).querySelector(
      'button',
    ) as HTMLButtonElement;
    firstToggle.click();

    expect(emitted).toEqual({ channel: 'WHATSAPP', optIn: true });
  });
});
