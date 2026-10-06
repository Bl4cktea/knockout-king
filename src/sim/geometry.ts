import { W } from '../config';
import { G, O, OH, P, held } from './state';

export const isBlocking = (): boolean =>
  held.blk && P.stun <= 0 && P.dodgeT <= 0 && G.scene === 'fight';

/** Centre of the opponent's face on the logical canvas. */
export const faceXY = (): [number, number] => [W / 2 + OH.ox, 172 + OH.oy + O.downY];
