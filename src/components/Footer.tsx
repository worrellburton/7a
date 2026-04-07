'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';

/* ── Subtle WebGL particle field ──────────────────────────────────── */

function FooterCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false });
    if (!gl) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const vsSource = `
      attribute vec2 aPos;
      attribute float aAlpha;
      attribute float aSize;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        gl_PointSize = aSize;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;
    const fsSource = `
      precision mediump float;
      varying float vAlpha;
      void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        if (d > 0.5) discard;
        float fade = smoothstep(0.5, 0.15, d);
        gl_FragColor = vec4(0.63, 0.32, 0.18, vAlpha * fade * 0.18);
      }
    `;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const aPos = gl.getAttribLocation(prog, 'aPos');
    const aAlpha = gl.getAttribLocation(prog, 'aAlpha');
    const aSize = gl.getAttribLocation(prog, 'aSize');

    const COUNT = 40;
    const positions = new Float32Array(COUNT * 2);
    const alphas = new Float32Array(COUNT);
    const sizes = new Float32Array(COUNT);
    const velocities = new Float32Array(COUNT * 2);

    for (let i = 0; i < COUNT; i++) {
      positions[i * 2] = Math.random() * 2 - 1;
      positions[i * 2 + 1] = Math.random() * 2 - 1;
      alphas[i] = Math.random() * 0.4 + 0.05;
      sizes[i] = Math.random() * 1.5 + 0.5;
      velocities[i * 2] = (Math.random() - 0.5) * 0.0004;
      velocities[i * 2 + 1] = (Math.random() - 0.5) * 0.0003;
    }

    const posBuf = gl.createBuffer();
    const alphaBuf = gl.createBuffer();
    const sizeBuf = gl.createBuffer();

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let raf: number;
    const draw = () => {
      for (let i = 0; i < COUNT; i++) {
        positions[i * 2] += velocities[i * 2];
        positions[i * 2 + 1] += velocities[i * 2 + 1];
        if (positions[i * 2] < -1 || positions[i * 2] > 1) velocities[i * 2] *= -1;
        if (positions[i * 2 + 1] < -1 || positions[i * 2 + 1] > 1) velocities[i * 2 + 1] *= -1;
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, alphaBuf);
      gl.bufferData(gl.ARRAY_BUFFER, alphas, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(aAlpha);
      gl.vertexAttribPointer(aAlpha, 1, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuf);
      gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(aSize);
      gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.POINTS, 0, COUNT);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}

/* ── Custom Select ────────────────────────────────────────────────── */

const paymentOptions = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'private-pay', label: 'Private Pay' },
  { value: 'other', label: 'Other' },
];

function CustomSelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = paymentOptions.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 bg-white/10 border border-white/10 text-left rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none flex items-center justify-between gap-2 text-white"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected ? selected.label : 'Select'}</span>
        <svg className={`w-4 h-4 text-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul className="absolute z-50 w-full mt-1 bg-[#1a1a1a] rounded-lg shadow-xl border border-white/10 overflow-hidden" role="listbox">
          {paymentOptions.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className={`w-full px-4 py-3 text-left text-sm transition-colors ${value === option.value ? 'bg-primary/20 text-primary font-medium' : 'text-white/70 hover:bg-white/5'}`}
                onClick={() => { onChange(option.value); setOpen(false); }}
                role="option"
                aria-selected={value === option.value}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Combined Contact + Footer ────────────────────────────────────── */

export default function Footer() {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', telephone: '', email: '', paymentMethod: '', consent: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <footer
      className="relative overflow-hidden text-white"
      style={{
        background: 'linear-gradient(180deg, #2a0f0a 0%, #1a1a1a 35%, #111111 100%)',
      }}
      role="contentinfo"
    >
      <FooterCanvas />

      <div className="relative z-10">
        {/* ─── Contact Form Section ─── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 lg:pt-28 pb-16 lg:pb-20">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase mb-4">
              Let Us Help You
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              Take the First Step Towards the Rest of Your Life.
            </h2>
          </div>

          {submitted ? (
            <div className="text-center text-white py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-2xl font-bold mb-2">Thank You</h3>
              <p className="text-white/70">We&apos;ll be in touch with you shortly. Your journey to recovery starts now.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { id: 'firstName', label: 'First Name', type: 'text' },
                  { id: 'lastName', label: 'Last Name', type: 'text' },
                  { id: 'telephone', label: 'Telephone', type: 'tel' },
                  { id: 'email', label: 'Email', type: 'email' },
                ].map((field) => (
                  <div key={field.id}>
                    <label htmlFor={field.id} className="block text-white/70 text-xs font-medium mb-2">{field.label}</label>
                    <input
                      type={field.type}
                      id={field.id}
                      name={field.id}
                      required
                      placeholder={field.label}
                      className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:ring-2 focus:ring-primary focus:outline-none focus:border-transparent"
                      value={formData[field.id as keyof typeof formData] as string}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    />
                  </div>
                ))}
                <div>
                  <label htmlFor="paymentMethod" className="block text-white/70 text-xs font-medium mb-2">Form of Payment</label>
                  <CustomSelect value={formData.paymentMethod} onChange={(val) => setFormData({ ...formData, paymentMethod: val })} />
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  className="mt-1 w-4 h-4 rounded border-white/20 bg-white/10 text-primary focus:ring-primary"
                  checked={formData.consent}
                  onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                />
                <span className="text-white/50 text-xs leading-relaxed">
                  I agree to allow Seven Arrows Recovery to contact me via phone call, text message or email.
                </span>
              </label>

              <div className="text-center pt-2">
                <button type="submit" className="btn-primary px-12">Send</button>
              </div>
            </form>
          )}
        </div>

        {/* ─── Divider ─── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-white/[0.06]" />
        </div>

        {/* ─── Footer Links ─── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            {/* Brand */}
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-3 mb-5" aria-label="Seven Arrows Recovery">
                <img src="/images/logo.png" alt="Seven Arrows Recovery" className="h-14 w-auto brightness-0 invert" />
              </Link>
              <p className="text-white/40 text-xs leading-relaxed">
                A boutique drug and alcohol rehab center nestled at the base of the Swisshelm Mountains in Arizona.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-xs font-semibold tracking-wider uppercase mb-4 text-white/70">Quick Links</h3>
              <ul className="space-y-2.5" role="list">
                {['Who We Are', 'Treatment', 'Our Program', 'Admissions'].map((item) => (
                  <li key={item}>
                    <Link href={`/${item.toLowerCase().replace(/\s+/g, '-')}`} className="text-white/40 text-xs hover:text-primary transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* What We Treat */}
            <div>
              <h3 className="text-xs font-semibold tracking-wider uppercase mb-4 text-white/70">What We Treat</h3>
              <ul className="space-y-2.5" role="list">
                {['Alcohol Addiction', 'Opioid Addiction', 'Dual-Diagnosis', 'Heroin Addiction'].map((item) => (
                  <li key={item}>
                    <Link href={`/what-we-treat/${item.toLowerCase().replace(/\s+/g, '-')}`} className="text-white/40 text-xs hover:text-primary transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
              <h3 className="text-xs font-semibold tracking-wider uppercase mb-4 mt-6 text-white/70">Areas We Serve</h3>
              <ul className="space-y-2.5" role="list">
                {[
                  { name: 'Phoenix', href: '/locations/phoenix' },
                  { name: 'Scottsdale', href: '/locations/scottsdale' },
                  { name: 'Tucson', href: '/locations/tucson' },
                  { name: 'Mesa', href: '/locations/mesa' },
                ].map((loc) => (
                  <li key={loc.name}>
                    <Link href={loc.href} className="text-white/40 text-xs hover:text-primary transition-colors">{loc.name}, AZ</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-xs font-semibold tracking-wider uppercase mb-4 text-white/70">Contact Us</h3>
              <div className="space-y-2.5 text-xs text-white/40">
                <a href="tel:+18669964308" className="block hover:text-primary transition-colors text-sm font-semibold text-white/60">
                  (866) 996-4308
                </a>
                <p>Cochise County, Arizona</p>
                <div className="flex gap-4 pt-2">
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-primary transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
                  </a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-primary transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" /></svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/[0.06] mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-white/25 text-xs">
              &copy; {new Date().getFullYear()} Seven Arrows Recovery. All rights reserved.
            </p>
            <div className="flex gap-5 text-xs text-white/25">
              <Link href="/privacy-policy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
