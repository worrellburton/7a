// Home-page insurance verification block. Uses the same form the
// /admissions page uses — contact details, insurance selector, and
// front/back insurance-card upload — instead of the earlier
// three-field lead capture, so visitors can kick off a full benefits
// check without leaving the home page.

import AdmissionsForm from './AdmissionsForm';

export default function InsuranceVerification() {
  return (
    <section className="py-16 lg:py-20 bg-white" aria-labelledby="insurance-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="section-label justify-center mb-3">Insurance Verification</p>
          <h2
            id="insurance-heading"
            className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-3"
          >
            Verify Your Benefits in Minutes
          </h2>
          <p
            className="text-foreground/60 max-w-xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Most major insurance plans cover addiction treatment. Snap a photo of your card
            and we&apos;ll verify your benefits and call you back — typically within 15 minutes.
          </p>
        </div>
        <AdmissionsForm />
      </div>
    </section>
  );
}
