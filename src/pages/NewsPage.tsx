import { useState } from 'react';
import { formatArabicDate } from '../lib/stats';
import { useData } from '../store';
import { EmptyState, PageHead } from '../components/StateViews';
import type { NewsItem } from '../types';

function NewsCard({ n, featured }: { n: NewsItem; featured?: boolean }) {
  return (
    <article className={`card news-item${featured ? ' news-featured' : ''}`}>
      {n.image ? (
        <img
          className="news-img"
          src={n.image.startsWith('http') ? n.image : `${import.meta.env.BASE_URL}${n.image}`}
          alt={n.title}
          loading="lazy"
        />
      ) : (
        <div className="news-img ph" aria-hidden="true" />
      )}
      <div className="meta">
        {featured && <span className="brand-badge">عزم نيوز</span>}
        <span className="chip">{n.tag}</span>
        <span>{formatArabicDate(n.date)}</span>
      </div>
      <h3>{n.title}</h3>
      <p>{n.summary}</p>
    </article>
  );
}

export function NewsPage() {
  const state = useData();
  const [tag, setTag] = useState('الكل');
  const all = [...state.news].sort((a, b) => b.date.localeCompare(a.date));
  const tags = ['الكل', ...Array.from(new Set(all.map((n) => n.tag)))];
  const news = tag === 'الكل' ? all : all.filter((n) => n.tag === tag);

  return (
    <>
      <PageHead title="أخبار الدوري" subtitle="آخر الإعلانات والتقارير من اللجنة المنظمة." />
      {all.length === 0 ? (
        <EmptyState title="لا توجد أخبار بعد" hint="ستظهر هنا أخبار الدوري فور نشرها." />
      ) : (
        <>
          <div className="pills" role="group" aria-label="تصنيف الأخبار">
            {tags.map((t) => (
              <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="news-list">
            {news.map((n, i) => (
              <NewsCard key={n.id} n={n} featured={i === 0} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
