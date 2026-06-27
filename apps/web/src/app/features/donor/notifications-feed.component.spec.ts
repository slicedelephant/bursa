import { TestBed } from '@angular/core/testing';
import { NotificationFeed } from '../../core/models';
import { NotificationsFeedComponent } from './notifications-feed.component';

describe('NotificationsFeedComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsFeedComponent],
    }).compileComponents();
  });

  function render(feed: NotificationFeed) {
    const fixture = TestBed.createComponent(NotificationsFeedComponent);
    fixture.componentRef.setInput('feed', feed);
    fixture.detectChanges();
    return fixture;
  }

  const feed = (over: Partial<NotificationFeed> = {}): NotificationFeed => ({
    unread: 1,
    items: [
      {
        id: 'n1',
        type: 'THANK_YOU',
        title: 'Thank you for your gift',
        body: 'Your gift is on its way.',
        readAt: null,
        createdAt: new Date().toISOString(),
      },
    ],
    ...over,
  });

  it('renders notifications with an unread badge', () => {
    const el = render(feed()).nativeElement as HTMLElement;
    expect(el.textContent).toContain('Thank you for your gift');
    expect(el.textContent).toContain('1 new');
    expect(el.textContent).toContain('Mark as read');
  });

  it('shows an empty state when there are no items', () => {
    const el = render(feed({ items: [], unread: 0 })).nativeElement as HTMLElement;
    expect(el.textContent).toContain('No updates yet');
    expect(el.textContent).not.toContain('new');
  });

  it('emits the notification id when marking read', () => {
    const fixture = render(feed());
    let emitted: string | undefined;
    fixture.componentInstance.read.subscribe((id) => (emitted = id));
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button');
    btn?.dispatchEvent(new Event('click'));
    expect(emitted).toBe('n1');
  });

  it('does not offer mark-as-read for an already read item', () => {
    const el = render(
      feed({
        unread: 0,
        items: [
          {
            id: 'n2',
            type: 'MILESTONE',
            title: '80% funded',
            body: 'Almost there.',
            readAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    ).nativeElement as HTMLElement;
    expect(el.textContent).toContain('80% funded');
    expect(el.textContent).not.toContain('Mark as read');
  });
});
