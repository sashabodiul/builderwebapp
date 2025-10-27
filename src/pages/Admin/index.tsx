import { FC } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building, Building2, Users, CheckSquare, ArrowRight } from 'lucide-react';

const Admin: FC = () => {
  const { t } = useTranslation();

  const adminCards = [
    {
      title: t('admin.facilities.title'),
      description: t('admin.facilities.subtitle'),
      icon: <Building className="h-6 w-6" />,
      color: "blue",
      link: "/admin/facilities"
    },
    {
      title: t('admin.facilityTypes.title'),
      description: t('admin.facilityTypes.subtitle'),
      icon: <Building2 className="h-6 w-6" />,
      color: "green",
      link: "/admin/facility-types"
    },
    {
      title: t('admin.workers.title'),
      description: t('admin.workers.subtitle'),
      icon: <Users className="h-6 w-6" />,
      color: "orange",
      link: "/admin/workers"
    },
    {
      title: t('admin.tasks.title'),
      description: t('admin.tasks.subtitle'),
      icon: <CheckSquare className="h-6 w-6" />,
      color: "purple",
      link: "/admin/tasks"
    }
  ];

  const getCardStyles = (color: string) => {
    const baseStyles = "group flex items-center gap-4 p-6 bg-theme-bg-card border border-theme-border rounded-xl text-theme-text-primary transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-xl relative overflow-hidden";
    
    const colorStyles = {
      blue: "hover:border-blue-400 hover:shadow-blue-400/20",
      green: "hover:border-green-400 hover:shadow-green-400/20", 
      orange: "hover:border-theme-accent hover:shadow-theme-accent/20",
      purple: "hover:border-purple-400 hover:shadow-purple-400/20"
    };

    return `${baseStyles} ${colorStyles[color as keyof typeof colorStyles]}`;
  };

  const getIconStyles = (color: string) => {
    const baseStyles = "flex items-center justify-center w-14 h-14 rounded-xl bg-theme-bg-tertiary flex-shrink-0 transition-colors duration-300";
    
    const colorStyles = {
      blue: "text-blue-400 group-hover:bg-blue-400/10",
      green: "text-green-400 group-hover:bg-green-400/10",
      orange: "text-theme-accent group-hover:bg-theme-accent/10", 
      purple: "text-purple-400 group-hover:bg-purple-400/10"
    };

    return `${baseStyles} ${colorStyles[color as keyof typeof colorStyles]}`;
  };

  const getTopBorderStyles = (color: string) => {
    const colorStyles = {
      blue: "bg-blue-400",
      green: "bg-green-400",
      orange: "bg-theme-accent",
      purple: "bg-purple-400"
    };

    return `absolute top-0 left-0 right-0 h-1 ${colorStyles[color as keyof typeof colorStyles]} transition-all duration-300 group-hover:h-1.5`;
  };

  return (
    <div className="page min-h-screen bg-theme-bg-primary p-6">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-theme-text-primary mb-4 bg-gradient-to-r from-theme-accent to-theme-accent-hover bg-clip-text text-transparent">
            {t('admin.title')}
          </h1>
          <p className="text-lg text-theme-text-secondary">
            {t('admin.subtitle')}
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {adminCards.map((card, index) => (
            <Link key={index} to={card.link} className={getCardStyles(card.color)}>
              {/* Top border */}
              <div className={getTopBorderStyles(card.color)}></div>
              
              {/* Icon */}
              <div className={getIconStyles(card.color)}>
                {card.icon}
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-theme-text-primary mb-2">
                  {card.title}
                </h3>
                <p className="text-theme-text-muted text-sm leading-relaxed">
                  {card.description}
                </p>
              </div>
              
              {/* Arrow */}
              <div className="text-theme-text-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-theme-accent">
                <ArrowRight className="h-5 w-5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Admin;
