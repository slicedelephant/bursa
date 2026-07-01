/**
 * E18 Groups — pure membership & role state machine. One engine, two modes
 * (COHORT | GIVING_CIRCLE) share the same membership rules. Deterministic, no
 * I/O, no mutation: every decision returns a new value. Governance invariant:
 * a group always keeps at least one ADMIN, so it can never be orphaned. A COHORT
 * is only "active" once it has at least two members (team fundraising needs a team).
 */

export type GroupRole = 'ADMIN' | 'CONTRIBUTOR' | 'VIEWER';

/** Minimum members before a cohort counts as an active fundraising team. */
export const MIN_COHORT_MEMBERS = 2;

export interface MemberState {
  readonly userId: string;
  readonly role: GroupRole;
}

export interface MembershipDecision {
  readonly allow: boolean;
  readonly reason?: string;
  /** The role the target ends up with when the action is allowed. */
  readonly nextRole?: GroupRole;
}

/** ADMIN can manage members, invites, votes and trigger a cohort match. */
export function canManage(role: GroupRole): boolean {
  return role === 'ADMIN';
}

/** ADMIN + CONTRIBUTOR can contribute, add sub-campaigns and post to chat. */
export function canContribute(role: GroupRole): boolean {
  return role === 'ADMIN' || role === 'CONTRIBUTOR';
}

/** ADMIN + CONTRIBUTOR can cast a ballot; VIEWER only reads. */
export function canVote(role: GroupRole): boolean {
  return role === 'ADMIN' || role === 'CONTRIBUTOR';
}

/** A cohort is an active team once it reaches the member floor. */
export function cohortActive(memberCount: number): boolean {
  return memberCount >= MIN_COHORT_MEMBERS;
}

function adminCount(members: ReadonlyArray<MemberState>): number {
  return members.filter((m) => m.role === 'ADMIN').length;
}

/**
 * A user joins with the role carried by their invite. Blocked only when they are
 * already a member (the DB unique is the hard guarantee; this is the loud check).
 */
export function decideJoin(
  members: ReadonlyArray<MemberState>,
  userId: string,
  role: GroupRole,
): MembershipDecision {
  if (members.some((m) => m.userId === userId)) {
    return { allow: false, reason: 'ALREADY_MEMBER' };
  }
  return { allow: true, nextRole: role };
}

/**
 * A member leaves. The last remaining ADMIN cannot leave — that would orphan the
 * group. Non-members cannot leave.
 */
export function decideLeave(
  members: ReadonlyArray<MemberState>,
  userId: string,
): MembershipDecision {
  const target = members.find((m) => m.userId === userId);
  if (!target) {
    return { allow: false, reason: 'NOT_A_MEMBER' };
  }
  if (target.role === 'ADMIN' && adminCount(members) <= 1) {
    return { allow: false, reason: 'LAST_ADMIN' };
  }
  return { allow: true };
}

/**
 * An ADMIN changes a member's role. Demoting the last ADMIN is refused. Only an
 * ADMIN actor may change roles.
 */
export function decideRoleChange(
  members: ReadonlyArray<MemberState>,
  actorRole: GroupRole,
  targetUserId: string,
  newRole: GroupRole,
): MembershipDecision {
  if (!canManage(actorRole)) {
    return { allow: false, reason: 'FORBIDDEN' };
  }
  const target = members.find((m) => m.userId === targetUserId);
  if (!target) {
    return { allow: false, reason: 'NOT_A_MEMBER' };
  }
  if (
    target.role === 'ADMIN' &&
    newRole !== 'ADMIN' &&
    adminCount(members) <= 1
  ) {
    return { allow: false, reason: 'LAST_ADMIN' };
  }
  return { allow: true, nextRole: newRole };
}
