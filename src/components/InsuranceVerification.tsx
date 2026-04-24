// Combined "Let Us Help You" + insurance-verification block. Sits
// directly above the footer site-wide via the (site) layout, replacing
// both the standalone homepage InsuranceVerification slot and the
// contact form that used to live embedded inside the Footer.

import AdmissionsForm from './AdmissionsForm';

export default function InsuranceVerification() {
  return (
    <section className="py-16 lg:py-24 bg-warm-bg" aria-labelledby="insurance-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="section-label justify-center mb-3">Let Us Help You</p>
          <h2
            id="insurance-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4"
          >
            Take the First Step Towards the Rest of Your Life.
          </h2>
          <p
            className="text-foreground/60 max-w-xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Most major insurance plans cover addiction treatment. Share your details
            (and snap a photo of your card if you have one) and we&apos;ll verify your
            benefits and call you back — typically within 15 minutes.
          </p>
        </div>
        <AdmissionsForm />
      </div>
    </section>
  );
}
