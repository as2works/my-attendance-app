import React, { useEffect, useState } from 'react';
import { getGeneralManualSlug, type GeneralManualSlug } from '../../services/manualPath';
import GeneralManualFaq from './GeneralManualFaq';
import GeneralManualIndex from './GeneralManualIndex';
import GeneralManualList from './GeneralManualList';
import GeneralManualNote from './GeneralManualNote';
import GeneralManualOpen from './GeneralManualOpen';
import GeneralManualRegister from './GeneralManualRegister';

const GeneralManual: React.FC = () => {
  const [slug, setSlug] = useState<GeneralManualSlug>(() => getGeneralManualSlug());

  useEffect(() => {
    const sync = () => setSlug(getGeneralManualSlug());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  switch (slug) {
    case 'register':
      return <GeneralManualRegister />;
    case 'open':
      return <GeneralManualOpen />;
    case 'list':
      return <GeneralManualList />;
    case 'note':
      return <GeneralManualNote />;
    case 'faq':
      return <GeneralManualFaq />;
    case 'index':
    default:
      return <GeneralManualIndex />;
  }
};

export default GeneralManual;
