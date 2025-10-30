import { FC } from 'react';
import FeatureLinkCard from '@/components/ui/FeatureLinkCard';
import { ArrowRight, Package, MapPinHouse, Home, ShowerHead, Fuel, User2 } from 'lucide-react';
import useBackButton from '@/hooks/useBackButton';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

const RoutesPage: FC = () => {
  useBackButton('/');
  const { t } = useTranslation();
  const location = useLocation() as any;
  const points = (location.state?.points as any[]) ?? [];

  const cards = [
    { title: t('routes.materials'), icon: <Package className="h-6 w-6" />, color: 'blue', to: '/routes/materials' },
    { title: t('routes.object'), icon: <MapPinHouse className="h-6 w-6" />, color: 'green', to: '/routes/site' },
    { title: t('routes.home'), icon: <Home className="h-6 w-6" />, color: 'orange', to: '/routes/home' },
    { title: t('routes.washFuel'), icon: (
        <div className="flex items-center gap-1 text-theme-text-primary">
          <ShowerHead className="h-5 w-5" />
          <Fuel className="h-5 w-5" />
        </div>
      ), color: 'purple', to: '/routes/wash-fuel' },
    { title: t('routes.personal'), icon: <User2 className="h-6 w-6" />, color: 'blue', to: '/routes/personal' },
  ] as const;

  return (
    <div className="page min-h-screen bg-theme-bg-primary p-6">
      <div className="max-w-7xl mx-auto w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-theme-text-primary">{t('routes.title')}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {cards.map((c, idx) => (
            <FeatureLinkCard
              key={idx}
              title={c.title}
              icon={c.icon}
              color={c.color as any}
              to={c.to}
              state={{ points }}
              rightIcon={<ArrowRight className="h-5 w-5" />}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoutesPage;


