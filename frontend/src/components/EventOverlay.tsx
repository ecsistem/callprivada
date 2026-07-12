import QRCode from 'qrcode';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatPrice } from '../lib/currency';
import { checkPixStatus, checkWayMBStatus, createPixPayment, createWayMBPayment, type BillingResult } from '../services/billingService';
import type { PublicEvent } from '../services/callService';
import { PhoneInput } from './PhoneInput';

function useQRCode(text: string | undefined) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const generate = useCallback(async (t: string) => {
    try {
      const url = await QRCode.toDataURL(t, { width: 220, margin: 1, color: { dark: '#000', light: '#fff' } });
      setDataUrl(url);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { if (text) generate(text); }, [text, generate]);
  return dataUrl;
}

interface Props {
  event: PublicEvent;
  onDismiss: () => void;
  onResume?: () => void;
  currency?: string;
  paymentGateway?: 'zuckpay' | 'waymb';
}

/** Retorna o texto customizado do evento (extra_texts[key]) ou o fallback padrão. */
function xt(event: PublicEvent, key: string, fallback: string): string {
  const v = event.extra_texts?.[key];
  return v && v.trim() !== '' ? v : fallback;
}

/* ─── PIX QR code step ─────────────────────────────────────────────────── */


function PixStep({ slug, event, onDismiss, onPaid, currency = 'BRL', paymentGateway = 'zuckpay' }: { slug: string; event: PublicEvent; onDismiss: () => void; onPaid?: () => void; currency?: string; paymentGateway?: 'zuckpay' | 'waymb' }) {
  const isWayMB = paymentGateway === 'waymb';

  const hasPreset =
    !!event.billing_payer_name &&
    !!event.billing_payer_document &&
    !!event.billing_payer_email;

  // WayMB precisa de dados reais do pagador (o MB WAY envia a aprovação para o
  // telemóvel informado) — sempre coleta todos os dados.
  const showForm = isWayMB || (event.billing_collect_payer_info && !hasPreset);

  type Step = 'form' | 'method' | 'loading' | 'qr' | 'checking' | 'paid' | 'error';
  // WayMB: primeiro o método (MB WAY / Multibanco), depois o formulário.
  const [step, setStep] = useState<Step>(isWayMB ? 'method' : showForm ? 'form' : 'loading');
  const [waymbMethod, setWaymbMethod] = useState<'mbway' | 'multibanco'>('mbway');
  const [result, setResult] = useState<BillingResult | null>(null);
  const [errMsg, setErrMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [name, setName] = useState(event.billing_payer_name ?? '');
  const [doc, setDoc] = useState(event.billing_payer_document ?? '');
  const [email, setEmail] = useState(event.billing_payer_email ?? '');
  const [phone, setPhone] = useState(event.billing_payer_phone ?? '');

  const qrDataUrl = useQRCode(result?.qr_code);
  const gatewayName = isWayMB ? 'WayMB' : 'PIX';
  const isMultibanco = isWayMB && result?.waymb_method === 'multibanco' && (result.multibanco_entity || result.multibanco_reference);

  function startPolling(txnId: string, zuckpayTxnId?: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const s = isWayMB ? await checkWayMBStatus(txnId) : await checkPixStatus(txnId, { zuckpayTxnId, slug });
        if (s.paid) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setStep('paid');
        }
      } catch {
        // silent — keep polling
      }
    }, 3000);
  }

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Disparo automático — apenas PIX sem formulário. WayMB sempre passa por
  // formulário de dados + escolha de método antes de criar a cobrança.
  useEffect(() => {
    if (showForm || isWayMB) return;

    createPixPayment(slug, event.billing_amount_cents, {
      payer_name:     event.billing_payer_name     || 'Visitante',
      payer_document: event.billing_payer_document || '00000000000',
      payer_email:    event.billing_payer_email    || 'lead@callprivada.app',
      payer_phone:    event.billing_payer_phone    || '',
    })
      .then((r) => { setResult(r); setStep('qr'); startPolling(r.transaction_id, r.zuckpay_txn_id); })
      .catch(() => { setErrMsg('Não foi possível gerar o PIX. Tente novamente.'); setStep('error'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Extrai a mensagem de erro real da API para explicar o que falhou.
  function apiErrorMessage(err: unknown, fallback: string): string {
    const resp = (err as { response?: { status?: number; data?: { error?: { message?: string } } } })?.response;
    const apiMsg = resp?.data?.error?.message;
    if (apiMsg) return apiMsg;
    if (resp?.status === 400) return isWayMB ? 'Dados inválidos. Verifique o telemóvel e o NIF e tente novamente.' : 'Dados inválidos. Verifique o CPF e tente novamente.';
    if (resp?.status === 402 || resp?.status === 422) return 'O pagamento foi recusado pelo gateway. Verifique os dados e tente novamente.';
    if (resp && (resp.status ?? 0) >= 500) return 'O serviço de pagamento está indisponível no momento. Tente novamente em instantes.';
    if (!resp) return 'Sem ligação ao servidor. Verifique a sua internet e tente novamente.';
    return fallback;
  }

  // Valida o formulário WayMB — todos os campos são obrigatórios.
  function validateWayMBForm(): string {
    if (!name.trim()) return 'Preencha o nome completo.';
    if (!doc.trim()) return 'Preencha o NIF.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Preencha um e-mail válido.';
    if (!phone.trim() || phone.replace(/\D/g, '').length < 9) return 'Preencha um telemóvel válido (com indicativo do país).';
    return '';
  }

  async function createWayMB(method: 'mbway' | 'multibanco', payer: { name: string; doc: string; email: string; phone: string }) {
    setStep('loading');
    try {
      const r = await createWayMBPayment(slug, event.billing_amount_cents, method, {
        payer_name: payer.name,
        payer_document: payer.doc,
        payer_email: payer.email,
        payer_phone: payer.phone,
      });
      setResult(r);
      setStep('qr');
      startPolling(r.transaction_id);
    } catch (err) {
      setErrMsg(apiErrorMessage(err, 'Não foi possível gerar o pagamento. Tente novamente.'));
      setStep('error');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    // WayMB (MB WAY): método já escolhido — valida todos os dados e cria a cobrança.
    if (isWayMB) {
      const v = validateWayMBForm();
      if (v) { setFormError(v); return; }
      await createWayMB(waymbMethod, { name: name.trim(), doc: doc.trim(), email: email.trim(), phone: phone.trim() });
      return;
    }
    setStep('loading');
    try {
      const r = await createPixPayment(slug, event.billing_amount_cents, {
        payer_name: name,
        payer_document: doc,
        payer_email: email,
        payer_phone: phone,
      });
      setResult(r);
      setStep('qr');
      startPolling(r.transaction_id, r.zuckpay_txn_id);
    } catch (err) {
      setErrMsg(apiErrorMessage(err, `Não foi possível gerar o pagamento ${gatewayName}. Tente novamente.`));
      setStep('error');
    }
  }

  async function handleCheckPayment() {
    if (!result) return;
    setStep('checking');
    try {
      const s = isWayMB
        ? await checkWayMBStatus(result.transaction_id)
        : await checkPixStatus(result.transaction_id, { zuckpayTxnId: result.zuckpay_txn_id, slug });
      if (s.paid) {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        setStep('paid');
      } else {
        setStep('qr');
      }
    } catch {
      setStep('qr');
    }
  }

  function copyCode() {
    if (!result?.qr_code) return;
    navigator.clipboard.writeText(result.qr_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const btnColor = event.button_color ?? '#25d366';

  // WayMB usa textos padrão em português do Brasil.
  // t(chave_extra, texto_pt, texto_waymb): extra_texts sempre tem prioridade.
  const t = (key: string, pt: string, waymb: string) => xt(event, key, isWayMB ? waymb : pt);

  /* ── Loading ── */
  if (step === 'loading') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-[#25d366] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">{isWayMB ? 'Gerando pagamento…' : `Gerando cobrança ${gatewayName}…`}</p>
      </div>
    );
  }

  /* ── Erro ── */
  if (step === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-red-400 text-sm">{errMsg}</p>
        <button
          onClick={() => setStep(isWayMB ? 'method' : showForm ? 'form' : 'loading')}
          className="px-6 py-2 rounded-xl text-sm font-semibold text-white bg-gray-700 hover:bg-gray-600"
        >
          {isWayMB ? 'Tentar novamente' : 'Tentar novamente'}
        </button>
      </div>
    );
  }

  /* ── Pago ── */
  if (step === 'paid') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-white font-bold text-lg">{t('paid_title', 'Pagamento confirmado!', 'Pagamento confirmado!')}</p>
        <p className="text-gray-400 text-sm">{t('paid_subtitle', 'Obrigado. Seu acesso foi liberado.', 'Obrigado. O seu acesso foi libertado.')}</p>
        <button
          onClick={() => (onPaid ?? onDismiss)()}
          className="w-full max-w-xs py-3 rounded-xl font-semibold text-white text-sm"
          style={{ backgroundColor: btnColor }}
        >
          {t('paid_button', 'Continuar', 'Continuar')}
        </button>
      </div>
    );
  }

  /* ── Escolha do método WayMB (MB WAY / Multibanco) ── */
  if (step === 'method') {
    const methods: { id: 'mbway' | 'multibanco'; label: string; desc: string; icon: string }[] = [
      { id: 'mbway',      label: 'MB WAY',     desc: 'Confirmação no app MB WAY',               icon: '📱' },
      { id: 'multibanco', label: 'Multibanco', desc: 'Entidadee + referência para caixa/banco',  icon: '🏧' },
    ];
    return (
      <div className="flex-1 flex flex-col justify-center px-6 space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-white text-xl font-bold">Como você deseja pagar?</h2>
          {event.billing_amount_cents > 0 && (
            <p className="text-[#25d366] font-bold text-2xl">{formatPrice(event.billing_amount_cents, currency)}</p>
          )}
        </div>
        <div className="space-y-2">
          {methods.map(m => (
            <button
              key={m.id}
              onClick={() => {
                setWaymbMethod(m.id);
                setFormError('');
                if (m.id === 'multibanco') {
                  // Multibanco não depende dos dados do pagador (só entidade +
                  // referência) — gera direto, sem formulário.
                  createWayMB('multibanco', {
                    name:  event.billing_payer_name     || 'Visitante',
                    doc:   event.billing_payer_document || '999999990',
                    email: event.billing_payer_email    || 'lead@callprivada.app',
                    phone: event.billing_payer_phone    || '',
                  });
                } else {
                  setStep('form');
                }
              }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:border-[#25d366]/50 hover:bg-[#25d366]/5 transition-all text-left"
            >
              <span className="text-2xl">{m.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{m.label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── QR code ── */
  if ((step === 'qr' || step === 'checking') && result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-2 gap-4">

        {/* Título / descrição customizados */}
        {(event.title || event.description) && (
          <div className="text-center space-y-1">
            {event.title && <p className="text-white font-bold text-base leading-snug">{event.title}</p>}
            {event.description && <p className="text-gray-400 text-sm">{event.description}</p>}
          </div>
        )}

        {/* Valor */}
        <div className="text-center">
          <p className="text-3xl font-black text-white tracking-tight">{formatPrice(result.amount_cents, currency)}</p>
          <p className="text-gray-400 text-xs mt-0.5">{t('payment_note', 'Pagamento via PIX • instantâneo', 'Pagamento via WayMB • instantâneo')}</p>
        </div>

        {/* WayMB multibanco ou QR code PIX */}
        {isMultibanco ? (
          <div className="w-full space-y-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Entidadee</p>
                  <p className="text-white font-mono font-bold text-lg">{result.multibanco_entity}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Referência</p>
                  <p className="text-white font-mono font-bold text-base tracking-wider">{result.multibanco_reference}</p>
                </div>
              </div>
              {result.multibanco_expires_at ? (
                <p className="text-gray-500 text-xs text-center">
                  Expira em {new Date(result.multibanco_expires_at * 1000).toLocaleString('pt-BR')}
                </p>
              ) : null}
            </div>
          </div>
        ) : isWayMB ? (
          <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center space-y-2">
            <div className="text-3xl">📱</div>
            <p className="text-white font-semibold text-sm">Confirmação enviada ao seu celular</p>
            <p className="text-gray-500 text-xs leading-relaxed">Abra o app e confirme o pagamento de {formatPrice(result.amount_cents, currency)}.</p>
          </div>
        ) : qrDataUrl ? (
          <div className="rounded-2xl bg-white p-3 shadow-lg shadow-black/40">
            <img
              src={qrDataUrl}
              alt="QR code PIX"
              className="w-44 h-44 block"
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        ) : result.qr_code_url ? (
          <div className="rounded-2xl bg-white p-3 shadow-lg shadow-black/40">
            <img
              src={result.qr_code_url}
              alt="QR code PIX"
              className="w-44 h-44 block"
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        ) : null}

        {/* Código copia-e-cola */}
        {!isWayMB && result.qr_code && (
          <div className="w-full">
            <p className="text-xs text-gray-500 text-center mb-2">{xt(event, 'copy_hint', 'Ou use o código PIX copia e cola')}</p>

            {/* Código truncado */}
            <div className="bg-[#1a2530] border border-white/10 rounded-xl px-3 py-2 mb-3">
              <code className="text-xs text-green-400 break-all leading-relaxed">
                {result.qr_code.slice(0, 60)}…
              </code>
            </div>

            {/* Botão copiar — destaque principal */}
            <button
              onClick={copyCode}
              className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                background: copied
                  ? 'linear-gradient(135deg,#16a34a,#15803d)'
                  : 'linear-gradient(135deg,#25d366,#128c3e)',
                color: '#fff',
                boxShadow: copied ? '0 4px 20px rgba(37,211,102,0.25)' : '0 4px 20px rgba(37,211,102,0.4)',
              }}
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Código copiado!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {xt(event, 'copy_button', 'Copiar código PIX')}
                </>
              )}
            </button>
          </div>
        )}

        {isWayMB && !isMultibanco && (
          <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center space-y-2">
            <p className="text-white font-semibold text-sm">Aguardando a confirmação do pagamento</p>
            <p className="text-gray-500 text-xs leading-relaxed">Quando o pagamento for aprovado, esta tela será desbloqueada automaticamente.</p>
          </div>
        )}

        {/* Já paguei — secundário, discreto */}
        <button
          onClick={handleCheckPayment}
          disabled={step === 'checking'}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-xs transition-colors disabled:opacity-50 py-1"
        >
          {step === 'checking' ? (
            <>
              <div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin" />
              {isWayMB ? 'Verificando pagamento…' : 'Verificando pagamento…'}
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('check_button', 'Já realizei o pagamento', 'Já realizei o pagamento')}
            </>
          )}
        </button>

      </div>
    );
  }

  /* ── Formulário de dados do pagador ── */
  return (
    <div className="flex-1 flex flex-col justify-center px-6 space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-white text-xl font-bold">{event.title}</h2>
        {event.description && (
          <p className="text-gray-400 text-sm">{event.description}</p>
        )}
        {event.billing_amount_cents > 0 && (
          <p className="text-[#25d366] font-bold text-2xl">{formatPrice(event.billing_amount_cents, currency)}</p>
        )}
      </div>

      {isWayMB && (
        <p className="text-center text-gray-500 text-xs">
          Pagamento via <span className="text-white font-semibold">{waymbMethod === 'mbway' ? '📱 MB WAY' : '🏧 Multibanco'}</span>
        </p>
      )}

      <form onSubmit={submit} className="space-y-3">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome completo"
          autoComplete="name"
          className="w-full bg-[#2a3942] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#25d366]"
        />
        <input
          required
          value={doc}
          onChange={(e) => setDoc(e.target.value)}
          placeholder={isWayMB ? 'NIF' : 'CPF (apenas números)'}
          maxLength={isWayMB ? 20 : 11}
          className="w-full bg-[#2a3942] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#25d366]"
        />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          autoComplete="email"
          className="w-full bg-[#2a3942] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#25d366]"
        />
        {isWayMB ? (
          <PhoneInput
            required
            value={phone}
            onChange={setPhone}
            placeholder="912 345 678"
          />
        ) : (
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefone (opcional)"
            autoComplete="tel"
            className="w-full bg-[#2a3942] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#25d366]"
          />
        )}
        {formError && (
          <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">{formError}</p>
        )}
        <button
          type="submit"
          className="w-full py-3.5 rounded-xl font-semibold text-white text-base transition-opacity hover:opacity-90"
          style={{ backgroundColor: btnColor }}
        >
          {event.button_text ?? 'Pagar agora'}
        </button>
      </form>

      {isWayMB && (
        <button onClick={() => { setFormError(''); setStep('method'); }}
          className="block w-full text-xs text-gray-600 hover:text-gray-400 transition-colors text-center">
          ← Trocar método de pagamento
        </button>
      )}

      <p className="text-center text-gray-600 text-xs">{t('secure_note', 'Pagamento Seguro • Seus dados estão seguros', 'Pagamento Seguro • Os seus dados estão protegidos')}</p>
    </div>
  );
}

/* ─── Countdown Timer ───────────────────────────────────────────────────── */

function CountdownOverlay({ event, onDismiss }: { event: PublicEvent; onDismiss: () => void }) {
  const totalSeconds = event.duration_seconds > 0 ? event.duration_seconds : 300;
  const [remaining, setRemaining] = useState(totalSeconds);
  const btnColor = event.button_color ?? '#ef4444';
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(id); onDismissRef.current(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div
      className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center px-6 z-50"
      onClick={e => e.stopPropagation()}
    >
      <div className="w-full max-w-sm space-y-5 text-center">
        <div className="flex items-center justify-center gap-2 text-red-400">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest">{xt(event, 'badge', 'Oferta por tempo limitado')}</span>
        </div>
        <h2 className="text-white text-xl font-bold">{event.title}</h2>
        {event.description && <p className="text-gray-300 text-sm">{event.description}</p>}

        {/* Timer display */}
        <div className="flex justify-center gap-2">
          {(h > 0 ? [h, m, s] : [m, s]).map((val, i) => (
            <div key={i} className="text-center">
              <div className="bg-red-600 text-white text-3xl font-bold rounded-xl px-4 py-3 min-w-[64px] tabular-nums">
                {pad(val)}
              </div>
              <p className="text-gray-500 text-xs mt-1">
                {h > 0 ? ['h', 'm', 's'][i] : ['min', 'seg'][i]}
              </p>
            </div>
          ))}
        </div>

        {event.button_text && (
          <button
            onClick={onDismiss}
            className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-opacity hover:opacity-90"
            style={{ backgroundColor: btnColor }}
          >
            {event.button_text}
          </button>
        )}
        <button onClick={onDismiss} className="text-gray-600 text-xs hover:text-gray-400">
          Fechar
        </button>
      </div>
    </div>
  );
}

/* ─── Offer Call Overlay ─────────────────────────────────────────────────── */

function OfferCallOverlay({ event, onDismiss }: { event: PublicEvent; onDismiss: () => void }) {
  const btnColor = event.button_color ?? '#f59e0b';
  const targetUrl = event.offer_call_slug ? `/c/${event.offer_call_slug}` : '#';

  return (
    <div
      className="absolute inset-0 bg-[#0b141a] flex flex-col items-center justify-center px-6 z-50"
      onClick={e => e.stopPropagation()}
    >
      {/* Ícone de chamada pulsando */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: btnColor + '33' }}>
          <svg viewBox="0 0 24 24" fill={btnColor} className="w-10 h-10">
            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
          </svg>
        </div>
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-25"
          style={{ backgroundColor: btnColor }}
        />
      </div>

      <div className="text-center space-y-3 max-w-xs">
        <h2 className="text-white text-xl font-bold">{event.title || 'Nova chamada disponível'}</h2>
        {event.description && <p className="text-gray-400 text-sm">{event.description}</p>}

        <a
          href={targetUrl}
          className="block w-full py-4 rounded-2xl font-bold text-white text-base text-center transition-opacity hover:opacity-90 mt-4"
          style={{ backgroundColor: btnColor }}
        >
          {event.button_text || 'Entrar na chamada'}
        </a>

        <button onClick={onDismiss} className="text-gray-600 text-xs hover:text-gray-400 mt-2">
          {xt(event, 'dismiss_text', 'Agora não')}
        </button>
      </div>

      {/* Logo WhatsApp */}
      <div className="absolute bottom-8 flex items-center gap-2 text-[#8696a0]">
        <svg viewBox="0 0 24 24" fill="#8696a0" className="w-4 h-4">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.029 18.88a9.947 9.947 0 01-5.031-1.36l-.361-.214-3.742.981.999-3.648-.235-.374A9.86 9.86 0 012.1 12.045C2.1 6.545 6.545 2.1 12.045 2.1c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.898 6.988c-.003 5.45-4.437 9.894-9.902 9.894z" />
        </svg>
        <span className="text-xs">WhatsApp</span>
      </div>
    </div>
  );
}

/* ─── Signal Drop Overlay ───────────────────────────────────────────────── */

function SignalDropOverlay({ event, onDismiss }: { event: PublicEvent; onDismiss: () => void }) {
  const duration = event.duration_seconds > 0 ? event.duration_seconds : 4;
  const [phase, setPhase] = useState<'static' | 'reconnecting' | 'done'>('static');
  const [dots, setDots] = useState('');

  useEffect(() => {
    const dotsId = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    const t1 = setTimeout(() => setPhase('reconnecting'), duration * 500);
    const t2 = setTimeout(() => { setPhase('done'); onDismiss(); }, duration * 1000);
    return () => { clearInterval(dotsId); clearTimeout(t1); clearTimeout(t2); };
  }, [duration, onDismiss]);

  return (
    <div className="absolute inset-0 z-50 pointer-events-none">
      {/* Noise/static effect via CSS */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: phase === 'static' ? 0.55 : 0.2,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
          mixBlendMode: 'overlay',
        }}
      />
      {/* Dark vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)', opacity: phase === 'static' ? 1 : 0.4, transition: 'opacity 0.5s' }} />
      {/* Status text */}
      <div className="absolute bottom-32 left-0 right-0 flex justify-center">
        <div className="bg-black/70 rounded-xl px-4 py-2 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-white text-xs font-medium">
            {phase === 'static'
              ? `${event.title || 'Sinal fraco'}${dots}`
              : `${event.description || 'Reconectando'}${dots}`}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Reconnect Paywall Overlay ─────────────────────────────────────────── */

function ReconnectPaywallOverlay({ event, onDismiss, slug, currency = 'BRL', paymentGateway = 'zuckpay' }: { event: PublicEvent; onDismiss: () => void; slug: string; currency?: string; paymentGateway?: 'zuckpay' | 'waymb' }) {
  const isWayMB = paymentGateway === 'waymb';
  // WayMB atende leads em Portugal — defaults pt-PT; extra_texts tem prioridade.
  const t = (key: string, pt: string, es: string) => xt(event, key, isWayMB ? es : pt);
  type Phase = 'lost' | 'trying' | 'failed' | 'payment';
  const [phase, setPhase] = useState<Phase>('lost');
  const [attempt, setAttempt] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const dotsId = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(dotsId);
  }, []);

  useEffect(() => {
    if (phase === 'lost') {
      const t = setTimeout(() => { setPhase('trying'); setAttempt(1); }, 1800);
      return () => clearTimeout(t);
    }
    if (phase === 'trying' && attempt < 3) {
      const t = setTimeout(() => setAttempt(a => a + 1), 2200);
      return () => clearTimeout(t);
    }
    if (phase === 'trying' && attempt >= 3) {
      const t = setTimeout(() => setPhase('failed'), 1500);
      return () => clearTimeout(t);
    }
  }, [phase, attempt]);

  /* ── Conexão perdida ── */
  if (phase === 'lost') {
    return (
      <div className="absolute inset-0 z-50 bg-black/92 flex flex-col items-center justify-center px-6 gap-6" onClick={e => e.stopPropagation()}>
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12">
              <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-white text-xl font-bold">{t('lost_title', 'Sem conexão', 'Sem ligação')}</p>
          <p className="text-gray-400 text-sm">{t('lost_subtitle', 'Verificando a rede', 'A verificar a rede')}{dots}</p>
        </div>
      </div>
    );
  }

  /* ── Tentando reconectar ── */
  if (phase === 'trying') {
    return (
      <div className="absolute inset-0 z-50 bg-black/92 flex flex-col items-center justify-center px-6 gap-6" onClick={e => e.stopPropagation()}>
        <div className="w-20 h-20 rounded-full border-2 border-[#25d366]/30 flex items-center justify-center relative">
          <div className="absolute inset-0 rounded-full border-2 border-[#25d366] border-t-transparent animate-spin" />
          <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" stroke="#8696a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="text-center space-y-1">
          <p className="text-white text-lg font-semibold">{t('trying_title', 'Reconectando', 'A reconectar')}{dots}</p>
          <p className="text-gray-500 text-sm">{t('trying_subtitle', 'Tentativa', 'Tentativa')} {attempt} de 3</p>
        </div>
        <div className="flex gap-2">
          {[1,2,3].map(i => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${i <= attempt ? 'bg-[#25d366]' : 'bg-gray-700'}`} />
          ))}
        </div>
      </div>
    );
  }

  /* ── Falha — precisa pagar ── */
  if (phase === 'failed') {
    return (
      <div className="absolute inset-0 z-50 bg-[#0b141a] flex flex-col items-center justify-center px-6 gap-5" onClick={e => e.stopPropagation()}>
        <div className="w-20 h-20 rounded-full bg-[#1f2c34] flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" stroke="#8696a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="text-center space-y-2">
          <p className="text-white text-xl font-bold">{t('failed_title', 'Conexão instável', 'Ligação instável')}</p>
          <p className="text-gray-400 text-sm text-center">
            {event.description || (isWayMB
              ? 'A sua ligação foi interrompida. Para restaurar a chamada, é necessário continuar com o pacote de ligação.'
              : 'Sua conexão foi interrompida. Para restaurar a chamada, é necessário continuar com o pacote de conexão.')}
          </p>
        </div>
        <button
          onClick={() => setPhase('payment')}
          className="w-full max-w-xs py-4 rounded-2xl font-bold text-white text-base bg-[#25d366] active:opacity-90 transition-opacity shadow-lg"
          style={{ backgroundColor: event.button_color ?? '#25d366' }}
        >
          {event.button_text || (isWayMB ? 'Restaurar chamada' : 'Restaurar chamada')}
        </button>
        <p className="text-gray-600 text-xs text-center">{t('secure_note', '🔒 Pagamento seguro', '🔒 Pagamento seguro')}</p>
      </div>
    );
  }

  /* ── Tela de pagamento (reutiliza PixStep) ── */
  return (
    <div className="absolute inset-0 z-50 bg-[#0b141a] flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="bg-[#1f2c34] px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#25d366] flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.029 18.88a9.947 9.947 0 01-5.031-1.36l-.361-.214-3.742.981.999-3.648-.235-.374A9.86 9.86 0 012.1 12.045C2.1 6.545 6.545 2.1 12.045 2.1c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.898 6.988c-.003 5.45-4.437 9.894-9.902 9.894z"/>
          </svg>
        </div>
        <div>
          <span className="text-white font-semibold text-sm">{isWayMB ? 'Restaurar chamada' : 'Restaurar chamada'}</span>
          <p className="text-[#8696a0] text-xs">{isWayMB ? 'Pago vía WayMB' : 'Pagamento via PIX'}</p>
        </div>
      </div>
      <PixStep slug={slug} event={event} onDismiss={onDismiss} currency={currency} paymentGateway={paymentGateway} />
    </div>
  );
}

/* ─── Upsell Overlay ─────────────────────────────────────────────────────── */

function UpsellOverlay({ event, onDismiss }: { event: PublicEvent; onDismiss: () => void }) {
  const btnColor = event.button_color ?? '#ec4899';
  const navigate = useNavigate();

  function handleCTA() {
    onDismiss();
    if (event.upsell_slug) {
      navigate(`/u/${event.upsell_slug}`);
    }
  }

  return (
    <div
      className="absolute inset-0 flex items-end justify-center pb-20 px-4 z-50"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', border: `1px solid ${btnColor}33` }}
      >
        {/* Faixa de destaque */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${btnColor}, #7c3aed)` }} />

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: btnColor + '33' }}
            >
              <svg viewBox="0 0 24 24" fill={btnColor} className="w-4 h-4">
                <path d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: btnColor }}>{xt(event, 'badge', 'Oferta especial')}</span>
          </div>

          <div>
            <h3 className="text-white font-bold text-lg mb-1">{event.title}</h3>
            {event.description && <p className="text-gray-400 text-sm">{event.description}</p>}
          </div>

          <button
            onClick={handleCTA}
            className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: btnColor }}
          >
            {event.button_text || 'Quero isso'}
          </button>

          <button onClick={onDismiss} className="w-full text-center text-gray-600 text-xs hover:text-gray-400">
            {xt(event, 'dismiss_text', 'Fechar')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Screenshot Alert ──────────────────────────────────────────────────── */

function ScreenshotAlertOverlay({ event, onDismiss }: { event: PublicEvent; onDismiss: () => void }) {
  const duration = event.duration_seconds > 0 ? event.duration_seconds : 3.5;
  useEffect(() => {
    const t = setTimeout(onDismiss, duration * 1000);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  return (
    <div className="absolute inset-0 z-50 bg-red-900/95 flex flex-col items-center justify-center gap-4 px-6"
      onClick={onDismiss}>
      <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10" stroke="#ef4444" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          <path d="M3 3l18 18" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-center space-y-2">
        <p className="text-white text-xl font-black">{event.title || '⚠️ Atenção!'}</p>
        <p className="text-red-200 text-base font-semibold">{event.description || 'Ela viu que você tentou tirar print!'}</p>
        {event.button_text && <p className="text-red-300 text-sm">{event.button_text}</p>}
      </div>
    </div>
  );
}

/* ─── Battery Low ───────────────────────────────────────────────────────── */

function BatteryLowOverlay({ event, onDismiss }: { event: PublicEvent; onDismiss: () => void }) {
  const pct = parseInt(event.title || '3') || 3;
  const [dots, setDots] = useState('');
  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute top-0 left-0 right-0 z-50 flex justify-center pt-12">
      <div className="bg-[#1f2c34] border border-orange-500/40 rounded-2xl px-5 py-4 shadow-2xl max-w-xs w-full mx-4"
        onClick={onDismiss}>
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <svg viewBox="0 0 28 14" className="w-10 h-5">
              <rect x="0.5" y="0.5" width="25" height="13" rx="2.5" stroke="#ef4444" strokeWidth="1.5" fill="none"/>
              <rect x="26" y="4" width="2" height="6" rx="1" fill="#ef4444"/>
              <rect x="2" y="2" width={Math.max(1, (pct / 100) * 21)} height="10" rx="1.5" fill="#ef4444"/>
            </svg>
          </div>
          <div>
            <p className="text-orange-400 font-bold text-sm">Bateria fraca — {pct}%</p>
            <p className="text-gray-400 text-xs">{event.description || `A chamada pode cair a qualquer momento${dots}`}</p>
          </div>
        </div>
        <p className="text-gray-500 text-xs text-center">{xt(event, 'tap_hint', 'Toque para fechar')}</p>
      </div>
    </div>
  );
}

/* ─── Incoming Call ─────────────────────────────────────────────────────── */

function IncomingCallOverlay({ event, onDismiss }: { event: PublicEvent; onDismiss: () => void }) {
  const [ringing, setRinging] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setRinging(r => !r), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="absolute inset-0 z-50 bg-[#111b21]/95 flex flex-col items-center justify-center gap-6 px-6"
      onClick={e => e.stopPropagation()}>
      <div className={`w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center transition-transform duration-300 ${ringing ? 'scale-110' : 'scale-100'}`}>
        <svg viewBox="0 0 24 24" fill="#8696a0" className="w-12 h-12">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>
      </div>
      <div className="text-center space-y-1">
        <p className="text-white text-xl font-bold">{event.title || 'Contato desconhecido'}</p>
        <p className="text-[#25d366] text-sm font-medium">{xt(event, 'call_subtitle', 'Ligação de WhatsApp')}</p>
        {event.description && <p className="text-gray-400 text-xs">{event.description}</p>}
      </div>
      <div className="flex gap-12">
        <div className="flex flex-col items-center gap-2">
          <button onClick={onDismiss}
            className="w-16 h-16 rounded-full bg-[#f02849] flex items-center justify-center shadow-lg active:opacity-80">
            <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" transform="rotate(135 12 12)" />
            </svg>
          </button>
          <span className="text-white text-xs">{xt(event, 'decline_text', 'Recusar')}</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button onClick={onDismiss}
            className="w-16 h-16 rounded-full bg-[#25d366] flex items-center justify-center shadow-lg active:opacity-80 animate-pulse">
            <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
            </svg>
          </button>
          <span className="text-white text-xs">{xt(event, 'accept_text', 'Atender')}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Fake Gift ─────────────────────────────────────────────────────────── */

function FakeGiftOverlay({ event, onDismiss }: { event: PublicEvent; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, (event.duration_seconds || 4) * 1000);
    return () => clearTimeout(t);
  }, [event.duration_seconds, onDismiss]);

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-4 px-6"
      onClick={onDismiss}>
      <div className="text-6xl animate-bounce">🎁</div>
      <div className="text-center space-y-2">
        <p className="text-white text-xl font-bold">{event.title || 'Presente enviado!'}</p>
        {event.description && <p className="text-pink-300 text-sm">{event.description}</p>}
      </div>
      <div className="flex gap-2 text-2xl animate-pulse">
        {'✨🌟💫⭐✨'.split('').map((e, i) => <span key={i}>{e}</span>)}
      </div>
    </div>
  );
}

/* ─── Viewer Count ──────────────────────────────────────────────────────── */

function ViewerCountOverlay({ event, onDismiss }: { event: PublicEvent; onDismiss: () => void }) {
  const [count, setCount] = useState(parseInt(event.title?.replace(/\D/g, '') || '847'));
  useEffect(() => {
    const t = setTimeout(onDismiss, (event.duration_seconds || 5) * 1000);
    const id = setInterval(() => setCount(c => c + Math.floor(Math.random() * 3)), 800);
    return () => { clearTimeout(t); clearInterval(id); };
  }, [event.duration_seconds, onDismiss]);

  return (
    <div className="absolute top-16 left-0 right-0 flex justify-center z-50">
      <div className="bg-cyan-600/90 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg animate-pulse">
        <div className="w-2 h-2 rounded-full bg-white" />
        <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
        <span className="text-white font-bold text-sm">{count.toLocaleString('pt-BR')} {xt(event, 'suffix_text', 'ao vivo')}</span>
      </div>
    </div>
  );
}

/* ─── Social Proof ──────────────────────────────────────────────────────── */

function SocialProofOverlay({ event, onDismiss }: { event: PublicEvent; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, (event.duration_seconds || 5) * 1000);
    return () => clearTimeout(t);
  }, [event.duration_seconds, onDismiss]);

  return (
    <div className="absolute top-16 left-0 right-0 flex justify-center z-50 px-4">
      <div className="bg-purple-700/95 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 max-w-xs w-full"
        onClick={onDismiss}>
        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-snug">{event.title || 'João acabou de pagar R$ 49'}</p>
          <p className="text-purple-300 text-xs">{xt(event, 'time_text', 'agora mesmo')}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Exclusive Access ──────────────────────────────────────────────────── */

function ExclusiveAccessOverlay({ event, onDismiss }: { event: PublicEvent; onDismiss: () => void }) {
  const total = event.duration_seconds > 0 ? event.duration_seconds : 300;
  const [remaining, setRemaining] = useState(total);
  useEffect(() => {
    const id = setInterval(() => setRemaining(r => {
      if (r <= 1) { clearInterval(id); onDismiss(); return 0; }
      return r - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [onDismiss]);
  const m = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');

  return (
    <div className="absolute inset-0 z-50 bg-amber-900/90 flex flex-col items-center justify-center gap-5 px-6"
      onClick={e => e.stopPropagation()}>
      <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9" stroke="#f59e0b" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      </div>
      <div className="text-center space-y-2">
        <p className="text-white text-lg font-bold">{event.title || 'Acesso exclusivo encerrando'}</p>
        {event.description && <p className="text-amber-200 text-sm">{event.description}</p>}
      </div>
      <div className="bg-amber-500 rounded-2xl px-8 py-4">
        <p className="text-white text-4xl font-black tabular-nums">{m}:{s}</p>
      </div>
      <button onClick={onDismiss} className="text-amber-300/60 text-xs">{xt(event, 'dismiss_text', 'Fechar')}</button>
    </div>
  );
}

/* ─── Tip Jar ───────────────────────────────────────────────────────────── */

function TipJarOverlay({ event, onDismiss, onResume, slug, currency = 'BRL', paymentGateway = 'zuckpay' }: { event: PublicEvent; onDismiss: () => void; onResume?: () => void; slug: string; currency?: string; paymentGateway?: 'zuckpay' | 'waymb' }) {
  const [selected, setSelected] = useState<number | null>(null);
  const base = event.billing_amount_cents || 1000;
  const amounts = [base, base * 2, base * 5, base * 10];
  const [paying, setPaying] = useState(false);
  const btnColor = event.button_color ?? '#ec4899';

  if (paying && selected !== null) {
    const fakeEvent = { ...event, billing_amount_cents: selected };
    return (
      <div className="absolute inset-0 bg-[#0b141a] flex flex-col z-50" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: btnColor + '33' }}>
          <svg viewBox="0 0 24 24" fill={btnColor} className="w-5 h-5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          <span className="text-white font-semibold text-sm">{event.title || 'Presente 🎁'}</span>
        </div>
        <PixStep slug={slug} event={fakeEvent} onDismiss={onDismiss} onPaid={onResume ?? onDismiss} currency={currency} paymentGateway={paymentGateway} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-[#0b141a] flex flex-col z-50" onClick={e => e.stopPropagation()}>
      <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: btnColor + '33' }}>
        <span className="text-2xl">🎁</span>
        <span className="text-white font-semibold text-sm">{event.title || 'Manda um presente pra ela!'}</span>
      </div>
      {event.description && (
        <p className="text-gray-400 text-sm text-center px-4 pt-4">{event.description}</p>
      )}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-5">
        {amounts.map(v => (
          <button key={v} onClick={() => setSelected(v)}
            className={`w-full py-3.5 rounded-xl font-bold text-base transition-all active:scale-95 border-2 ${selected === v ? 'border-transparent text-white' : 'border-white/10 text-white/80 bg-white/5'}`}
            style={selected === v ? { backgroundColor: btnColor, borderColor: btnColor } : {}}>
            {formatPrice(v, currency)}
          </button>
        ))}
      </div>
      <div className="px-5 pb-6 space-y-3">
        <button
          onClick={() => { if (selected) setPaying(true); }}
          disabled={!selected}
          className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 disabled:opacity-40"
          style={{ backgroundColor: btnColor }}>
          {event.button_text || 'Enviar presente'} 💝
        </button>
        <button onClick={onDismiss} className="w-full text-center text-gray-600 text-xs">{xt(event, 'dismiss_text', 'Agora não')}</button>
      </div>
    </div>
  );
}

/* ─── Video Lock ────────────────────────────────────────────────────────── */

function VideoLockOverlay({ event, onDismiss, onResume, slug, currency = 'BRL', paymentGateway = 'zuckpay' }: { event: PublicEvent; onDismiss: () => void; onResume?: () => void; slug: string; currency?: string; paymentGateway?: 'zuckpay' | 'waymb' }) {
  const [paying, setPaying] = useState(false);
  const btnColor = event.button_color ?? '#6366f1';

  if (paying) {
    return (
      <div className="absolute inset-0 bg-[#0b141a] flex flex-col z-50" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 flex items-center gap-3 bg-indigo-900/40">
          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
          <span className="text-white font-semibold text-sm">{xt(event, 'pay_header', 'Desbloquear vídeo')}</span>
        </div>
        <PixStep slug={slug} event={event} onDismiss={onDismiss} onPaid={onResume ?? onDismiss} currency={currency} paymentGateway={paymentGateway} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 px-6"
      onClick={e => e.stopPropagation()}
      style={{ backdropFilter: 'blur(24px)', backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="#818cf8" className="w-10 h-10">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
        </svg>
      </div>
      <div className="text-center space-y-2">
        <p className="text-white text-xl font-bold">{event.title || 'Vídeo bloqueado'}</p>
        <p className="text-gray-300 text-sm">{event.description || 'Continue para desbloquear o momento'}</p>
        {event.billing_amount_cents > 0 && (
          <p className="text-indigo-400 font-bold text-2xl">{formatPrice(event.billing_amount_cents, currency)}</p>
        )}
      </div>
      <button onClick={() => setPaying(true)}
        className="w-full max-w-xs py-4 rounded-2xl font-bold text-white text-base active:scale-95 transition-all"
        style={{ backgroundColor: btnColor }}>
        {event.button_text || 'Desbloquear'}
      </button>
    </div>
  );
}

/* ─── Phone Block ───────────────────────────────────────────────────────── */

function PhoneBlockOverlay({ event, onDismiss, onResume, slug, currency = 'BRL', paymentGateway = 'zuckpay' }: { event: PublicEvent; onDismiss: () => void; onResume?: () => void; slug: string; currency?: string; paymentGateway?: 'zuckpay' | 'waymb' }) {
  const [paying, setPaying] = useState(false);
  const btnColor = event.button_color ?? '#ef4444';

  if (paying) {
    return (
      <div className="absolute inset-0 bg-[#0b141a] flex flex-col z-50" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 flex items-center gap-3 bg-red-900/40">
          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" transform="rotate(45 12 12)"/></svg>
          <span className="text-white font-semibold text-sm">{xt(event, 'pay_header', 'Liberar número')}</span>
        </div>
        <PixStep slug={slug} event={event} onDismiss={onDismiss} onPaid={onResume ?? onDismiss} currency={currency} paymentGateway={paymentGateway} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 bg-red-950/95 flex flex-col items-center justify-center gap-5 px-6"
      onClick={e => e.stopPropagation()}>
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12" stroke="#ef4444" strokeWidth={1.5} strokeLinecap="round">
            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" transform="rotate(45 12 12)"/>
          </svg>
        </div>
        <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-white text-xl font-bold">{event.title || 'Número bloqueado'}</p>
        <p className="text-gray-400 text-sm text-center leading-relaxed">{event.description || 'Seu número foi bloqueado temporariamente. Pague para liberar o contato.'}</p>
        {event.billing_amount_cents > 0 && (
          <p className="text-red-400 font-bold text-2xl">{formatPrice(event.billing_amount_cents, currency)}</p>
        )}
      </div>
      <button onClick={() => setPaying(true)}
        className="w-full max-w-xs py-4 rounded-2xl font-bold text-white text-base active:scale-95 transition-all"
        style={{ backgroundColor: btnColor }}>
        {event.button_text || 'Liberar número'}
      </button>
    </div>
  );
}

/* ─── Age Gate Overlay ──────────────────────────────────────────────────── */

function AgeGateOverlay({ event, onDismiss, onResume, slug, currency = 'BRL', paymentGateway = 'zuckpay' }: { event: PublicEvent; onDismiss: () => void; onResume?: () => void; slug: string; currency?: string; paymentGateway?: 'zuckpay' | 'waymb' }) {
  const [paying, setPaying] = useState(false);

  if (paying) {
    return (
      <div className="absolute inset-0 bg-[#0b141a] flex flex-col z-50" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 flex items-center gap-3 bg-yellow-900/30">
          <span className="text-xl">🔞</span>
          <span className="text-white font-semibold text-sm">{xt(event, 'pay_header', 'Verificação de maioridade')}</span>
        </div>
        <PixStep slug={slug} event={event} onDismiss={onDismiss} onPaid={onResume ?? onDismiss} currency={currency} paymentGateway={paymentGateway} />
      </div>
    );
  }

  const btnColor = event.button_color ?? '#f59e0b';

  return (
    <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center gap-5 px-6"
      onClick={e => e.stopPropagation()}>
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-yellow-500/10 flex items-center justify-center">
          <span className="text-5xl select-none">🔞</span>
        </div>
        <div className="absolute inset-0 rounded-full bg-yellow-500/15 animate-ping" style={{ animationDuration: '2s' }} />
      </div>
      <div className="text-center space-y-2">
        <p className="text-white text-xl font-bold">{event.title || 'Conteúdo +18'}</p>
        <p className="text-gray-400 text-sm text-center leading-relaxed">{event.description || 'Para confirmar que você é maior de idade, é necessário realizar uma verificação rápida.'}</p>
        {event.billing_amount_cents > 0 && (
          <p className="text-yellow-400 font-bold text-2xl">{formatPrice(event.billing_amount_cents, currency)}</p>
        )}
      </div>
      <div className="w-full max-w-xs bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
        <p className="text-yellow-300 text-xs text-center leading-relaxed">
          {xt(event, 'verify_note', 'Uma cobrança simbólica é usada para verificar que você possui um cartão válido registrado em nome de um adulto.')}
        </p>
      </div>
      <button onClick={() => setPaying(true)}
        className="w-full max-w-xs py-4 rounded-2xl font-bold text-base active:scale-95 transition-all"
        style={{ backgroundColor: btnColor, color: '#1a1a1a' }}>
        {event.button_text || 'Confirmar maioridade'}
      </button>
      <button onClick={onDismiss} className="text-gray-600 text-xs hover:text-gray-400 transition-colors">
        Fechar
      </button>
    </div>
  );
}

/* ─── Componente principal ──────────────────────────────────────────────── */

export function EventOverlay({ event, onDismiss, onResume, currency = 'BRL', paymentGateway = 'zuckpay' }: Props) {
  // Para billing, precisamos do slug da URL para chamar a API pública.
  const { slug } = useParams<{ slug: string }>();
  const btnColor = event.button_color ?? '#25d366';

  const handleDismiss = onResume ?? onDismiss;

  // Auto-dismiss baseado em duration_seconds (0 = nunca auto-dismiss)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (event.duration_seconds > 0 && event.type !== 'countdown' && event.type !== 'reconnect_paywall' && event.type !== 'signal_drop' && event.type !== 'age_gate' && event.type !== 'video_lock' && event.type !== 'phone_block' && event.type !== 'tip_jar') {
      timerRef.current = setTimeout(onDismiss, event.duration_seconds * 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [event.id, event.duration_seconds, event.type, onDismiss]);

  if (event.type === 'signal_drop') {
    return <SignalDropOverlay event={event} onDismiss={onDismiss} />;
  }

  if (event.type === 'reconnect_paywall') {
    return <ReconnectPaywallOverlay event={event} onDismiss={handleDismiss} slug={slug ?? ''} currency={currency} paymentGateway={paymentGateway} />;
  }

  if (event.type === 'countdown') {
    return <CountdownOverlay event={event} onDismiss={onDismiss} />;
  }

  if (event.type === 'offer_call') {
    return <OfferCallOverlay event={event} onDismiss={onDismiss} />;
  }

  if (event.type === 'upsell') {
    return <UpsellOverlay event={event} onDismiss={onDismiss} />;
  }

  if (event.type === 'popup') {
    return (
      <div className="absolute inset-0 flex items-end justify-center pb-24 px-4 z-50">
        <div
          className="w-full max-w-sm bg-[#1f2c34] border border-white/10 rounded-2xl p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-white font-semibold text-base mb-1">{event.title}</h3>
          {event.description && (
            <p className="text-gray-400 text-sm mb-4">{event.description}</p>
          )}
          <button
            onClick={onDismiss}
            className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: btnColor }}
          >
            {event.button_text ?? 'OK'}
          </button>
        </div>
      </div>
    );
  }

  if (event.type === 'fullscreen') {
    return (
      <div
        className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center px-6 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center max-w-sm space-y-4">
          <h2 className="text-white text-2xl font-bold">{event.title}</h2>
          {event.description && (
            <p className="text-gray-300 text-sm">{event.description}</p>
          )}
          <button
            onClick={onDismiss}
            className="px-8 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: btnColor }}
          >
            {event.button_text ?? 'Continuar'}
          </button>
        </div>
      </div>
    );
  }

  if (event.type === 'screenshot_alert') {
    return <ScreenshotAlertOverlay event={event} onDismiss={onDismiss} />;
  }

  if (event.type === 'battery_low') {
    return <BatteryLowOverlay event={event} onDismiss={onDismiss} />;
  }

  if (event.type === 'incoming_call') {
    return <IncomingCallOverlay event={event} onDismiss={onDismiss} />;
  }

  if (event.type === 'fake_gift') {
    return <FakeGiftOverlay event={event} onDismiss={onDismiss} />;
  }

  if (event.type === 'viewer_count') {
    return <ViewerCountOverlay event={event} onDismiss={onDismiss} />;
  }

  if (event.type === 'social_proof') {
    return <SocialProofOverlay event={event} onDismiss={onDismiss} />;
  }

  if (event.type === 'exclusive_access') {
    return <ExclusiveAccessOverlay event={event} onDismiss={onDismiss} />;
  }

  if (event.type === 'tip_jar') {
    return <TipJarOverlay event={event} onDismiss={onDismiss} onResume={onResume} slug={slug ?? ''} currency={currency} paymentGateway={paymentGateway} />;
  }

  if (event.type === 'video_lock') {
    return <VideoLockOverlay event={event} onDismiss={onDismiss} onResume={onResume} slug={slug ?? ''} currency={currency} paymentGateway={paymentGateway} />;
  }

  if (event.type === 'phone_block') {
    return <PhoneBlockOverlay event={event} onDismiss={onDismiss} onResume={onResume} slug={slug ?? ''} currency={currency} paymentGateway={paymentGateway} />;
  }

  if (event.type === 'age_gate') {
    return <AgeGateOverlay event={event} onDismiss={onDismiss} onResume={onResume} slug={slug ?? ''} currency={currency} paymentGateway={paymentGateway} />;
  }

  // fake_billing — integração real com o gateway ativo
  return (
    <div
      className="absolute inset-0 bg-[#0b141a] flex flex-col z-50"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header estilo WhatsApp Pay */}
      <div className="bg-[#1f2c34] px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#25d366] flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.029 18.88a9.947 9.947 0 01-5.031-1.36l-.361-.214-3.742.981.999-3.648-.235-.374A9.86 9.86 0 012.1 12.045C2.1 6.545 6.545 2.1 12.045 2.1c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.898 6.988c-.003 5.45-4.437 9.894-9.902 9.894z"/>
          </svg>
        </div>
        <span className="text-white font-semibold text-sm">{xt(event, 'pay_header', 'WhatsApp Pay')}</span>
      </div>

      <PixStep slug={slug ?? ''} event={event} onDismiss={onDismiss} onPaid={onResume ?? onDismiss} currency={currency} paymentGateway={paymentGateway} />
    </div>
  );
}
