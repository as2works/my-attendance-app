import React, { useEffect, useState } from 'react';
import {
  ADMIN_MANUAL_LEGACY_REDIRECTS,
  ADMIN_MANUAL_PATH,
  getAdminManualSlug,
  type AdminManualSlug,
} from '../../services/manualPath';
import AdminManualFaq from './AdminManualFaq';
import AdminManualIndex from './AdminManualIndex';
import { AdminManualCsv, AdminManualDaily, AdminManualEdit } from './AdminManualOps';
import {
  AdminManualGroups,
  AdminManualLinks,
  AdminManualSeason,
  AdminManualSetup,
  AdminManualUsers,
} from './AdminManualSetup';
import AdminManualTour from './AdminManualTour';

/** 旧URLを新URLへ置き換え（履歴に残さない） */
function redirectLegacyPathIfNeeded() {
  const p = window.location.pathname.replace(/\/+$/, '') || '/';
  if (!p.startsWith(`${ADMIN_MANUAL_PATH}/`)) return;
  const raw = p.slice(ADMIN_MANUAL_PATH.length + 1).split('/')[0] || '';
  const next = ADMIN_MANUAL_LEGACY_REDIRECTS[raw];
  if (!next) return;
  const target = `${ADMIN_MANUAL_PATH}/${next}`;
  if (p !== target) {
    window.history.replaceState({}, '', target);
  }
}

const AdminManual: React.FC = () => {
  const [slug, setSlug] = useState<AdminManualSlug>(() => {
    redirectLegacyPathIfNeeded();
    return getAdminManualSlug();
  });

  useEffect(() => {
    const sync = () => {
      redirectLegacyPathIfNeeded();
      setSlug(getAdminManualSlug());
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  switch (slug) {
    case 'tour':
      return <AdminManualTour />;
    case 'daily':
      return <AdminManualDaily />;
    case 'edit':
      return <AdminManualEdit />;
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
