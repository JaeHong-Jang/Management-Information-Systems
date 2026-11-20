import { CiteText } from '@/shared/ui';

const managerCall = /(점장에게 직접 연락(?:하십시오)?|점장님을 직접 불러 주세요)/;

export function ManagerCallText({ text, onCite }: { text: string; onCite: (id: string) => void }) {
  const parts = (text || '점장에게 직접 연락.').split(managerCall);
  return <>{parts.map((part, index) => index % 2
    ? <strong key={index} className="text-ink">{part}</strong>
    : <CiteText key={index} text={part} onOpen={onCite} />
  )}</>;
}
