import { Link, useNavigate } from 'react-router-dom';
import { Building2, Presentation, UsersRound } from 'lucide-react';
import yeokjeonLogo from '@/assets/brand/yeokjeon-logo.png';
import { usePresent } from '@/shared/lib/present';
import { useApp, type AppRole } from './AppData';
import { useStoreId } from './useStoreId';

const roles: { id: AppRole; label: string }[] = [
  { id: '직원', label: '직원' },
  { id: '점장', label: '점장' },
  { id: 'SV', label: '본사 SV' },
];

export function TopBar() {
  const { role, setRole, targetId } = useApp();
  const { present, toggle } = usePresent();
  const storeId = useStoreId() ?? targetId;
  const navigate = useNavigate();

  function changeRole(next: AppRole) {
    setRole(next);
    if (next === 'SV') navigate('/hq');
    else if (storeId) navigate(`/store/${storeId}/${next === '점장' ? 'manager' : 'manual'}`);
  }

  return (
    <header className="portal-header">
      <Link to="/" className="portal-wordmark" aria-label="역전할머니맥주 × 윤슬 포털 홈">
        <img className="portal-brand-logo" src={yeokjeonLogo} width={199} height={59} alt="역전할머니맥주" />
        <span className="portal-brand-cross" aria-hidden="true">×</span>
        <span className="portal-yunseul">윤슬</span>
      </Link>
      <div className="portal-top-workspace">
        <div className="portal-product"><Building2 size={18} aria-hidden /> <strong>가맹점 운영포털</strong></div>
        <div className="portal-top-tools">
          {role !== '직원' && <button type="button" className="presentation-toggle" onClick={toggle} aria-pressed={present} title="심사 모드 · 본문 확대 및 실행 식별자 숨김" aria-label="심사 모드"><Presentation size={16} /><span>심사 모드</span></button>}
          <div role="group" aria-label="역할 전환" className="portal-roles">
            <UsersRound size={16} className="roles-icon" aria-hidden />
            {roles.map((r) => <button type="button" key={r.id} aria-pressed={role === r.id} disabled={r.id !== 'SV' && !storeId} onClick={() => changeRole(r.id)}>{r.label}</button>)}
          </div>
        </div>
      </div>
    </header>
  );
}
