import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, ChevronDown, CreditCard, ExternalLink, Eye, EyeOff, Globe, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CURRENCIES } from '../lib/currency';
import { getPaymentConfig, savePaymentConfig, type PaymentConfig } from '../services/paymentConfigService';

const inputCls = "w-full bg-[#1c0510] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FE015C]/50 focus:ring-1 focus:ring-[#FE015C]/20 transition-all font-mono";

function GatewayTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
        active
          ? 'bg-[#FE015C] text-white shadow-lg shadow-[#FE015C]/20'
          : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

export default function PaymentSettingsPage() {
  const qc = useQueryClient();

  // ZuckPay fields
  const [zpClientId, setZpClientId] = useState('');
  const [zpClientSecret, setZpClientSecret] = useState('');
  const [showZpSecret, setShowZpSecret] = useState(false);

  // WayMB fields
  const [wmbClientId, setWmbClientId] = useState('');
  const [wmbClientSecret, setWmbClientSecret] = useState('');
  const [wmbAccountEmail, setWmbAccountEmail] = useState('');
  const [showWmbSecret, setShowWmbSecret] = useState(false);

  // Active gateway + currency
  const [activeGateway, setActiveGateway] = useState<'zuckpay' | 'waymb'>('zuckpay');
  const [currency, setCurrency] = useState('BRL');

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery<PaymentConfig>({
    queryKey: ['payment-config'],
    queryFn: getPaymentConfig,
  });

  useEffect(() => {
    if (!data) return;
    setZpClientId(data.zuckpay_client_id ?? '');
    setWmbClientId(data.waymb_client_id ?? '');
    setWmbAccountEmail(data.waymb_account_email ?? '');
    setActiveGateway(data.active_gateway ?? 'zuckpay');
    setCurrency(data.currency ?? 'BRL');
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => savePaymentConfig({
      zuckpay_client_id: zpClientId,
      zuckpay_client_secret: zpClientSecret || undefined,
      waymb_client_id: wmbClientId,
      waymb_client_secret: wmbClientSecret || undefined,
      waymb_account_email: wmbAccountEmail,
      active_gateway: activeGateway,
      currency,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-config'] });
      setSuccess(true);
      setError('');
      setZpClientSecret('');
      setWmbClientSecret('');
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setError(msg ?? 'Erro ao salvar configuração.');
    },
  });

  const isAnyConfigured = data?.configured || data?.waymb_configured;
  const zpWebhookUrl = `${window.location.origin.replace(':5173', ':8080')}/api/v1/webhooks/zuckpay`;
  const wmbWebhookUrl = `${window.location.origin.replace(':5173', ':8080')}/api/v1/webhooks/waymb`;

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pagamento</h1>
        <p className="text-gray-500 text-sm mt-0.5">Gateway para cobranças nos overlays da chamada</p>
      </div>

      {/* Status geral */}
      {!isLoading && data && (
        <div className={`rounded-2xl p-4 border flex items-center gap-3 ${
          isAnyConfigured
            ? 'bg-green-500/5 border-green-500/20'
            : 'bg-yellow-500/5 border-yellow-500/20'
        }`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            isAnyConfigured ? 'bg-green-500/15' : 'bg-yellow-500/15'
          }`}>
            {isAnyConfigured
              ? <Check size={15} className="text-green-400" />
              : <AlertCircle size={15} className="text-yellow-400" />
            }
          </div>
          <div>
            <p className={`font-semibold text-sm ${isAnyConfigured ? 'text-green-400' : 'text-yellow-400'}`}>
              {isAnyConfigured
                ? `Gateway ativo: ${data.active_gateway === 'waymb' ? 'WayMB' : 'ZuckPay'}`
                : 'Nenhum gateway configurado'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isAnyConfigured
                ? 'Cobranças nos overlays funcionarão normalmente.'
                : 'Configure um gateway abaixo para habilitar cobranças.'}
            </p>
          </div>
        </div>
      )}

      {/* Seletor de gateway ativo */}
      <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Gateway ativo</p>
        <div className="flex gap-1.5 bg-[#0e0107] p-1 rounded-xl">
          <GatewayTab active={activeGateway === 'zuckpay'} label="ZuckPay (PIX)" onClick={() => setActiveGateway('zuckpay')} />
          <GatewayTab active={activeGateway === 'waymb'} label="WayMB (EU)" onClick={() => setActiveGateway('waymb')} />
        </div>
        <p className="text-xs text-gray-600">
          {activeGateway === 'waymb'
            ? 'Os overlays vão oferecer MB WAY e Multibanco como opções de pagamento.'
            : 'Os overlays vão gerar um QR Code PIX para pagamento.'}
        </p>
      </div>

      {/* Moeda */}
      <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
            <Globe size={15} className="text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-white">Moeda</p>
        </div>
        <p className="text-xs text-gray-500">Usada para exibir preços nos overlays de cobrança e na sua assinatura.</p>
        <div className="grid grid-cols-2 gap-2">
          {CURRENCIES.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCurrency(c.code)}
              className={`px-3 py-2.5 rounded-xl text-left text-sm transition-all border ${
                currency === c.code
                  ? 'border-[#FE015C]/60 bg-[#FE015C]/10 text-white'
                  : 'border-white/8 text-gray-400 hover:border-white/20 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Formulário */}
      <form
        onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
        className="space-y-4"
      >
        {success && (
          <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
            <Check size={15} /> Configurações salvas com sucesso!
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2.5 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {/* ZuckPay section */}
        <details className="bg-[#18181b] border border-white/5 rounded-2xl overflow-hidden" open={activeGateway === 'zuckpay'}>
          <summary className="flex items-center justify-between gap-3 p-5 cursor-pointer list-none">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Zap size={15} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">ZuckPay — PIX</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {data?.configured ? <span className="text-green-400">✓ Configurado</span> : 'Não configurado'}
                </p>
              </div>
            </div>
            <ChevronDown size={16} className="text-gray-500 shrink-0" />
          </summary>
          <div className="px-5 pb-5 space-y-4">
            <p className="text-xs text-gray-500 leading-relaxed">
              Receba PIX reais quando visitantes completarem cobranças nos overlays.{' '}
              <a href="https://www.zuckpay.com.br" target="_blank" rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
                Criar conta <ExternalLink size={10} />
              </a>
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Client ID</label>
              <input value={zpClientId} onChange={e => setZpClientId(e.target.value)}
                placeholder="seu_client_id" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">
                Client Secret
                {data?.configured && <span className="ml-2 text-gray-600">(em branco = manter atual)</span>}
              </label>
              <div className="relative">
                <input type={showZpSecret ? 'text' : 'password'}
                  value={zpClientSecret} onChange={e => setZpClientSecret(e.target.value)}
                  placeholder={data?.zuckpay_client_secret || 'seu_client_secret'}
                  className={inputCls + ' pr-11'} />
                <button type="button" onClick={() => setShowZpSecret(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showZpSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="pt-1 space-y-1.5">
              <p className="text-xs text-gray-500">Webhook URL:</p>
              <div className="flex items-center gap-2 bg-[#1c0510] border border-white/5 rounded-xl px-3 py-2.5">
                <code className="text-blue-400 text-xs flex-1 break-all">{zpWebhookUrl}</code>
                <button type="button" onClick={() => navigator.clipboard.writeText(zpWebhookUrl)}
                  className="text-gray-500 hover:text-white shrink-0"><Check size={13} /></button>
              </div>
            </div>
          </div>
        </details>

        {/* WayMB section */}
        <details className="bg-[#18181b] border border-white/5 rounded-2xl overflow-hidden" open={activeGateway === 'waymb'}>
          <summary className="flex items-center justify-between gap-3 p-5 cursor-pointer list-none">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FE015C]/10 flex items-center justify-center">
                <CreditCard size={15} className="text-[#FE015C]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">WayMB — MB WAY / Multibanco / Bizum</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {data?.waymb_configured ? <span className="text-green-400">✓ Configurado</span> : 'Não configurado'}
                </p>
              </div>
            </div>
            <ChevronDown size={16} className="text-gray-500 shrink-0" />
          </summary>
          <div className="px-5 pb-5 space-y-4">
            <p className="text-xs text-gray-500 leading-relaxed">
              Gateway europeu — aceita MB WAY, Multibanco e Bizum. Ideal para audiências de Portugal e Espanha.{' '}
              <a href="https://waymb.com" target="_blank" rel="noreferrer"
                className="text-[#FE015C]/80 hover:text-[#FE015C] inline-flex items-center gap-1">
                Criar conta <ExternalLink size={10} />
              </a>
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Client ID</label>
              <input value={wmbClientId} onChange={e => setWmbClientId(e.target.value)}
                placeholder="seu-client-id" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">
                Client Secret
                {data?.waymb_configured && <span className="ml-2 text-gray-600">(em branco = manter atual)</span>}
              </label>
              <div className="relative">
                <input type={showWmbSecret ? 'text' : 'password'}
                  value={wmbClientSecret} onChange={e => setWmbClientSecret(e.target.value)}
                  placeholder={data?.waymb_client_secret || 'seu-client-secret'}
                  className={inputCls + ' pr-11'} />
                <button type="button" onClick={() => setShowWmbSecret(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showWmbSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">E-mail da conta WayMB</label>
              <input type="email" value={wmbAccountEmail} onChange={e => setWmbAccountEmail(e.target.value)}
                placeholder="voce@suaempresa.com" className={inputCls} />
            </div>
            <div className="pt-1 space-y-1.5">
              <p className="text-xs text-gray-500">Webhook URL (callbackUrl):</p>
              <div className="flex items-center gap-2 bg-[#1c0510] border border-white/5 rounded-xl px-3 py-2.5">
                <code className="text-[#FE015C]/80 text-xs flex-1 break-all">{wmbWebhookUrl}</code>
                <button type="button" onClick={() => navigator.clipboard.writeText(wmbWebhookUrl)}
                  className="text-gray-500 hover:text-white shrink-0"><Check size={13} /></button>
              </div>
            </div>
          </div>
        </details>

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="w-full bg-[#FE015C] hover:bg-[#FD267D] disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-all shadow-lg shadow-[#FE015C]/25"
        >
          {saveMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Salvando…
            </span>
          ) : 'Salvar configurações'}
        </button>
      </form>
    </div>
  );
}
