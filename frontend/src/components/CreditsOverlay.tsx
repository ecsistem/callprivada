import { useEffect, useRef, useState } from 'react';
import { checkPixStatus, checkWayMBStatus, createPixPayment, createWayMBPayment } from '../services/billingService';
import { getPaymentConfig } from '../services/paymentConfigService';
import { PhoneInput } from './PhoneInput';

export interface CreditPackage {
  id: string;
  minutes: number;
  price_cents: number;
  label: string;
  highlight?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'p5',  minutes: 5,  price_cents: 1000, label: '5 minutos'  },
  { id: 'p15', minutes: 15, price_cents: 2500, label: '15 minutos', highlight: true },
  { id: 'p30', minutes: 30, price_cents: 4500, label: '30 minutos' },
  { id: 'p60', minutes: 60, price_cents: 8000, label: '60 minutos' },
];

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type Mode = 'select' | 'payer' | 'method' | 'pix' | 'waymb' | 'active' | 'warning' | 'topup' | 'ended';
type WayMBMethod = 'mbway' | 'multibanco';

interface Props {
  slug: string;
  /** chamado quando créditos são confirmados e a call pode começar/continuar */
  onCreditsGranted: () => void;
  /** chamado quando o saldo zera */
  onCreditsExhausted: () => void;
  /** saldo restante em segundos — controlado pelo pai */
  creditsSeconds: number;
  setCreditsSeconds: React.Dispatch<React.SetStateAction<number>>;
  /** se true, mostra badge + warning overlay quando < 2min */
  isCallActive: boolean;
}

