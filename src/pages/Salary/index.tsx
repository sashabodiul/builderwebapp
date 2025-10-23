import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Minus } from 'lucide-react';

const Salary: FC = () => {
  const { t } = useTranslation();

  // static salary data
  const salaryData = {
    worker_id: 1,
    period: {
      date_from: "2025-08-31T00:00:00.000Z",
      date_to: "2025-09-29T23:59:59.999Z"
    },
    base_calculation: {
      total_hours: 0,
      base_salary: 0,
      work_processes_count: 0,
      days_worked: 0,
      overtime_hours: 0,
      hours_rate: 0,
      total_accrued: 0
    },
    adjustments: {
      penalties: {
        total: 0,
        count: 0,
        details: []
      },
      prepayments: {
        total: 0,
        count: 0,
        details: []
      },
      awards: {
        total: 0,
        count: 0,
        details: []
      }
    },
    final_salary: 0
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.floor(((hours - h) * 60 - m) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2).replace('.', ',')} €`;
  };

  return (
    <div className="min-h-screen page bg-theme-bg-primary p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-theme-text-primary mb-8">{t('salary.title')}</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* left side - 2x3 grid */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-6">
            {/* top row */}
            <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 hover:bg-theme-bg-hover transition-colors">
              <div className="text-center">
                <div className="text-4xl font-bold text-theme-text-primary mb-3">
                  {formatTime(salaryData.base_calculation.overtime_hours)}
                </div>
                <div className="text-lg text-theme-text-secondary font-medium">{t('salary.overtime')}</div>
              </div>
            </div>

            <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 hover:bg-theme-bg-hover transition-colors">
              <div className="text-center">
                <div className="text-3xl font-bold text-theme-text-primary mb-3">
                  {formatDate(salaryData.period.date_from)} — {formatDate(salaryData.period.date_to)}
                </div>
                <div className="text-lg text-theme-text-secondary font-medium">{t('salary.period')}</div>
              </div>
            </div>

            <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 hover:bg-theme-bg-hover transition-colors">
              <div className="text-center">
                <div className="text-3xl font-bold text-theme-text-primary mb-3">
                  {formatTime(salaryData.base_calculation.total_hours)} × {formatCurrency(salaryData.base_calculation.base_salary)}
                </div>
                <div className="text-lg text-theme-text-secondary font-medium">{t('salary.hoursRate')}</div>
              </div>
            </div>

            {/* bottom row */}
            <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 hover:bg-theme-bg-hover transition-colors">
              <div className="text-center">
                <div className="text-4xl font-bold text-theme-text-primary mb-3">
                  {salaryData.base_calculation.days_worked}
                </div>
                <div className="text-lg text-theme-text-secondary font-medium">{t('salary.daysWorked')}</div>
              </div>
            </div>

            <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 hover:bg-theme-bg-hover transition-colors">
              <div className="text-center">
                <div className="text-4xl font-bold text-theme-text-primary mb-3">
                  {formatTime(salaryData.base_calculation.total_hours)}
                </div>
                <div className="text-lg text-theme-text-secondary font-medium">{t('salary.totalHours')}</div>
              </div>
            </div>

            <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 hover:bg-theme-bg-hover transition-colors">
              <div className="text-center">
                <div className="text-4xl font-bold text-theme-accent mb-3">
                  {formatCurrency(salaryData.base_calculation.total_accrued)}
                </div>
                <div className="text-lg text-theme-text-secondary font-medium">{t('salary.totalAccrued')}</div>
              </div>
            </div>
          </div>

          {/* right side - total to pay */}
          <div className="bg-theme-bg-card border border-theme-border rounded-xl">
            <div className="p-6 pb-4">
              <h3 className="text-theme-text-primary text-2xl font-bold">{t('salary.totalToPay')}</h3>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Plus className="h-6 w-6 text-theme-success" />
                  <span className="text-theme-text-secondary text-lg font-medium">{t('salary.baseSalary')}</span>
                </div>
                <span className="text-theme-text-primary font-bold text-lg">{formatCurrency(salaryData.base_calculation.base_salary)}</span>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Plus className="h-6 w-6 text-theme-success" />
                  <span className="text-theme-text-secondary text-lg font-medium">{t('salary.advances')}</span>
                </div>
                <span className="text-theme-text-primary font-bold text-lg">{formatCurrency(salaryData.adjustments.prepayments.total)}</span>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Plus className="h-6 w-6 text-theme-success" />
                  <span className="text-theme-text-secondary text-lg font-medium">{t('salary.bonuses')}</span>
                </div>
                <span className="text-theme-text-primary font-bold text-lg">{formatCurrency(salaryData.adjustments.awards.total)}</span>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Minus className="h-6 w-6 text-theme-error" />
                  <span className="text-theme-text-secondary text-lg font-medium">{t('salary.penalties')}</span>
                </div>
                <span className="text-theme-text-primary font-bold text-lg">{formatCurrency(salaryData.adjustments.penalties.total)}</span>
              </div>

              <div className="border-t-2 border-theme-border pt-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-theme-text-primary font-bold text-xl">{t('salary.finalSalary')}</span>
                  <span className="text-4xl font-bold text-theme-accent">{formatCurrency(salaryData.final_salary)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Salary;
