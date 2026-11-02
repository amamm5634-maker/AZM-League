import type { Player, Position } from '../types';

const ROWS: Position[][] = [
  ['جناح', 'مهاجم', 'جناح'],
  ['وسط', 'وسط', 'وسط'],
  ['مدافع', 'مدافع', 'مدافع', 'مدافع'],
  ['حارس'],
];

/** يختار التشكيلة الأساسية 4-3-3 حسب المراكز، ويُبقي الخانات الفارغة للاعبين الذين لم تصل بياناتهم بعد */
export function pickLineup(squad: Player[]) {
  const pools = new Map<Position, Player[]>();
  for (const p of [...squad].sort((a, b) => a.number - b.number)) {
    pools.set(p.position, [...(pools.get(p.position) ?? []), p]);
  }
  const used = new Set<string>();
  const rows = ROWS.map((row) =>
    row.map((pos) => {
      const next = pools.get(pos)?.shift();
      if (next) used.add(next.id);
      return next;
    }),
  );
  const subs = squad.filter((p) => !used.has(p.id)).sort((a, b) => a.number - b.number);
  return { rows, subs };
}