export default function CreditsOverlay({
  slug,
  onCreditsGranted,
  onCreditsExhausted,
  creditsSeconds,
  setCreditsSeconds,
  isCallActive,
}: Props) {
  const [mode, setMode] = useState<Mode>('select');
  const [selected, setSelected] = useState<CreditPackage>(CREDIT_PACKAGES[1]);
  const [txnId, setTxnId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [activeGateway, setActiveGateway] = useState<'zuckpay' | 'waymb'>('zuckpay');
  const [waymbMethod, setWaymbMethod] = useState<WayMBMethod>('mbway');
  const [multibancoEntity, setMultibancoEntity] = useState('');
  const [multibancoReference, setMultibancoReference] = useState('');
  // Dados do pagador (WayMB)
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerDocument, setPayerDocument] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningFiredRef = useRef(false);

  // Carrega gateway ativo do usuário via config da chamada
  useEffect(() => {
    getPaymentConfig().then(cfg => {
      setActiveGateway(cfg.active_gateway ?? 'zuckpay');
    }).catch(() => {});
  }, []);

  // Countdown timer when call is active
  useEffect(() => {
    if (!isCallActive || mode !== 'active') return;
    timerRef.current = setInterval(() => {
      setCreditsSeconds(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          setMode('ended');
          onCreditsExhausted();
          return 0;
        }
        // Warning at 2 minutes
        if (s === 121 && !warningFiredRef.current) {
          warningFiredRef.current = true;
          setMode('warning');
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isCallActive, mode]);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function startPolling(id: string, gateway: 'zuckpay' | 'waymb' = 'zuckpay') {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const s = gateway === 'waymb' ? await checkWayMBStatus(id) : await checkPixStatus(id);
        if (s.paid) {
          stopPolling();
          const pkg = CREDIT_PACKAGES.find(p => p.price_cents === s.amount_cents) ?? selected;
          setCreditsSeconds(prev => prev + pkg.minutes * 60);
          warningFiredRef.current = false;
          setMode('active');
          onCreditsGranted();
        }
      } catch { /* keep polling */ }
    }, 3000);
  }

  useEffect(() => () => { stopPolling(); if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function generatePix(pkg: CreditPackage) {
    if (activeGateway === 'waymb') {
      setSelected(pkg);
      setErrMsg('');
      // Primeiro o método de pagamento, depois os dados do pagador.
      setMode('method');
      return;
    }
    setLoading(true);
    setErrMsg('');
    try {
      const r = await createPixPayment(slug, pkg.price_cents, {
        payer_name: 'Visitante',
        payer_document: '00000000000',
        payer_email: 'lead@callprivada.app',
      });
      setTxnId(r.transaction_id);
      setQrCode(r.qr_code ?? '');
      setMode('pix');
      startPolling(r.transaction_id, 'zuckpay');
    } catch {
      setErrMsg('Não foi possível gerar o PIX. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  // Extrai a mensagem de erro real da API para explicar o que falhou.
  function apiErrorMessage(err: unknown, fallback: string): string {
    const resp = (err as { response?: { status?: number; data?: { error?: { message?: string } } } })?.response;
    const apiMsg = resp?.data?.error?.message;
    if (apiMsg) return apiMsg;
    if (resp?.status === 400) return 'Dados inválidos. Verifique o telemóvel e o NIF e tente novamente.';
    if (resp?.status === 402 || resp?.status === 422) return 'O pagamento foi recusado pelo gateway. Verifique os dados e tente novamente.';
    if (resp && (resp.status ?? 0) >= 500) return 'O serviço de pagamento está indisponível no momento. Tente novamente em instantes.';
    if (!resp) return 'Sem ligação ao servidor. Verifique a sua internet e tente novamente.';
    return fallback;
  }

  async function generateWayMB(method: WayMBMethod) {
    setWaymbMethod(method);
    setLoading(true);
    setErrMsg('');
    try {
      // Multibanco não usa os dados do pagador (só entidade + referência) —
      // envia placeholders quando o formulário foi pulado.
      const r = await createWayMBPayment(slug, selected.price_cents, method, {
        payer_name:     payerName.trim()     || 'Visitante',
        payer_document: payerDocument.trim() || '999999990',
        payer_email:    payerEmail.trim()    || 'lead@callprivada.app',
        payer_phone:    payerPhone.trim(),
      });
      setTxnId(r.transaction_id);
      setMultibancoEntity(r.multibanco_entity ?? '');
      setMultibancoReference(r.multibanco_reference ?? '');
      setMode('waymb');
      startPolling(r.transaction_id, 'waymb');
    } catch (err) {
      setErrMsg(apiErrorMessage(err, 'Não foi possível iniciar o pagamento. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function checkManually() {
    if (!txnId) return;
    setLoading(true);
    try {
      const s = activeGateway === 'waymb' ? await checkWayMBStatus(txnId) : await checkPixStatus(txnId);
      if (s.paid) {
        stopPolling();
        const pkg = CREDIT_PACKAGES.find(p => p.price_cents === s.amount_cents) ?? selected;
        setCreditsSeconds(prev => prev + pkg.minutes * 60);
        warningFiredRef.current = false;
        setMode('active');
        onCreditsGranted();
      }
    } catch { /* noop */ }
    finally { setLoading(false); }
  }

  // ── Badge flutuante (call ativa, saldo ok) ──────────────────────────────
  if (mode === 'active' && isCallActive) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-bold shadow-lg"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>⏱ {fmtTime(creditsSeconds)}</span>
        </div>
      </div>
    );
  }

  // ── Warning: 2 minutos restantes ───────────────────────────────────────
  if (mode === 'warning') {
    return (
      <div className="fixed inset-0 z-[200] flex items-end justify-center pb-8 px-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}>
        <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: '#111827', border: '1px solid rgba(234,179,8,0.4)' }}>
          <div className="py-3 px-4 text-center text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(90deg,#ca8a04,#a16207)', color: '#fff' }}>
            ⚠️ Faltam aproximadamente 2 minutos de saldo
          </div>
          <div className="p-5 text-center space-y-4">
            <p className="text-gray-300 text-sm">Adicione créditos para continuar sem interrupções.</p>
            <p className="text-white font-bold text-2xl">{fmtTime(creditsSeconds)} restantes</p>
            <button
              onClick={() => { setMode('topup'); }}
              className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 20px rgba(22,163,74,0.4)' }}
            >
              Adicionar créditos agora
            </button>
            <button onClick={() => setMode('active')}
              className="block w-full text-xs text-gray-600 hover:text-gray-400 transition-colors pt-1">
              Continuar mesmo assim
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Saldo esgotado ─────────────────────────────────────────────────────
  if (mode === 'ended') {
    return (
      <FullscreenPanel>
        <div className="text-center space-y-3 mb-6">
          <div className="text-4xl">⏱</div>
          <p className="text-white font-bold text-xl">Saldo esgotado</p>
          <p className="text-gray-400 text-sm">A ligação foi encerrada. Adicione créditos para continuar.</p>
        </div>
        <PackageGrid selected={selected} onSelect={pkg => { setSelected(pkg); }} />
        {errMsg && <p className="text-red-400 text-xs text-center mt-2">{errMsg}</p>}
        <button
          onClick={() => generatePix(selected)}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white text-base mt-4 transition-all active:scale-95 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 20px rgba(22,163,74,0.4)' }}
        >
          {loading ? 'Aguarde…' : activeGateway === 'waymb' ? `Escolher método · ${fmt(selected.price_cents)}` : `Pagar ${fmt(selected.price_cents)} via PIX`}
        </button>
      </FullscreenPanel>
    );
  }

  // ── Top-up (recarga durante a call) ───────────────────────────────────
  if (mode === 'topup') {
    return (
      <FullscreenPanel>
        <p className="text-white font-bold text-lg text-center mb-1">Adicionar créditos</p>
        <p className="text-gray-400 text-sm text-center mb-4">Saldo atual: <span className="text-white font-bold">{fmtTime(creditsSeconds)}</span></p>
        <PackageGrid selected={selected} onSelect={pkg => setSelected(pkg)} />
        {errMsg && <p className="text-red-400 text-xs text-center mt-2">{errMsg}</p>}
        <button
          onClick={() => generatePix(selected)}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white text-base mt-4 transition-all active:scale-95 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 20px rgba(22,163,74,0.4)' }}
        >
          {loading ? 'Aguarde…' : activeGateway === 'waymb' ? `Escolher método · ${fmt(selected.price_cents)}` : `Pagar ${fmt(selected.price_cents)} via PIX`}
        </button>
        <button onClick={() => setMode('active')}
          className="block w-full text-xs text-gray-600 hover:text-gray-400 transition-colors pt-3 text-center">
          Voltar para a ligação
        </button>
      </FullscreenPanel>
    );
  }

  // ── Dados do pagador (WayMB) ───────────────────────────────────────────
  if (mode === 'payer') {
    const fieldCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FE015C]/50 transition-all";
    const canProceed = payerName.trim() && payerEmail.trim() && payerPhone.trim() && payerDocument.trim();
    function payerValidationMsg(): string {
      if (!payerName.trim()) return 'Preencha o nome completo.';
      if (!/^\S+@\S+\.\S+$/.test(payerEmail.trim())) return 'Preencha um e-mail válido.';
      if (!payerPhone.trim() || payerPhone.replace(/\D/g, '').length < 9) return 'Preencha um telemóvel válido (com indicativo do país).';
      if (!payerDocument.trim()) return 'Preencha o NIF.';
      return '';
    }
    return (
      <FullscreenPanel>
        <div className="text-center mb-5">
          <p className="text-white font-bold text-lg">Dados para o pagamento</p>
          <p className="text-gray-400 text-xs mt-1">
            {fmt(selected.price_cents)} · {selected.label} · {waymbMethod === 'mbway' ? '📱 MB WAY' : '🏧 Multibanco'}
          </p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">Nome completo *</label>
            <input
              value={payerName}
              onChange={e => setPayerName(e.target.value)}
              placeholder="João Silva"
              className={fieldCls}
              autoComplete="name"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">E-mail *</label>
            <input
              type="email"
              value={payerEmail}
              onChange={e => setPayerEmail(e.target.value)}
              placeholder="joao@exemplo.com"
              className={fieldCls}
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">Telefone celular *</label>
            <PhoneInput
              value={payerPhone}
              onChange={setPayerPhone}
              placeholder="912 345 678"
              inputClassName={fieldCls + ' flex-1 min-w-0'}
              selectClassName="shrink-0 bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-white text-sm focus:outline-none focus:border-[#FE015C]/50 cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">NIF *</label>
            <input
              value={payerDocument}
              onChange={e => setPayerDocument(e.target.value)}
              placeholder="123456789"
              className={fieldCls}
              autoComplete="off"
            />
          </div>
        </div>
        {errMsg && <p className="text-red-400 text-xs text-center mt-3">{errMsg}</p>}
        <button
          onClick={() => {
            const v = payerValidationMsg();
            if (v) { setErrMsg(v); return; }
            setErrMsg('');
            generateWayMB(waymbMethod);
          }}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white text-base mt-5 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: canProceed ? 'linear-gradient(135deg,#FE015C,#c8004a)' : 'rgba(255,255,255,0.08)', opacity: canProceed ? 1 : 0.7 }}
        >
          {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {loading ? 'A gerar o pagamento…' : 'Pagar agora'}
        </button>
        <button onClick={() => { setErrMsg(''); setMode('method'); }}
          className="block w-full text-xs text-gray-600 hover:text-gray-400 transition-colors pt-3 text-center">
          ← Trocar método de pagamento
        </button>
      </FullscreenPanel>
    );
  }

  // ── Seleção de método WayMB ────────────────────────────────────────────
  if (mode === 'method') {
    const methods: { id: WayMBMethod; label: string; desc: string; icon: string }[] = [
      { id: 'mbway',      label: 'MB WAY',     desc: 'Confirmação no app MB WAY',             icon: '📱' },
      { id: 'multibanco', label: 'Multibanco', desc: 'Entidade + referência para caixa/banco', icon: '🏧' },
    ];
    return (
      <FullscreenPanel>
        <div className="text-center mb-5">
          <p className="text-white font-bold text-xl">Como você deseja pagar?</p>
          <p className="text-gray-400 text-sm mt-1">{fmt(selected.price_cents)} · {selected.label}</p>
        </div>
        {errMsg && <p className="text-red-400 text-xs text-center mb-3">{errMsg}</p>}
        <div className="space-y-2">
          {methods.map(m => (
            <button
              key={m.id}
              onClick={() => {
                setWaymbMethod(m.id);
                setErrMsg('');
                // Multibanco gera direto (entidade + referência) — sem formulário.
                if (m.id === 'multibanco') generateWayMB('multibanco');
                else setMode('payer');
              }}
              disabled={loading}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:border-[#FE015C]/50 hover:bg-[#FE015C]/5 transition-all disabled:opacity-60 text-left"
            >
              <span className="text-2xl">{m.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{m.label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{m.desc}</p>
              </div>
              {loading && waymbMethod === m.id && (
                <div className="ml-auto w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
            </button>
          ))}
        </div>
        <button onClick={() => setMode('select')}
          className="block w-full text-xs text-gray-600 hover:text-gray-400 transition-colors pt-4 text-center">
          ← Voltar
        </button>
      </FullscreenPanel>
    );
  }

  // ── Aguardando pagamento WayMB ─────────────────────────────────────────
  if (mode === 'waymb') {
    const isMbway = waymbMethod === 'mbway';
    const isMultibanco = waymbMethod === 'multibanco';
    return (
      <FullscreenPanel>
        <div className="text-center mb-5">
          <p className="text-3xl font-black text-white">{fmt(selected.price_cents)}</p>
          <p className="text-gray-400 text-xs mt-0.5">{selected.label}</p>
        </div>

        {isMbway && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center space-y-2 mb-4">
            <div className="text-3xl">📱</div>
            <p className="text-white font-semibold text-sm">Confirmação enviada ao app MB WAY</p>
            <p className="text-gray-500 text-xs leading-relaxed">
              Abra o app MB WAY e confirme o pagamento de {fmt(selected.price_cents)}.
            </p>
            <div className="flex items-center justify-center gap-1.5 pt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FE015C] animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-[#FE015C] animate-bounce" style={{ animationDelay: '0.15s' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-[#FE015C] animate-bounce" style={{ animationDelay: '0.3s' }} />
            </div>
          </div>
        )}

        {isMultibanco && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🏧</span>
              <p className="text-white font-semibold text-sm">Dados para o pagamento</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">Entidadee</p>
                <p className="text-white font-mono font-bold text-lg">{multibancoEntity || '—'}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">Referência</p>
                <p className="text-white font-mono font-bold text-base tracking-wider">{multibancoReference || '—'}</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">Valor</p>
              <p className="text-white font-bold">{fmt(selected.price_cents)}</p>
            </div>
              <p className="text-gray-600 text-xs text-center">Pague no caixa eletrônico ou no banco on-line com estes dados</p>
          </div>
        )}

        <button
          onClick={checkManually}
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
          style={{ background: 'rgba(254,1,92,0.2)', border: '1px solid rgba(254,1,92,0.4)' }}
        >
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verificando…</>
          ) : 'Já realizei o pagamento'}
        </button>

        <button onClick={() => { stopPolling(); setMode('method'); }}
          className="block w-full text-xs text-gray-600 hover:text-gray-400 transition-colors pt-3 text-center">
          ← Trocar método
        </button>
      </FullscreenPanel>
    );
  }

  // ── QR code PIX ───────────────────────────────────────────────────────
  if (mode === 'pix') {
    return (
      <FullscreenPanel>
        <div className="text-center mb-4">
          <p className="text-3xl font-black text-white">{fmt(selected.price_cents)}</p>
          <p className="text-gray-400 text-xs mt-0.5">{selected.label} de ligação • PIX instantâneo</p>
        </div>

        {qrCode && (
          <div className="space-y-3">
            <div className="bg-[#1a2530] border border-white/10 rounded-xl px-3 py-2">
              <code className="text-xs text-green-400 break-all leading-relaxed">
                {qrCode.slice(0, 60)}…
              </code>
            </div>
            <button
              onClick={copyCode}
              className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                background: copied ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#25d366,#128c3e)',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(37,211,102,0.4)',
              }}
            >
              {copied ? (
                <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Código copiado!</>
              ) : (
                <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copiar código PIX</>
              )}
            </button>
          </div>
        )}

        <button
          onClick={checkManually}
          disabled={loading}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-xs transition-colors disabled:opacity-50 py-2 mx-auto mt-2"
        >
          {loading ? (
            <><div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin" />Verificando…</>
          ) : (
            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Já realizei o pagamento</>
          )}
        </button>

        <button onClick={() => setMode('select')}
          className="block w-full text-xs text-gray-700 hover:text-gray-500 transition-colors pt-1 text-center">
          ← Trocar pacote
        </button>
      </FullscreenPanel>
    );
  }

  // ── Seleção de pacote (estado inicial) ────────────────────────────────
  return (
    <FullscreenPanel>
      <div className="text-center mb-5">
        <p className="text-white font-bold text-xl">Escolha seu pacote</p>
        <p className="text-gray-400 text-sm mt-1">
          {activeGateway === 'waymb' ? 'MB WAY, Multibanco ou Bizum — rápido e seguro' : 'Pague via PIX e a ligação começa na hora'}
        </p>
      </div>
      <PackageGrid selected={selected} onSelect={setSelected} />
      {errMsg && <p className="text-red-400 text-xs text-center mt-2">{errMsg}</p>}
      <button
        onClick={() => generatePix(selected)}
        disabled={loading}
        className="w-full py-4 rounded-2xl font-bold text-white text-base mt-5 transition-all active:scale-95 disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg,#25d366,#128c3e)', boxShadow: '0 4px 20px rgba(37,211,102,0.4)' }}
      >
        {loading ? 'Aguarde…' : activeGateway === 'waymb' ? `Escolher método · ${fmt(selected.price_cents)}` : `Pagar ${fmt(selected.price_cents)} via PIX`}
      </button>
      <p className="text-center text-gray-700 text-xs mt-3">
        {activeGateway === 'waymb' ? 'Pagamento seguro • WayMB' : 'Pagamento seguro • PIX instantâneo'}
      </p>
    </FullscreenPanel>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function FullscreenPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-5"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-5 shadow-2xl"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
        {children}
      </div>
    </div>
  );
}

function PackageGrid({ selected, onSelect }: { selected: CreditPackage; onSelect: (p: CreditPackage) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {CREDIT_PACKAGES.map(pkg => {
        const isSelected = selected.id === pkg.id;
        const perMin = (pkg.price_cents / pkg.minutes / 100).toFixed(2);
        return (
          <button
            key={pkg.id}
            onClick={() => onSelect(pkg)}
            className="relative rounded-xl p-3 text-left transition-all"
            style={{
              background: isSelected ? 'rgba(37,211,102,0.15)' : 'rgba(255,255,255,0.04)',
              border: isSelected ? '1.5px solid #25d366' : '1.5px solid rgba(255,255,255,0.08)',
            }}
          >
            {pkg.highlight && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#ca8a04', color: '#fff' }}>
                POPULAR
              </span>
            )}
            <p className="text-white font-bold text-base">{(pkg.price_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p className="text-gray-300 text-sm">{pkg.label}</p>
            <p className="text-gray-500 text-xs mt-0.5">R$ {perMin}/min</p>
          </button>
        );
      })}
    </div>
  );
}
