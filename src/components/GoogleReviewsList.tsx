'use client';

import { useState } from 'react';
import { ReviewBubble, type ReviewBubbleData } from './ReviewBubble';

export function GoogleReviewsList({ reviews }: { reviews: ReviewBubbleData[] }) {
  const [visibleCount, setVisibleCount] = useState(3);
  const total = reviews.length;
  const showingAll = visibleCount >= total;

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 max-w-6xl mx-auto">
        {reviews.slice(0, visibleCount).map((review, i) => (
          <ReviewBubble key={`${review.name}-${i}`} review={review} />
        ))}
      </div>

      {total > 3 && (
        <div className="text-center mt-12">
          <button
            type="button"
            onClick={() => setVisibleCount(showingAll ? 3 : total)}
            className="btn-outline"
          >
            {showingAll ? 'Show Less' : `Show All ${total} Reviews`}
          </button>
        </div>
      )}
    </>
  );
}
