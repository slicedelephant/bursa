import { TestBed } from '@angular/core/testing';
import { GroupChatView } from '../../core/models';
import { GroupChatComponent } from './group-chat.component';

function view(messages: GroupChatView['messages'] = []): GroupChatView {
  return { messages };
}

describe('GroupChatComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupChatComponent],
    }).compileComponents();
  });

  function render(v: GroupChatView, canPost = false, rejection = '') {
    const fixture = TestBed.createComponent(GroupChatComponent);
    fixture.componentRef.setInput('view', v);
    fixture.componentRef.setInput('canPost', canPost);
    fixture.componentRef.setInput('rejection', rejection);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the approved message history', () => {
    const el = render(
      view([{ userId: 'u1', name: 'Amara', text: 'Hi team', createdAt: '2026-06-01' }]),
    ).nativeElement as HTMLElement;
    expect(el.textContent).toContain('Amara');
    expect(el.textContent).toContain('Hi team');
  });

  it('shows an empty state', () => {
    const el = render(view()).nativeElement as HTMLElement;
    expect(el.textContent).toContain('No messages yet');
  });

  it('hides the compose box when the viewer cannot post', () => {
    const fixture = render(view(), false);
    const form = (fixture.nativeElement as HTMLElement).querySelector('form');
    expect(form).toBeNull();
  });

  it('emits the trimmed draft on submit and clears it', () => {
    const fixture = render(view(), true);
    let emitted: string | undefined;
    fixture.componentInstance.post.subscribe((t) => (emitted = t));
    fixture.componentInstance.draft.set('  Great work!  ');
    fixture.componentInstance.submit();
    expect(emitted).toBe('Great work!');
    expect(fixture.componentInstance.draft()).toBe('');
  });

  it('does not emit an empty draft', () => {
    const fixture = render(view(), true);
    const spy = jest.fn();
    fixture.componentInstance.post.subscribe(spy);
    fixture.componentInstance.draft.set('   ');
    fixture.componentInstance.submit();
    expect(spy).not.toHaveBeenCalled();
  });

  it('surfaces a moderation rejection reason', () => {
    const el = render(view(), true, 'slur:idiot').nativeElement as HTMLElement;
    expect(el.textContent).toContain('slur:idiot');
  });
});
