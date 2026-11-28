import { HOME_FAQS } from '../../content/landing.js';

export function FaqSection() {
  return (
    <section aria-labelledby="faq-heading" className="mx-auto max-w-5xl px-4 pb-4">
      <div className="rounded-xl border border-border-subtle bg-surface-primary p-6 shadow-card sm:p-8">
        <h2 id="faq-heading" className="text-headline-md text-text-primary">
          Frequently asked questions
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
          {HOME_FAQS.map((item) => (
            <div key={item.question}>
              <h3 className="text-label-lg font-semibold text-text-primary">{item.question}</h3>
              <p className="mt-1 text-body-sm leading-relaxed text-text-secondary">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}