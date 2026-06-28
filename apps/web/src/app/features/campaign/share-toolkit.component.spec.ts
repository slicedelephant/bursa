import { TestBed } from '@angular/core/testing';
import { ShareToolkitComponent } from './share-toolkit.component';

describe('ShareToolkitComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareToolkitComponent],
    }).compileComponents();
  });

  function render(
    inputs: Partial<{
      campaignId: string;
      title: string;
      studentName: string;
      firstBackers: boolean;
      heading: string;
      subtext: string;
    }> = {},
  ) {
    const fixture = TestBed.createComponent(ShareToolkitComponent);
    fixture.componentRef.setInput('campaignId', inputs.campaignId ?? 'c1');
    fixture.componentRef.setInput('title', inputs.title ?? 'Help me study');
    fixture.componentRef.setInput('studentName', inputs.studentName ?? 'Amara');
    if (inputs.firstBackers !== undefined) {
      fixture.componentRef.setInput('firstBackers', inputs.firstBackers);
    }
    if (inputs.heading !== undefined) {
      fixture.componentRef.setInput('heading', inputs.heading);
    }
    if (inputs.subtext !== undefined) {
      fixture.componentRef.setInput('subtext', inputs.subtext);
    }
    fixture.detectChanges();
    return fixture;
  }

  function hrefs(el: HTMLElement): string[] {
    return Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
  }

  it('renders WhatsApp, Telegram and Facebook share deeplinks', () => {
    const el = render().nativeElement as HTMLElement;
    const all = hrefs(el).join(' ');
    expect(all).toContain('https://wa.me/?text=');
    expect(all).toContain('https://t.me/share/url?');
    expect(all).toContain('https://www.facebook.com/sharer/sharer.php?u=');
  });

  it('builds the deeplinks against the current origin and campaign id', () => {
    const el = render({ campaignId: 'abc' }).nativeElement as HTMLElement;
    const wa = hrefs(el).find((h) => h.includes('wa.me')) ?? '';
    expect(decodeURIComponent(wa)).toContain('/campaigns/abc');
  });

  it('shows a custom heading', () => {
    const el = render({ heading: 'Be the first to back Amara' }).nativeElement as HTMLElement;
    expect(el.textContent).toContain('Be the first to back Amara');
  });

  it('shows the optional first-backers subtext when provided', () => {
    const el = render({
      subtext: 'Share with your inner circle first.',
    }).nativeElement as HTMLElement;
    expect(el.textContent).toContain('Share with your inner circle first.');
  });

  it('shows the first-backers framing in the message preview', () => {
    const el = render({ firstBackers: true }).nativeElement as HTMLElement;
    expect(el.textContent?.toLowerCase()).toContain('first');
  });

  it('switches the message language to German', () => {
    const fixture = render();
    const el = fixture.nativeElement as HTMLElement;
    const deBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim().toLowerCase() === 'de',
    ) as HTMLButtonElement;
    deBtn.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Unterstütze');
  });

  it('copies the link to the clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const fixture = render({ campaignId: 'c9' });
    const el = fixture.nativeElement as HTMLElement;
    const copyBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      (b.getAttribute('aria-label') ?? '').toLowerCase().includes('copy'),
    ) as HTMLButtonElement;

    copyBtn.click();
    await Promise.resolve();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalled();
    expect(writeText.mock.calls[0][0]).toContain('/campaigns/c9');
  });

  it('does not throw when the clipboard is unavailable', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('blocked'));
    Object.assign(navigator, { clipboard: { writeText } });
    const fixture = render();
    await expect(fixture.componentInstance.copy()).resolves.toBeUndefined();
  });
});
