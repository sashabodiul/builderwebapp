import { FC } from 'react';
import FeatureLinkCard from '@/components/ui/FeatureLinkCard';
import { ArrowRight, Package, MapPinHouse, Home, ShowerHead, Fuel, User2 } from 'lucide-react';
import useBackButton from '@/hooks/useBackButton';
import { useTranslation } from 'react-i18next';

const RoutesPage: FC = () => {
  useBackButton('/');
  const { t } = useTranslation();

  const cards = [
    { title: t('routes.materials'), icon: <Package className="h-6 w-6" />, color: 'blue', to: '#' },
    { title: t('routes.object'), icon: <MapPinHouse className="h-6 w-6" />, color: 'green', to: '#' },
    { title: t('routes.home'), icon: <Home className="h-6 w-6" />, color: 'orange', to: '#' },
    { title: t('routes.washFuel'), icon: (
        <div className="flex items-center gap-1 text-theme-text-primary">
          <ShowerHead className="h-5 w-5" />
          <Fuel className="h-5 w-5" />
        </div>
      ), color: 'purple', to: '#' },
    { title: t('routes.personal'), icon: <User2 className="h-6 w-6" />, color: 'blue', to: '#' },
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
              rightIcon={<ArrowRight className="h-5 w-5" />}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoutesPage;


