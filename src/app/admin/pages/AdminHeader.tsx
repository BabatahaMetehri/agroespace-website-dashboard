import { ReactNode } from 'react';

export const AdminHeader = ({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
      <div>
        <h1 className="text-3xl md:text-4xl font-light text-white mb-2">{title}</h1>
        {subtitle && <p className="text-white/50">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
};
