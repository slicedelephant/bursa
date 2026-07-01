import { GroupRole } from '../../core/models';

/** Pure presentation helpers for group roles. No I/O; return new strings. */

export function roleLabel(role: GroupRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'CONTRIBUTOR':
      return 'Contributor';
    case 'VIEWER':
    default:
      return 'Viewer';
  }
}

/** A short description of what a role may do. */
export function rolePermission(role: GroupRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Manages members, invites and votes';
    case 'CONTRIBUTOR':
      return 'Contributes, votes and chats';
    case 'VIEWER':
    default:
      return 'Reads only';
  }
}

export function canManage(role: GroupRole | null): boolean {
  return role === 'ADMIN';
}

export function canContribute(role: GroupRole | null): boolean {
  return role === 'ADMIN' || role === 'CONTRIBUTOR';
}
