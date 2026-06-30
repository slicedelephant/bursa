import { InactivityView, StreakState } from '../../core/models';

/** Pure presentation helpers for the update-read streak and the inactivity
 * reminder. No I/O; returns new strings, never mutates inputs. */

export function readStreakText(streak: StreakState): string {
  const n = streak.currentMonths;
  if (n <= 0) return 'Start your reading streak this month';
  return `${n} month${n === 1 ? '' : 's'} of staying in touch`;
}

export function readStreakSubtext(streak: StreakState): string {
  if (streak.currentMonthCovered) {
    return 'You have read an update this month — keep it going!';
  }
  if (streak.currentMonths > 0) {
    return 'Read an update this month to keep your streak alive.';
  }
  return 'Read your first update to begin a streak.';
}

/** Headline for the inactivity reminder banner; empty when no reminder is due. */
export function inactivityHeadline(view: InactivityView): string {
  if (!view.shouldRemind || !view.reminder) return '';
  return view.reminder.title;
}

/** A friendly "last gave N days ago" label, or empty when never/recent. */
export function lastGaveText(view: InactivityView): string {
  if (view.daysSince === null) return '';
  return `Your last gift was ${view.daysSince} day${view.daysSince === 1 ? '' : 's'} ago`;
}
