import React, { useEffect, useState } from 'react';
import { getAdminManualSlug, type AdminManualSlug } from '../../services/manualPath';
import {
  AdminManualCsv,
  AdminManualHistory,
  AdminManualOverview,
} from './AdminManualDaily';
import AdminManualFaq from './AdminManualFaq';
import AdminManualIndex from './AdminManualIndex';
import {
  AdminManualGroups,
  AdminManualLinks,
  AdminManualSeason,
  AdminManualSetup,
  AdminManualUsers,
} from './AdminManualSetup';

const AdminManual: React.FC = () => {
  const [slug, setSlug] = useState<AdminManualSlug>(() => getAdminManualSlug());

  useEffect(() => {
    const sync = () => setSlug(getAdminManualSlug());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  switch (slug) {
    case 'overview':
      return <AdminManualOverview />;
    case 'history':
      return <AdminManualHistory />;
    case 'csv':
      return <AdminManualCsv />;
    case 'setup':
      return <AdminManualSetup />;
    case 'season':
      return <AdminManualSeason />;
    case 'groups':
      return <AdminManualGroups />;
    case 'users':
      return <AdminManualUsers />;
    case 'links':
      return <AdminManualLinks />;
    case 'faq':
      return <AdminManualFaq />;
    case 'index':
    default:
      return <AdminManualIndex />;
  }
};

export default AdminManual;
