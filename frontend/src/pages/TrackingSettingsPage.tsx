import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trackingService, type TrackingConfig } from '../services/trackingService';

const EMPTY: TrackingConfig = {
  facebook_pixel_id: '',
  tiktok_pixel_id: '',
  google_analytics_id: '',
  gtm_container_id: '',
  utmify_token: '',
  dracofy_token: '',
  custom_head_script: '',
};

export default function TrackingSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['tracking'],
    queryFn: trackingService.get,
  });

  const [form, setForm] = useState<TrackingConfig | null>(null);
  const current = form ?? data ?? EMPTY;

  const mutation = useMutation({
    mutationFn: trackingService.save,
    onSuccess: (saved) => {
      qc.setQueryData(['tracking'], saved);
      setForm(null);
    },
  });

  function set(key: keyof TrackingConfig, value: string) {
    setForm((prev) => ({ ...(prev ?? current), [key]: value }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Rastreamento</h1>
      <p className="text-gray-400 mb-8 text-sm">
        Configure seus pixels e scripts de rastreamento. Serão injetados automaticamente em todas as suas páginas públicas.
      </p>

      <div className="space-y-6">
        {/* Facebook Pixel */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">f</div>
            <div>
              <p className="text-white font-medium">Facebook / Meta Pixel</p>
              <p className="text-gray-500 text-xs">Conversões e remarketing</p>
            </div>
          </div>
          <input
            type="text"
            placeholder="Ex: 1234567890123456"
            value={current.facebook_pixel_id}
            onChange={(e) => set('facebook_pixel_id', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* TikTok Pixel */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-black border border-gray-600 flex items-center justify-center text-white font-bold text-sm">T</div>
            <div>
              <p className="text-white font-medium">TikTok Pixel</p>
              <p className="text-gray-500 text-xs">Rastreamento de conversões TikTok Ads</p>
            </div>
          </div>
          <input
            type="text"
            placeholder="Ex: C1A2B3D4E5F6G7H8"
            value={current.tiktok_pixel_id}
            onChange={(e) => set('tiktok_pixel_id', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Google Analytics */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-sm">G</div>
            <div>
              <p className="text-white font-medium">Google Analytics 4</p>
              <p className="text-gray-500 text-xs">Análise de tráfego e comportamento</p>
            </div>
          </div>
          <input
            type="text"
            placeholder="Ex: G-XXXXXXXXXX"
            value={current.google_analytics_id}
            onChange={(e) => set('google_analytics_id', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* GTM */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-400 flex items-center justify-center text-white font-bold text-xs">GTM</div>
            <div>
              <p className="text-white font-medium">Google Tag Manager</p>
              <p className="text-gray-500 text-xs">Gerenciador de tags centralizado</p>
            </div>
          </div>
          <input
            type="text"
            placeholder="Ex: GTM-XXXXXXX"
            value={current.gtm_container_id}
            onChange={(e) => set('gtm_container_id', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* UTMify */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">UTM</div>
            <div>
              <p className="text-white font-medium">UTMify</p>
              <p className="text-gray-500 text-xs">Rastreamento de UTMs e atribuição de vendas</p>
            </div>
          </div>
          <input
            type="text"
            placeholder="Seu token UTMify"
            value={current.utmify_token}
            onChange={(e) => set('utmify_token', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Dracofy */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-xs">D</div>
            <div>
              <p className="text-white font-medium">Dracofy</p>
              <p className="text-gray-500 text-xs">Rastreamento completo do funil de vendas</p>
            </div>
          </div>
          <input
            type="text"
            placeholder="Seu token Dracofy"
            value={current.dracofy_token}
            onChange={(e) => set('dracofy_token', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Custom Script */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-white font-bold text-xs">{'{}'}</div>
            <div>
              <p className="text-white font-medium">Script personalizado</p>
              <p className="text-gray-500 text-xs">Qualquer código HTML/JS injetado no &lt;head&gt;</p>
            </div>
          </div>
          <textarea
            rows={6}
            placeholder={'<script>\n  // seu código aqui\n</script>'}
            value={current.custom_head_script}
            onChange={(e) => set('custom_head_script', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => mutation.mutate(current)}
            disabled={mutation.isPending}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
          >
            {mutation.isPending ? 'Salvando...' : 'Salvar configurações'}
          </button>
          {mutation.isSuccess && (
            <span className="text-emerald-400 text-sm">Salvo com sucesso</span>
          )}
          {mutation.isError && (
            <span className="text-red-400 text-sm">Erro ao salvar</span>
          )}
        </div>
      </div>
    </div>
  );
}
