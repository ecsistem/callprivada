import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, BarChart2, ArrowRight, Check, Users, Video, Menu, X, Banknote } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { formatPrice } from '../lib/currency';
import type { Plan } from '../services/subscriptionService';

const fetchPublicPlans = () => api.get('/plans').then(r => r.data.data as Plan[]);

/* ── Marquee ───────────────────────────────────────────────── */
const MARQUEE_ITEMS = [
  '● CALL PRIVADA', '✦ CHAMADAS PRIVADAS', '● MONETIZE AGORA',
  '✦ PIX AUTOMÁTICO', '● FUNIS DE VENDA', '✦ SEGURO E RÁPIDO',
  '● A PARTIR DE R$99', '✦ ANALYTICS',
];

function MarqueeBand({ direction = 1, top, rotate, variant = 'dark' }: {
  direction?: 1 | -1; top: string; rotate: string; variant?: 'dark' | 'pink';
}) {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  const bandStyle: React.CSSProperties = variant === 'pink'
    ? { background: 'rgba(254,1,92,0.12)', borderTop: '1px solid rgba(254,1,92,0.35)', borderBottom: '1px solid rgba(254,1,92,0.35)' }
    : { background: 'rgba(18,2,8,0.75)', borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' };
  return (
    <div className="absolute w-[220vw] overflow-hidden pointer-events-none select-none backdrop-blur-sm"
      style={{ top, left: '-60vw', transform: `rotate(${rotate})`, zIndex: 5, ...bandStyle }}>
      <div className="flex whitespace-nowrap py-3"
        style={{ animation: `marqueeScroll${direction > 0 ? 'Right' : 'Left'} 32s linear infinite` }}>
        {items.map((t, i) => (
          <span key={i} className="inline-flex items-center px-5 text-[11px] font-black tracking-[0.2em] uppercase shrink-0"
            style={{ color: variant === 'pink' ? (i % 2 === 0 ? '#FE015C' : 'rgba(255,255,255,0.8)') : (i % 2 === 0 ? 'rgba(255,255,255,0.55)' : '#FE015C') }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Hero feature mini-cards ───────────────────────────────── */
const FEATURES = [
  { icon: Shield,    title: 'Privado e seguro', desc: 'Dados sempre protegidos.' },
  { icon: Zap,       title: 'Rápido e fácil',   desc: 'Comece em segundos.' },
  { icon: BarChart2, title: 'Monetize mais',     desc: 'Transforme calls em receita.' },
];
const TRUST = ['Sem cartão de crédito', 'Cancelamento fácil', 'Suporte 24/7'];

/* ── Nav links ─────────────────────────────────────────────── */
const NAV_LINKS = [
  { label: 'Funcionalidades', href: '#features' },
  { label: 'Como funciona',   href: '#how' },
  { label: 'Preços',          href: '#pricing' },
];

/* ═══════════════════════════════════════════════════════════ */
const INTERVAL_LABEL: Record<string, string> = {
  MONTHLY: '/mês', SEMIANNUALLY: '/6 meses', ANNUALLY: '/ano',
};

function PricingCardSkeleton() {
  return (
    <div className="pricing-card rounded-2xl sm:rounded-3xl border border-white/10 bg-[#1c0510] p-6 sm:p-8 flex flex-col animate-pulse">
      <div className="h-4 w-16 bg-white/8 rounded mb-4" />
      <div className="h-10 w-28 bg-white/8 rounded mb-6" />
      {[1,2,3,4].map(i => <div key={i} className="h-3 w-full bg-white/5 rounded mb-3" />)}
      <div className="mt-auto h-11 w-full bg-white/8 rounded-2xl" />
    </div>
  );
}

function DynamicPricingCards({ navigate }: { navigate: (to: string) => void }) {
  const { data: plans = [], isLoading } = useQuery({ queryKey: ['public-plans'], queryFn: fetchPublicPlans });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 max-w-3xl mx-auto">
        <PricingCardSkeleton /><PricingCardSkeleton />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <p className="text-center text-gray-600 text-sm py-8">Planos em breve.</p>
    );
  }

  return (
    <div className={`grid grid-cols-1 ${plans.length === 1 ? 'max-w-sm mx-auto' : 'md:grid-cols-2 max-w-3xl mx-auto'} gap-4 sm:gap-5`}>
      {plans.map((plan, idx) => {
        const isPrimary = idx === plans.length - 1 && plans.length > 1;
        const price = formatPrice(plan.price_cents, 'BRL');
        const interval = INTERVAL_LABEL[plan.interval] || '/mês';
        const limits = [
          plan.max_calls > 0 ? `Até ${plan.max_calls} funis` : 'Funis ilimitados',
          plan.max_videos > 0 ? `Até ${plan.max_videos} vídeos` : 'Vídeos ilimitados',
          plan.max_presells > 0 ? `Até ${plan.max_presells} presells` : 'Presells ilimitados',
          'Pagamentos via PIX',
          'Analytics completo',
          'Suporte prioritário',
        ];
        return isPrimary ? (
          <div key={plan.id} className="pricing-card relative rounded-2xl sm:rounded-3xl border border-[#FE015C]/40 bg-[#1c0510] p-6 sm:p-8 flex flex-col overflow-hidden hover:border-[#FE015C]/60 transition-all duration-300 shadow-xl shadow-[#FE015C]/10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FE015C]/8 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-4 right-4 bg-[#FE015C] text-white text-[10px] font-black px-2.5 py-1 rounded-full tracking-wide">POPULAR</div>
            <div className="mb-6 relative">
              <p className="text-[#FE015C] text-sm font-medium mb-1">{plan.name}</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl sm:text-5xl font-black text-white">{price}</span>
                <span className="text-gray-400 text-sm mb-1.5">{interval}</span>
              </div>
            </div>
            <ul className="space-y-3 flex-1 mb-8 relative">
              {limits.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-200">
                  <div className="w-4 h-4 rounded-full bg-[#FE015C]/20 border border-[#FE015C]/40 flex items-center justify-center shrink-0">
                    <Check size={9} className="text-[#FE015C]" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => navigate('/register')}
              className="relative w-full py-3.5 rounded-2xl font-bold text-sm bg-[#FE015C] hover:bg-[#FD267D] active:scale-[0.98] text-white transition-all shadow-lg shadow-[#FE015C]/30">
              Começar com {plan.name}
            </button>
          </div>
        ) : (
          <div key={plan.id} className="pricing-card relative rounded-2xl sm:rounded-3xl border border-white/10 bg-[#1c0510] p-6 sm:p-8 flex flex-col hover:border-white/20 transition-all duration-300">
            <div className="mb-6">
              <p className="text-gray-400 text-sm font-medium mb-1">{plan.name}</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl sm:text-5xl font-black text-white">{price}</span>
                <span className="text-gray-500 text-sm mb-1.5">{interval}</span>
              </div>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {limits.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="w-4 h-4 rounded-full bg-white/8 border border-white/12 flex items-center justify-center shrink-0">
                    <Check size={9} className="text-gray-400" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => navigate('/register')}
              className="w-full py-3.5 rounded-2xl font-bold text-sm border border-white/15 hover:border-white/30 hover:bg-white/5 text-white transition-all">
              Começar agora
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const heroRef      = useRef<HTMLDivElement>(null);
  const heroBgRef    = useRef<HTMLImageElement>(null);
  const featuresRef  = useRef<HTMLElement>(null);
  const howRef       = useRef<HTMLElement>(null);
  const pricingRef   = useRef<HTMLElement>(null);
  const ctaRef       = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Parallax hero bg ────────────────────────────────────── */
  useEffect(() => {
    const onParallax = () => {
      if (heroBgRef.current) {
        heroBgRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`;
      }
    };
    window.addEventListener('scroll', onParallax, { passive: true });
    return () => window.removeEventListener('scroll', onParallax);
  }, []);

  /* ── Scroll-reveal via IntersectionObserver ─────────────── */
  useEffect(() => {
    const GROUPS: [React.RefObject<HTMLElement | HTMLDivElement | null>, string, number][] = [
      [featuresRef, '.section-title, .bento-card',   80],
      [howRef,      '.section-title, .how-card',     100],
      [pricingRef,  '.section-title, .pricing-card', 120],
      [ctaRef,      '.cta-inner',                    0],
    ];

    // set initial hidden state
    const allEls: HTMLElement[] = [];
    GROUPS.forEach(([ref, sel]) => {
      if (!ref.current) return;
      ref.current.querySelectorAll<HTMLElement>(sel).forEach(el => {
        el.classList.add('reveal-hidden');
        allEls.push(el);
      });
    });

    const reveal = (els: HTMLElement[], staggerMs: number) => {
      els.forEach((el, i) => {
        setTimeout(() => {
          el.classList.remove('reveal-hidden');
          el.classList.add('reveal-visible');
        }, i * staggerMs);
      });
    };

    const observers: IntersectionObserver[] = [];

    GROUPS.forEach(([ref, sel, staggerMs]) => {
      if (!ref.current) return;
      const obs = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) return;
        const els = Array.from(ref.current!.querySelectorAll<HTMLElement>(sel));
        reveal(els, staggerMs);
        obs.disconnect();
      }, { threshold: 0.05, rootMargin: '0px 0px -60px 0px' });
      obs.observe(ref.current);
      observers.push(obs);
    });

    // fallback: se IO não disparar em 2s, mostra tudo
    const fallback = setTimeout(() => {
      allEls.forEach(el => {
        if (el.classList.contains('reveal-hidden')) {
          el.classList.remove('reveal-hidden');
          el.classList.add('reveal-visible');
        }
      });
    }, 2000);

    return () => {
      observers.forEach(o => o.disconnect());
      clearTimeout(fallback);
    };
  }, []);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#120208] text-white font-sans overflow-x-hidden">

      {/* ══ NAV ════════════════════════════════════════════════════ */}
      <nav className={`nav-entry fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#120208]/95 backdrop-blur-2xl shadow-xl shadow-black/30'
          : 'bg-[#120208]/60 backdrop-blur-lg'
      }`}>
        <div className="w-full px-4 sm:px-6 lg:px-10 flex items-center justify-between h-[60px] sm:h-[68px]">

          {/* Logo */}
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 shrink-0 group">
            <img src="/logo.png" alt="CallPrivada" className="w-8 h-8 object-contain transition-transform group-hover:scale-105" />
            <span className="font-black text-base sm:text-[17px] tracking-tight">
              Call <span className="text-[#FE015C]">Privada</span>
            </span>
          </button>

          {/* Desktop links — centradas */}
          <div className="hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map(l => (
              <button key={l.label} onClick={() => scrollTo(l.href)}
                className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-xl hover:bg-white/6 font-medium">
                {l.label}
              </button>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button onClick={() => navigate('/login')}
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-xl hover:bg-white/6">
              Entrar
            </button>
            <button onClick={() => navigate('/register')}
              className="text-sm font-bold bg-[#FE015C] hover:bg-[#FD267D] active:scale-95 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-[#FE015C]/25 whitespace-nowrap">
              Começar agora
            </button>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(v => !v)}
            className="md:hidden w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/6 active:bg-white/10">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile drawer */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="bg-[#120208]/98 backdrop-blur-2xl px-4 py-4">
            <div className="space-y-0.5 mb-4">
              {NAV_LINKS.map(l => (
                <button key={l.label} onClick={() => scrollTo(l.href)}
                  className="w-full text-left text-sm font-medium text-gray-300 hover:text-white px-4 py-3 rounded-xl hover:bg-white/5 transition-colors">
                  {l.label}
                </button>
              ))}
            </div>
            <div className="space-y-2 pt-3 border-t border-white/5">
              <button onClick={() => { setMobileOpen(false); navigate('/login'); }}
                className="w-full text-sm font-medium text-gray-300 hover:text-white px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                Entrar na conta
              </button>
              <button onClick={() => { setMobileOpen(false); navigate('/register'); }}
                className="w-full text-sm font-bold bg-[#FE015C] hover:bg-[#FD267D] text-white px-4 py-3.5 rounded-xl transition-all shadow-lg shadow-[#FE015C]/25 active:scale-[0.98]">
                Começar agora →
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ══ HERO ═══════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden" ref={heroRef}>

        <div className="absolute inset-0">
          <img ref={heroBgRef} src="/hero-bg.jpg" alt=""
            className="absolute inset-0 w-full h-full object-cover object-center will-change-transform" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#120208] via-[#120208]/85 to-[#120208]/20 sm:to-[#120208]/10" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#120208] to-transparent" />
          {/* mobile dark overlay so text is always readable */}
          <div className="absolute inset-0 bg-[#120208]/60 sm:hidden" />
        </div>

        {/* Decorative circles */}
        <div className="absolute top-16 right-10 w-14 h-14 rounded-full bg-[#FE015C]/20 blur-sm hidden lg:block" />
        <div className="absolute bottom-20 left-6 w-20 h-20 rounded-full bg-[#FE015C]/10 blur-md hidden lg:block" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-28 sm:pt-32 pb-16">
          <div className="max-w-[600px]">

            {/* Badge */}
            <div className="hero-anim inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#FE015C] animate-pulse" />
              <span className="text-gray-300 text-[10px] sm:text-xs tracking-widest uppercase font-medium">
                Plataforma de Chamadas Privadas
              </span>
            </div>

            {/* Headline */}
            <h1 className="hero-anim text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] mb-5">
              <span className="text-white">Suas chamadas.</span>
              <br />
              <span className="text-[#FE015C]">Suas regras.</span>
            </h1>

            <p className="hero-anim text-gray-400 text-sm sm:text-base leading-relaxed mb-8 max-w-[440px]">
              Crie videochamadas privadas, defina suas regras e monetize do seu jeito. Totalmente{' '}
              <span className="text-[#FE015C]">seguro, rápido e sem complicação.</span>
            </p>

            {/* Feature mini-cards */}
            <div className="hero-anim grid grid-cols-3 gap-2 sm:gap-3 mb-8">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white/[0.04] border border-white/10 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 backdrop-blur-sm">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#FE015C]/15 border border-[#FE015C]/20 flex items-center justify-center mb-2">
                    <Icon size={13} className="text-[#FE015C]" />
                  </div>
                  <p className="text-white font-bold text-[10px] sm:text-xs leading-snug">{title}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5 leading-relaxed hidden sm:block">{desc}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="hero-anim flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-7">
              <button onClick={() => navigate('/register')}
                className="flex items-center gap-3 bg-[#FE015C] hover:bg-[#FD267D] text-white font-bold px-6 py-4 rounded-2xl transition-all shadow-lg shadow-[#FE015C]/30 text-sm w-full sm:w-auto justify-center sm:justify-start">
                <span className="w-7 h-7 rounded-full bg-black/20 flex items-center justify-center shrink-0">
                  <ArrowRight size={14} />
                </span>
                Comece agora
              </button>
              <p className="text-xs text-gray-400 leading-snug max-w-[180px] hidden sm:block">
                Junte-se a milhares de criadores que já usam{' '}
                <span className="text-[#FE015C] font-medium">Call Privada.</span>
              </p>
            </div>

            {/* Trust bar */}
            <div className="hero-anim flex flex-wrap items-center gap-x-5 gap-y-2">
              {TRUST.map(t => (
                <div key={t} className="flex items-center gap-1.5 text-gray-500 text-[11px] sm:text-xs">
                  <Check size={11} className="text-[#FE015C]" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating cards — desktop only */}
        <div className="absolute right-6 top-1/3 z-20 hidden xl:flex flex-col gap-3">
          <div className="bg-[#1c0510]/80 border border-white/10 rounded-2xl p-4 backdrop-blur-xl w-44">
            <div className="w-9 h-9 rounded-xl bg-[#FE015C]/15 border border-[#FE015C]/20 flex items-center justify-center mb-3">
              <Users size={16} className="text-[#FE015C]" />
            </div>
            <p className="text-white text-2xl font-black">+12K</p>
            <p className="text-gray-400 text-xs mt-0.5">Criadores ativos</p>
          </div>
        </div>
        <div className="absolute bottom-24 right-8 z-20 hidden xl:flex items-center gap-2.5 bg-[#1c0510]/80 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-xl">
          <div className="w-5 h-5 rounded-full border-2 border-[#FE015C] flex items-center justify-center shrink-0">
            <Check size={10} className="text-[#FE015C]" />
          </div>
          <span className="text-white text-sm font-medium">Pagamentos automatizados</span>
        </div>
      </section>

      {/* ══ MARQUEE SEPARATOR ═════════════════════════════════════ */}
      <div className="relative overflow-hidden py-1 bg-[#120208]">
        <MarqueeBand direction={1}  top="0"    rotate="-2deg" variant="dark" />
        <MarqueeBand direction={-1} top="52px" rotate="-2deg" variant="pink" />
        <div style={{ height: '110px' }} />
      </div>

      {/* ══ BENTO FEATURES ════════════════════════════════════════ */}
      <section id="features" ref={featuresRef} className="px-4 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto">
        <h2 className="section-title text-2xl sm:text-4xl font-black text-center mb-2">
          Por que escolher a <span className="text-[#FE015C]">CallPrivada?</span>
        </h2>
        <p className="text-gray-500 text-sm text-center mb-10 sm:mb-14">
          Tudo que você precisa para monetizar suas chamadas.
        </p>

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:auto-rows-[200px]">

          {/* Card 1 — Funis (grande: col-2 × row-2 no desktop) */}
          <div className="bento-card sm:col-span-2 lg:col-span-2 lg:row-span-2 min-h-[280px] sm:min-h-[360px] lg:min-h-0 relative rounded-2xl sm:rounded-3xl border border-white/10 bg-[#1c0510] overflow-hidden group hover:border-[#FE015C]/30 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FE015C]/5 via-transparent to-transparent" />
            <div className="absolute inset-0 p-5 sm:p-7 flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-[#FE015C]/20 border border-[#FE015C]/30 flex items-center justify-center shrink-0">
                  <Video size={17} className="text-white" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2.5 w-24 rounded-full bg-white/20" />
                  <div className="h-2 w-16 rounded-full bg-white/10" />
                </div>
              </div>
              <div className="flex-1 rounded-2xl bg-[#120208] border border-white/5 p-3 sm:p-4 flex flex-col gap-3 overflow-hidden min-h-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#FE015C]/30 shrink-0" />
                  <div className="h-2 w-20 rounded-full bg-white/15" />
                  <div className="ml-auto h-2 w-10 rounded-full bg-white/8" />
                </div>
                <div className="flex-1 rounded-xl bg-white/[0.03] flex items-center justify-center min-h-[60px]">
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-[#FE015C]/20 mx-auto flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-[#FE015C] animate-pulse" />
                    </div>
                    <div className="h-2 w-24 rounded-full bg-white/10 mx-auto" />
                    <div className="h-2 w-16 rounded-full bg-white/6 mx-auto" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-7 rounded-xl bg-[#FE015C]/25 border border-[#FE015C]/30" />
                  <div className="flex-1 h-7 rounded-xl bg-white/5" />
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 inset-x-0 p-5 sm:p-6 bg-gradient-to-t from-[#1c0510] via-[#1c0510]/80 to-transparent">
              <p className="font-black text-base sm:text-lg text-white">Funis de chamada</p>
              <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Vídeos gravados que parecem chamadas ao vivo. Seus leads não percebem a diferença.</p>
            </div>
          </div>

          {/* Card 2 — Sem mensalidade */}
          <div className="bento-card relative rounded-2xl sm:rounded-3xl border border-white/10 bg-[#1c0510] overflow-hidden group hover:border-[#FE015C]/30 transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between min-h-[160px] lg:min-h-0">
            <div className="absolute inset-0 bg-gradient-to-b from-[#FE015C]/4 to-transparent" />
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-[#FE015C]/15 border border-[#FE015C]/20 flex items-center justify-center mb-4">
                <Banknote size={16} className="text-white" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-12 rounded-lg bg-[#FE015C]/30 flex items-center justify-center shrink-0">
                    <span className="text-[#FE015C] text-xs font-black">10%</span>
                  </div>
                  <div className="h-2 flex-1 rounded-full bg-white/8" />
                </div>
                <div className="h-2 w-3/4 rounded-full bg-white/5" />
              </div>
            </div>
            <div className="relative">
              <p className="font-black text-base text-white">Sem mensalidade</p>
              <p className="text-gray-500 text-xs mt-0.5">Apenas 10% por venda. Zero custo fixo.</p>
            </div>
          </div>

          {/* Card 3 — PIX */}
          <div className="bento-card relative rounded-2xl sm:rounded-3xl border border-white/10 bg-[#1c0510] overflow-hidden group hover:border-[#FE015C]/30 transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between min-h-[160px] lg:min-h-0">
            <div className="absolute inset-0 bg-gradient-to-b from-[#FE015C]/4 to-transparent" />
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-[#FE015C]/15 border border-[#FE015C]/20 flex items-center justify-center mb-4">
                <Zap size={16} className="text-white" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#FE015C]/20 shrink-0" />
                <div className="space-y-1 flex-1">
                  <div className="h-2 rounded-full bg-white/15 w-full" />
                  <div className="h-2 rounded-full bg-white/8 w-2/3" />
                </div>
                <div className="h-5 w-10 rounded-lg bg-green-500/25 flex items-center justify-center shrink-0">
                  <Check size={10} className="text-green-400" />
                </div>
              </div>
            </div>
            <div className="relative">
              <p className="font-black text-base text-white">PIX automático</p>
              <p className="text-gray-500 text-xs mt-0.5">Receba na hora, sem burocracia.</p>
            </div>
          </div>

          {/* Card 4 — Analytics (col-2 no desktop) */}
          <div className="bento-card sm:col-span-2 relative rounded-2xl sm:rounded-3xl border border-white/10 bg-[#1c0510] overflow-hidden group hover:border-[#FE015C]/30 transition-all duration-300 p-5 sm:p-6 flex gap-4 sm:gap-6 min-h-[160px] lg:min-h-0">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FE015C]/5 to-transparent" />
            <div className="relative flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#FE015C]/15 border border-[#FE015C]/20 flex items-center justify-center mb-4">
                <BarChart2 size={16} className="text-white" />
              </div>
              <p className="font-black text-base text-white">Analytics em tempo real</p>
              <p className="text-gray-500 text-xs mt-0.5">Visitas, conversões e receita no dashboard.</p>
            </div>
            <div className="relative flex items-end gap-1 sm:gap-1.5 pr-1 pb-1 shrink-0">
              {[40, 65, 45, 80, 55, 90, 70, 100, 75, 88].map((h, i) => (
                <div key={i} className="w-3 sm:w-4 rounded-t-md" style={{
                  height: `${h}%`,
                  background: i >= 7 ? '#FE015C' : `rgba(254,1,92,${0.15 + i * 0.05})`,
                }} />
              ))}
            </div>
          </div>

          {/* Card 5 — Segurança */}
          <div className="bento-card relative rounded-2xl sm:rounded-3xl border border-white/10 bg-[#1c0510] overflow-hidden group hover:border-[#FE015C]/30 transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between min-h-[160px] lg:min-h-0">
            <div className="absolute inset-0 bg-gradient-to-b from-[#FE015C]/4 to-transparent" />
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-[#FE015C]/15 border border-[#FE015C]/20 flex items-center justify-center mb-4">
                <Shield size={16} className="text-white" />
              </div>
              <div className="flex flex-wrap gap-1">
                {['Criptografado', 'HTTPS', 'JWT'].map(t => (
                  <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FE015C]/15 text-[#FE015C] border border-[#FE015C]/20">{t}</span>
                ))}
              </div>
            </div>
            <div className="relative">
              <p className="font-black text-base text-white">Privado e seguro</p>
              <p className="text-gray-500 text-xs mt-0.5">Seus dados protegidos sempre.</p>
            </div>
          </div>

        </div>
      </section>

      {/* ══ Como funciona ══════════════════════════════════════════ */}
      <section id="how" ref={howRef} className="px-4 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto">
        <div className="section-title text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FE015C]" />
            <span className="text-gray-400 text-xs tracking-widest uppercase font-medium">Passo a passo</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black mb-3">Como funciona</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">Do cadastro ao primeiro pagamento em minutos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 relative">

          {/* Linha conectora — só desktop */}
          <div className="hidden md:block absolute top-[72px] left-[calc(16.6%+24px)] right-[calc(16.6%+24px)] h-px bg-gradient-to-r from-[#FE015C]/40 via-[#FE015C]/20 to-[#FE015C]/40 z-0" />

          {/* Passo 1 — Cadastro */}
          <div className="how-card relative rounded-2xl sm:rounded-3xl border border-white/10 bg-[#1c0510] overflow-hidden group hover:border-[#FE015C]/35 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-b from-[#FE015C]/6 via-transparent to-transparent" />

            {/* Visual skeleton — formulário de cadastro */}
            <div className="relative p-5 sm:p-6 pb-0">
              <div className="flex items-center gap-3 mb-5 relative z-10">
                <div className="w-11 h-11 rounded-2xl bg-[#FE015C] flex items-center justify-center text-white font-black text-base shadow-lg shadow-[#FE015C]/40 shrink-0">1</div>
                <div className="h-px flex-1 bg-gradient-to-r from-[#FE015C]/30 to-transparent md:hidden" />
              </div>
              <div className="rounded-2xl bg-[#120208] border border-white/6 p-4 mb-0 space-y-2.5 overflow-hidden" style={{ height: '160px' }}>
                <div className="h-2 w-1/2 rounded-full bg-white/20" />
                <div className="h-9 rounded-xl bg-white/5 border border-white/10 flex items-center px-3 gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-white/15 shrink-0" />
                  <div className="h-2 w-24 rounded-full bg-white/10" />
                </div>
                <div className="h-9 rounded-xl bg-white/5 border border-white/10 flex items-center px-3 gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-white/15 shrink-0" />
                  <div className="h-2 w-20 rounded-full bg-white/10" />
                </div>
                <div className="h-9 rounded-xl bg-[#FE015C]/20 border border-[#FE015C]/30 flex items-center justify-center gap-2">
                  <div className="h-2 w-20 rounded-full bg-[#FE015C]/60" />
                </div>
              </div>
            </div>

            <div className="relative p-5 sm:p-6 pt-4">
              <p className="font-black text-base sm:text-lg text-white mb-1">Cadastro rápido</p>
              <p className="text-gray-500 text-sm leading-snug">Crie sua conta grátis em segundos. Zero burocracia.</p>
            </div>
          </div>

          {/* Passo 2 — Configure */}
          <div className="how-card relative rounded-2xl sm:rounded-3xl border border-white/10 bg-[#1c0510] overflow-hidden group hover:border-[#FE015C]/35 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-b from-[#FE015C]/6 via-transparent to-transparent" />

            {/* Visual skeleton — configuração de chamada */}
            <div className="relative p-5 sm:p-6 pb-0">
              <div className="flex items-center gap-3 mb-5 relative z-10">
                <div className="w-11 h-11 rounded-2xl bg-[#FE015C] flex items-center justify-center text-white font-black text-base shadow-lg shadow-[#FE015C]/40 shrink-0">2</div>
                <div className="h-px flex-1 bg-gradient-to-r from-[#FE015C]/30 to-transparent md:hidden" />
              </div>
              <div className="rounded-2xl bg-[#120208] border border-white/6 p-4 space-y-2.5 overflow-hidden" style={{ height: '160px' }}>
                {/* upload area */}
                <div className="h-[68px] rounded-xl border border-dashed border-[#FE015C]/30 bg-[#FE015C]/4 flex items-center justify-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-[#FE015C]/25 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-sm bg-[#FE015C]/70" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 w-20 rounded-full bg-white/20" />
                    <div className="h-1.5 w-14 rounded-full bg-white/10" />
                  </div>
                </div>
                {/* valor PIX */}
                <div className="flex gap-2">
                  <div className="flex-1 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center px-3">
                    <div className="h-1.5 w-14 rounded-full bg-white/15" />
                  </div>
                  <div className="w-24 h-8 rounded-xl bg-[#FE015C]/20 border border-[#FE015C]/25 flex items-center justify-center">
                    <div className="h-1.5 w-12 rounded-full bg-[#FE015C]/50" />
                  </div>
                </div>
                {/* link */}
                <div className="h-7 rounded-xl bg-white/[0.03] border border-white/5 flex items-center px-3 gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FE015C]/30 shrink-0" />
                  <div className="h-1.5 w-32 rounded-full bg-white/12" />
                  <div className="ml-auto w-5 h-5 rounded-lg bg-white/8 shrink-0" />
                </div>
              </div>
            </div>

            <div className="relative p-5 sm:p-6 pt-4">
              <p className="font-black text-base sm:text-lg text-white mb-1">Configure sua call</p>
              <p className="text-gray-500 text-sm leading-snug">Upload do vídeo, defina o valor do PIX e compartilhe o link.</p>
            </div>
          </div>

          {/* Passo 3 — Monetize */}
          <div className="how-card relative rounded-2xl sm:rounded-3xl border border-white/10 bg-[#1c0510] overflow-hidden group hover:border-[#FE015C]/35 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-b from-[#FE015C]/6 via-transparent to-transparent" />

            {/* Visual skeleton — pagamento PIX */}
            <div className="relative p-5 sm:p-6 pb-0">
              <div className="flex items-center gap-3 mb-5 relative z-10">
                <div className="w-11 h-11 rounded-2xl bg-[#FE015C] flex items-center justify-center text-white font-black text-base shadow-lg shadow-[#FE015C]/40 shrink-0">3</div>
                <div className="h-px flex-1 bg-gradient-to-r from-[#FE015C]/30 to-transparent md:hidden" />
              </div>
              <div className="rounded-2xl bg-[#120208] border border-white/6 p-4 space-y-2.5 overflow-hidden" style={{ height: '160px' }}>
                {/* QR + info */}
                <div className="flex gap-3 items-start">
                  <div className="w-16 h-16 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                    <div className="w-10 h-10 grid grid-cols-3 gap-0.5">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className={`rounded-[2px] ${[0,2,4,6,8].includes(i) ? 'bg-[#FE015C]/60' : 'bg-white/20'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-2 w-20 rounded-full bg-white/20" />
                    <div className="h-4 w-16 rounded-lg bg-[#FE015C]/20 border border-[#FE015C]/25 flex items-center justify-center">
                      <div className="h-1.5 w-10 rounded-full bg-[#FE015C]/50" />
                    </div>
                    <div className="h-2 w-24 rounded-full bg-white/10" />
                  </div>
                </div>
                {/* status pago */}
                <div className="h-9 rounded-xl bg-green-500/10 border border-green-500/25 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500/30 border border-green-500/50 flex items-center justify-center shrink-0">
                    <Check size={9} className="text-green-400" />
                  </div>
                  <div className="h-2 w-24 rounded-full bg-green-500/30" />
                </div>
              </div>
            </div>

            <div className="relative p-5 sm:p-6 pt-4">
              <p className="font-black text-base sm:text-lg text-white mb-1">Receba via PIX</p>
              <p className="text-gray-500 text-sm leading-snug">Seu lead paga, você recebe na hora. Automático e sem burocracia.</p>
            </div>
          </div>

        </div>
      </section>

      {/* ══ PREÇOS ════════════════════════════════════════════════ */}
      <section id="pricing" ref={pricingRef} className="px-4 sm:px-6 py-16 sm:py-24 max-w-5xl mx-auto">
        <div className="section-title text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FE015C]" />
            <span className="text-gray-400 text-xs tracking-widest uppercase font-medium">Sem surpresas</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black mb-3">Preço simples e justo</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">Sem surpresas. Cancele quando quiser.</p>
        </div>

        <DynamicPricingCards navigate={navigate} />

        {/* Nota rodapé */}
        <p className="text-center text-gray-600 text-xs mt-8">
          Sem contrato. Cancele quando quiser. Pagamentos processados com segurança via PIX.
        </p>
      </section>

      {/* ══ CTA final ══════════════════════════════════════════════ */}
      <section id="cta" ref={ctaRef} className="px-4 sm:px-6 pb-20 sm:pb-28 max-w-5xl mx-auto">
        <div className="cta-inner relative rounded-2xl sm:rounded-3xl overflow-hidden min-h-[280px] sm:min-h-[320px] flex items-center justify-center">
          {/* Background image */}
          <img src="/cta-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
          {/* Overlay escuro para legibilidade */}
          <div className="absolute inset-0 bg-[#120208]/65" />
          {/* Glow central */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FE015C]/5 to-[#120208]/40" />

          {/* Content */}
          <div className="relative z-10 text-center px-6 sm:px-12 py-12 sm:py-16 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/8 border border-white/12 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FE015C] animate-pulse" />
              <span className="text-gray-300 text-xs tracking-widest uppercase font-medium">Comece agora</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 leading-tight">
              Suas chamadas.<br />
              <span className="text-[#FE015C]">Suas regras.</span>
            </h2>
            <p className="text-gray-300 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
              Junte-se a milhares de criadores que já monetizam suas chamadas com a Call Privada.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={() => navigate('/register')}
                className="w-full sm:w-auto flex items-center justify-center gap-3 bg-[#FE015C] hover:bg-[#FD267D] active:scale-[0.98] text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-xl shadow-[#FE015C]/40 text-sm">
                <span className="w-7 h-7 rounded-full bg-black/20 flex items-center justify-center shrink-0">
                  <ArrowRight size={14} />
                </span>
                Começar agora
              </button>
              <button onClick={() => navigate('/login')}
                className="w-full sm:w-auto text-sm font-medium text-gray-300 hover:text-white px-6 py-4 rounded-2xl border border-white/12 hover:bg-white/6 backdrop-blur-sm transition-all">
                Já tenho conta →
              </button>
            </div>
            <div className="flex items-center justify-center gap-6 mt-7 flex-wrap">
              {TRUST.map(t => (
                <div key={t} className="flex items-center gap-1.5 text-gray-400 text-xs">
                  <Check size={11} className="text-[#FE015C]" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ Footer ═════════════════════════════════════════════════ */}
      <footer className="border-t border-white/5 px-4 sm:px-8 py-8 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <img src="/logo.png" alt="" className="w-6 h-6 object-contain" />
          <span className="font-bold text-sm">Call <span className="text-[#FE015C]">Privada</span></span>
        </div>
        <p className="text-gray-600 text-xs">© 2026 CallPrivada. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
