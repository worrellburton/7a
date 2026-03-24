import { useState } from "react";

const reviews = [
  {
    name: "Michael T.",
    date: "2 months ago",
    rating: 5,
    text: "Seven Arrows saved my life. The staff genuinely cares about every person who walks through the door. The small group setting made me feel like I wasn't just a number. The equine therapy and outdoor activities in the mountains were transformative. I'm 8 months sober now and I owe it to this incredible team.",
  },
  {
    name: "Sarah K.",
    date: "3 months ago",
    rating: 5,
    text: "My son attended Seven Arrows and the difference has been night and day. The communication from the clinical team was outstanding — they kept us informed every step of the way. The TraumAddiction approach helped him address things he'd been carrying for years. We finally have our son back.",
  },
  {
    name: "James R.",
    date: "1 month ago",
    rating: 5,
    text: "I've been to three other treatment centers before finding Seven Arrows. This place is different. The 6:1 staff ratio means you actually get attention. The therapists here don't just follow a script — they build real treatment plans. The setting at the base of the Swisshelm Mountains helped me find peace I didn't know was possible.",
  },
  {
    name: "Amanda L.",
    date: "4 months ago",
    rating: 5,
    text: "From the moment I called, the admissions team made me feel safe. They verified my insurance in minutes and I was in treatment within 48 hours. The clinical program is world-class but it's the warmth and compassion of every single staff member that makes Seven Arrows truly special.",
  },
  {
    name: "David H.",
    date: "2 months ago",
    rating: 5,
    text: "The dual diagnosis program here changed everything for me. For years I was self-medicating my anxiety and depression. The clinical team helped me understand the connection between my trauma and my substance use. I'm now in recovery and managing my mental health for the first time in my adult life.",
  },
  {
    name: "Christina M.",
    date: "5 months ago",
    rating: 5,
    text: "As a veteran, I was skeptical about rehab. Seven Arrows understood my background and tailored treatment accordingly. The body-based trauma work was something I'd never experienced before and it unlocked healing I didn't think was possible. I recommend this place to every veteran struggling with addiction.",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? "text-yellow-400" : "text-gray-300"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function GoogleReviews() {
  const [visibleCount, setVisibleCount] = useState(3);
  const showingAll = visibleCount >= reviews.length;

  return (
    <section
      className="py-20 lg:py-28 bg-white"
      aria-labelledby="reviews-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="section-label mb-4 justify-center">What Our Clients Say</p>
          <h2
            id="reviews-heading"
            className="text-3xl lg:text-5xl font-bold text-foreground mb-6"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Real Stories of Recovery
          </h2>

          {/* Aggregate rating */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <GoogleIcon />
            <span
              className="text-4xl font-bold text-foreground"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              4.9
            </span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className="w-6 h-6 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
          <p
            className="text-foreground/60 text-sm"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Based on 27 Google Reviews
          </p>
        </div>

        {/* Review Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.slice(0, visibleCount).map((review) => (
            <div
              key={review.name}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col"
            >
              {/* Reviewer header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm"
                  aria-hidden="true"
                >
                  {review.name.charAt(0)}
                </div>
                <div>
                  <p
                    className="font-semibold text-foreground text-sm"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {review.name}
                  </p>
                  <p
                    className="text-foreground/50 text-xs"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {review.date}
                  </p>
                </div>
                <GoogleIcon />
              </div>

              {/* Stars */}
              <StarRating rating={review.rating} />

              {/* Review text */}
              <p
                className="mt-3 text-foreground/70 text-sm leading-relaxed flex-1"
                style={{ fontFamily: "var(--font-body)" }}
              >
                &ldquo;{review.text}&rdquo;
              </p>
            </div>
          ))}
        </div>

        {/* Show more / Show less */}
        {reviews.length > 3 && (
          <div className="text-center mt-10">
            <button
              type="button"
              onClick={() => setVisibleCount(showingAll ? 3 : reviews.length)}
              className="btn-outline"
            >
              {showingAll ? "Show Less" : `Show All ${reviews.length} Reviews`}
            </button>
          </div>
        )}

        {/* CTA to leave a review */}
        <div className="text-center mt-8">
          <a
            href="https://g.page/r/sevenarrowsrecovery/review"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:text-primary-dark text-sm font-medium transition-colors"
            style={{ fontFamily: "var(--font-body)" }}
          >
            <GoogleIcon />
            Leave us a review on Google
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
