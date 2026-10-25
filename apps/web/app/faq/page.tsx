import { InfoPage } from '@/components/InfoPage';
import { getCatalogue } from '@/lib/server';

export const metadata = { title: 'Frequently asked questions' };

export default async function Faq() {
  const cat = await getCatalogue();
  return (
    <InfoPage active="faq" title="Frequently asked questions" draft={!cat.settings.faqApproved}>
      <div>
        {cat.settings.faqs.map((q) => <details key={q.q} style={{ borderTop: '1px solid var(--hair)', padding: '16px 0' }}><summary style={{ fontSize: 17 }}>{q.q}</summary><p className="muted" style={{ margin: '10px 0 0' }}>{q.a}</p></details>)}
      </div>
    </InfoPage>
  );
}
