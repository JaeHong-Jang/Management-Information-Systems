import { CircleHelp, Equal, Scale } from 'lucide-react';
import type { CrossVerdict } from '@shared/contracts';
import { Tag } from './Badge';

/** 카카오·네이버 교차 판정. '양쪽 모두 낮음'만 주의 색 */
export function CrossChip({ cross }: { cross: CrossVerdict }) {
  if (cross === '양쪽 모두 낮음') return <Tag tone="amber" icon={Scale}>{cross}</Tag>;
  if (cross.includes('표본 부족') || cross.includes('판정 불가')) return <Tag icon={CircleHelp}>{cross}</Tag>;
  return <Tag icon={Equal}>{cross}</Tag>;
}
