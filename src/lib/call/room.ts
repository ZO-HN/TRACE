// Deterministic per-coach room naming: the coach and all their coached
// trainees derive the same room without any server coordination.
//
// V1 limitation (documented): meet.jit.si rooms are open to anyone who knows
// the name. Add a lobby/password or a JWT-gated self-hosted Jitsi later.

export function roomNameFor(coachId: string): string {
  return `trace-call-${coachId.replace(/[^a-zA-Z0-9]/g, '')}`;
}
