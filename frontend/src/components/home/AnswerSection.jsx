import { DEFINITIONS, HOW_IT_WORKS, PRODUCT_SUMMARY } from '../../content/landing.js';

export function AnswerSection() {
  return (
    <section aria-labelledby="answers-heading" className="mx-auto max-w-5xl px-4 pb-4">
      <div className="rounded-xl border border-border-subtle bg-surface-primary p-6 shadow-card sm:p-8">
        <h2 id="answers-heading" className="text-headline-md text-text-primary">
          What is FazalDataConverter?
        </h2>
        <p className="mt-2 max-w-3xl text-body-md leading-relaxed text-text-secondary">
          {PRODUCT_SUMMARY}
        </p>

        <h3 className="mt-8 text-headline-sm text-text-primary">How it works</h3>
        <ol className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          {HOW_IT_WORKS.map((step, index) => (
            <li
              key={step.name}
              className="rounded-lg border border-border-subtle bg-surface-secondary p-4"
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary-soft text-label-sm font-semibold text-brand-primary"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <h4 className="mt-2 text-label-lg font-semibold text-text-primary">{step.name}</h4>
              <p className="mt-1 text-body-sm leading-relaxed text-text-secondary">{step.text}</p>
            </li>
          ))}
        </ol>

        <h3 className="mt-8 text-headline-sm text-text-primary">Key definitions</h3>
        <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
          {DEFINITIONS.map((item) => (
            <div key={item.term}>
              <dt className="text-label-lg font-semibold text-text-primary">{item.term}</dt>
              <dd className="mt-1 text-body-sm leading-relaxed text-text-secondary">
                {item.definition}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}