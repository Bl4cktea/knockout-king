import type { Expr } from '../face/config';
import { isBlocking } from '../sim/geometry';
import { G, O, P } from '../sim/state';

/** Which facial expression the opponent should wear right now. */
export function oppExpr(): Expr {
  if (G.scene === 'win') return 'ko';
  if (G.scene === 'lose') return 'win';
  if (O.flash > 0 || O.hitT > 0) return 'hit';
  switch (O.st) {
    case 'tele':
    case 'strike':
      return 'wind';
    case 'stunned':
    case 'getup':
      return 'stunned';
    case 'down':
      return 'ko';
    case 'taunt':
      return 'taunt';
    default:
      return 'idle';
  }
}

export function playerExpr(): Expr {
  if (G.scene === 'lose') return 'ko';
  if (G.scene === 'win') return 'win';
  if (P.stun > 0 || P.flash > 0) return 'hit';
  if (isBlocking() || P.punch?.big) return 'wind';
  return 'idle';
}
