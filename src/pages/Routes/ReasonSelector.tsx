import { FC, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const PRESET_REASONS = [
  'закупівля',
  'доставка',
  'повернення',
  'інше',
];

const ReasonSelector: FC = () => {
  const location = useLocation() as any;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const points = (location.state?.points as any[]) ?? [];

  const addAndReturn = () => {
    const last = points[points.length - 1];
    // default behavior: if last exists, create a simple loop back to site/home
    const from = last ? last.to : 'site';
    const to = last && last.to !== 'home' ? 'home' : 'site';
    const nextPoints = [...points, { from, to, reason: reason || 'без причини' }];
    navigate(-1, { state: { points: nextPoints } });
  };

  return (
    <div className="page min-h-screen bg-theme-bg-primary p-6">
      <div className="max-w-xl mx-auto w-full">
        <h2 className="text-2xl font-semibold mb-4 text-theme-text-primary">{t('routes.chooseReason', 'Choose Route Reason')}</h2>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {PRESET_REASONS.map((r) => (
            <button
              key={r}
              className={`px-3 py-2 rounded-md border ${reason === r ? 'bg-theme-primary text-white border-theme-primary' : 'border-theme-border-primary text-theme-text-primary'}`}
              onClick={() => setReason(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <input
          className="w-full rounded-md border border-theme-border-primary bg-theme-bg-secondary px-3 py-2 text-theme-text-primary mb-4"
          placeholder={'інша причина'}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button
          className="px-4 py-2 rounded-md bg-theme-primary text-white"
          onClick={addAndReturn}
        >
          додати
        </button>
      </div>
    </div>
  );
};

export default ReasonSelector;


