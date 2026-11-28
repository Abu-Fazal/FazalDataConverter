import { CONVERSION_MATRIX } from '../../content/landing.js';

export function ConversionMatrixSection() {
  return (
    <section aria-labelledby="matrix-heading" className="mx-auto max-w-5xl px-4 pb-4">
      <div className="rounded-xl border border-border-subtle bg-surface-primary p-6 shadow-card sm:p-8">
        <h2 id="matrix-heading" className="text-headline-md text-text-primary">
          Supported conversions
        </h2>
        <p className="mt-2 max-w-3xl text-body-md leading-relaxed text-text-secondary">
          Every supported direction uses the same validation and verification pipeline. Output
          formats preserve the data and structure described below.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <caption className="sr-only">
              Supported input formats, output formats, and conversion notes
            </caption>
            <thead>
              <tr className="border-b border-border-subtle">
                <th scope="col" className="py-3 pr-4 text-label-sm uppercase tracking-wider text-text-muted">
                  Input
                </th>
                <th scope="col" className="py-3 pr-4 text-label-sm uppercase tracking-wider text-text-muted">
                  Output
                </th>
                <th scope="col" className="py-3 text-label-sm uppercase tracking-wider text-text-muted">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {CONVERSION_MATRIX.map((row) => (
                <tr
                  key={`${row.from}-${row.to}`}
                  className="border-b border-border-subtle last:border-b-0"
                >
                  <td className="py-3 pr-4 text-body-sm text-text-primary">{row.from}</td>
                  <td className="py-3 pr-4 text-body-sm font-medium text-text-primary">{row.to}</td>
                  <td className="py-3 text-body-sm text-text-secondary">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}