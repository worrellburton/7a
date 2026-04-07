'use client';

import { useAuth } from '@/lib/AuthProvider';
import { useState } from 'react';

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
  const [view, setView] = useState<'grid' | 'list'>('grid');

  if (!user) return null;

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Frameworks</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Key documents and frameworks for the organization.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-warm-bg rounded-lg p-1">
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`}
            aria-label="Grid view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`}
            aria-label="List view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
      </div>

      {view === 'grid' ? (
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
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-warm-bg/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider hidden sm:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Description</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider hidden md:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Type</th>
                <th className="px-6 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {frameworks.map((fw) => (
                <tr key={fw.title} className="border-b border-gray-100 last:border-b-0 hover:bg-warm-bg/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${fw.color} flex items-center justify-center shrink-0`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-foreground">{fw.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{fw.description}</span>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-warm-bg text-xs font-medium text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>{fw.type}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <a
                      href={fw.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground/30 hover:text-primary transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5-6H18m0 0v4.5m0-4.5L10.5 13.5" />
                      </svg>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
