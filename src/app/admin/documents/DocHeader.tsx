import agroLogo from '../../../imports/logo-with-shadow.png';
import westernLogo from '../../../imports/partners/western-logo.png';
import senningerLogo from '../../../imports/partners/senninger.png';
import type { CompanySettings } from './types';

export function DocHeader({ company }: { company: CompanySettings }) {
  return (
    <>
      <div className="doc-hd">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img className="logo-agro" src={agroLogo} alt="Agro Espace" />
            <div>
              <div className="brand-name">{company.brandName}</div>
              <div className="brand-sub sans">{company.tagline}</div>
            </div>
          </div>
          <div className="brand-lines sans">
            CAPITAL SOCIAL : {company.capital} &nbsp;·&nbsp; Siège : {company.siege}<br />
            Tél : {company.tel} &nbsp; FAX : {company.fax} &nbsp; Email : {company.email}<br />
            <span className="brand-ids">
              R.C. {company.rc} · ART.IMP {company.artImp} · NIF {company.nif} · NIS {company.nis}
            </span>
          </div>
        </div>
        <div style={{ minWidth: 120 }}>
          <img className="logo-western" src={westernLogo} alt="Western" />
          <img className="logo-senninger" src={senningerLogo} alt="Senninger" />
        </div>
      </div>
      <div className="rule" />
    </>
  );
}
