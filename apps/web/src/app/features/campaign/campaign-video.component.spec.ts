import { TestBed } from '@angular/core/testing';
import { CampaignVideoComponent } from './campaign-video.component';

describe('CampaignVideoComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignVideoComponent],
    }).compileComponents();
  });

  function render(videoUrl: string | null): HTMLElement {
    const fixture = TestBed.createComponent(CampaignVideoComponent);
    fixture.componentRef.setInput('videoUrl', videoUrl);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders a responsive iframe for a valid youtube link', () => {
    const el = render('https://youtu.be/dQw4w9WgXcQ');
    const iframe = el.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('src')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('renders a vimeo player iframe', () => {
    const el = render('https://vimeo.com/123456789');
    expect(el.querySelector('iframe')?.getAttribute('src')).toContain(
      'player.vimeo.com/video/123456789',
    );
  });

  it('renders nothing when the url is missing', () => {
    expect(render(null).querySelector('iframe')).toBeNull();
  });

  it('renders nothing for an unsupported link', () => {
    expect(render('https://example.com/clip').querySelector('iframe')).toBeNull();
  });
});
