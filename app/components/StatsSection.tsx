export default function StatsSection() {
  const stats = [
    { value: '4.9', label: 'Google Rating', suffix: '/5' },
    { value: '90', label: 'Day Programs Available', suffix: '+' },
    { value: '6:1', label: 'Client to Staff Ratio', suffix: '' },
    { value: '24/7', label: 'Admissions Support', suffix: '' },
  ];

  return (
    <section className="py-16 bg-primary" aria-label="Key statistics">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl lg:text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-sans)' }}>
                {stat.value}<span className="text-white/60">{stat.suffix}</span>
              </div>
              <div className="text-white/70 text-sm mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
