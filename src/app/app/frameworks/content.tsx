'use client';

import { useAuth } from '@/lib/AuthProvider';

const frameworks = [
  {
    title: '7A Financial Framework',
    description: 'Financial planning and budgeting',
    url: 'https://docs.google.com/spreadsheets/d/1nsYO8K7g5JCVefbJCkCYRciaIL585T4mWpQSLXHz148/edit?gid=253297013#gid=253297013',
    color: 'bg-emerald-50 text-emerald-600',
    type: 'Google Sheets',
  },
  {
    title: '7A Human Resource Framework',
    description: 'HR policies and workforce management',
    url: 'https://docs.google.com/spreadsheets/d/1sxULoKNDTrYNP1L-1uJ1gu2-y9bRC7NiUSmyZPgLAXY/edit?gid=445423730#gid=445423730',
    color: 'bg-blue-50 text-blue-600',
    type: 'Google Sheets',
  },
  {
    title: 'Fleet Framework',
    description: 'Vehicle and fleet management',
    url: 'https://docs.google.com/spreadsheets/d/1V3Dx4UsEH2b_v46-W9eKZES50VtnIcO7DuQVUy7Qrkw/edit?gid=1319479473#gid=1319479473',
    color: 'bg-amber-50 text-amber-600',
    type: 'Google Sheets',
  },
];

export default function FrameworksContent() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Frameworks</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Key documents and frameworks for the organization.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {frameworks.map((fw) => (
          <a
            key={fw.title}
            href={fw.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all"
          >
            <div className={`w-10 h-10 rounded-xl ${fw.color} flex items-center justify-center mb-4`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{fw.title}</h3>
            <p className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>{fw.description}</p>
            <div className="mt-3 flex items-center gap-1 text-xs text-foreground/30">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5-6H18m0 0v4.5m0-4.5L10.5 13.5" />
              </svg>
              Opens in {fw.type}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
