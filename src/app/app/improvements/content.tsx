'use client';

import { useAuth } from '@/lib/AuthProvider';

const milestones = [
  { day: 7, label: '1 Week', description: 'Physical withdrawal symptoms begin to subside' },
  { day: 14, label: '2 Weeks', description: 'Sleep patterns start to normalize' },
  { day: 30, label: '1 Month', description: 'Mental clarity and energy levels improve' },
  { day: 60, label: '2 Months', description: 'Emotional regulation strengthens significantly' },
  { day: 90, label: '3 Months', description: 'New neural pathways and habits are forming' },
  { day: 180, label: '6 Months', description: 'Confidence and relationships rebuild' },
  { day: 365, label: '1 Year', description: 'A new foundation for life is established' },
];

export default function ImprovementsContent() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Improvements</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Track your recovery milestones and celebrate your progress.
        </p>
      </div>

      {/* Milestones timeline */}
      <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100 mb-6">
        <h2 className="text-lg font-bold text-foreground mb-6">Recovery Milestones</h2>
        <div className="space-y-0">
          {milestones.map((milestone, i) => (
            <div key={milestone.day} className="flex gap-4">
              {/* Timeline line + dot */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-warm-bg border-2 border-gray-200 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-foreground/20" />
                </div>
                {i < milestones.length - 1 && (
                  <div className="w-px flex-1 bg-gray-200 my-1" />
                )}
              </div>
              {/* Content */}
              <div className="pb-6">
                <p className="text-sm font-bold text-foreground">{milestone.label}</p>
                <p className="text-xs text-foreground/50 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  {milestone.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wellness categories */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { title: 'Physical Health', icon: '🏃', items: ['Sleep quality', 'Energy levels', 'Appetite', 'Exercise tolerance'] },
          { title: 'Mental Health', icon: '🧠', items: ['Clarity of thought', 'Anxiety levels', 'Mood stability', 'Focus & attention'] },
          { title: 'Emotional Health', icon: '💛', items: ['Emotional regulation', 'Self-awareness', 'Healthy expression', 'Stress management'] },
          { title: 'Social Health', icon: '🤝', items: ['Relationships', 'Communication', 'Boundaries', 'Support network'] },
        ].map((cat) => (
          <div key={cat.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">{cat.icon}</span>
              <h3 className="text-sm font-bold text-foreground">{cat.title}</h3>
            </div>
            <ul className="space-y-2">
              {cat.items.map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-warm-bg border border-gray-200 shrink-0" />
                  <span className="text-xs text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
