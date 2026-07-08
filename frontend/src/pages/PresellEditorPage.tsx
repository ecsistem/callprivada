import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createPresell, updatePresell, getPresell, uploadPresellImage, listDownsells, listUpsells,
  TEMPLATES, DOWNSELL_TEMPLATES, UPSELL_TEMPLATES, getTemplateDefaults,
  type PresellConfig, type UpsertPresellPayload, type PresellPage,
} from '../services/presellService';
import { listCalls } from '../services/callService';
import { PresellPreview } from '../components/presell/PresellPreview';
import { ImageDropzone } from '../components/ui/ImageDropzone';
import { useImageUpload } from '../hooks/use-image-upload';
import {
  ArrowLeft, Check, AlertCircle, LayoutTemplate,
  Palette, Type, Phone, ExternalLink, Plus, Trash2,
} from 'lucide-react';

const inputCls = "w-full bg-[#111115] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/20 transition-all";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${value ? 'bg-green-500' : 'bg-white/10'}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

const defaultConfig = (): PresellConfig => ({
  bg_color: '#0a0a0a',
  text_color: '#ffffff',
  bg_image_url: '',
  avatar_url: '',
  name: '',
  badge: '🔴 AO VIVO AGORA',
  headline: 'Você chegou na hora certa — só sobrou 1 vaga',
  subheadline: 'Estou online agora e escolhi você. Selecione um horário abaixo antes que feche.',
  show_slots: true,
  slot_labels: [],
  use_real_time: true,
  show_viewer_count: true,
  viewer_count_base: 43,
  show_countdown: true,
  countdown_seconds: 300,
  cta_text: '🔥 Garantir minha vaga agora',
  cta_color: '#dc2626',
  redirect_url: '',
  downsell_slug: '',
});

const SECTIONS = [
  { id: 'template', label: 'Template', icon: LayoutTemplate },
  { id: 'content', label: 'Conteúdo', icon: Type },
  { id: 'visual', label: 'Visual', icon: Palette },
  { id: 'cta', label: 'CTA & Destino', icon: ExternalLink },
];

interface PresellEditorPageProps {
  pageType?: string;
}

export default function PresellEditorPage({ pageType = 'presell' }: PresellEditorPageProps) {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const isDownsell = pageType === 'downsell';
  const isUpsell = pageType === 'upsell';
  const templates = isDownsell ? DOWNSELL_TEMPLATES : isUpsell ? UPSELL_TEMPLATES : TEMPLATES;
  const backPath = isDownsell ? '/downsell' : isUpsell ? '/upsell' : '/presell';
  const queryKey = isDownsell ? 'downsells' : isUpsell ? 'upsells' : 'presells';

  const [section, setSection] = useState('template');
  const [templateSlug, setTemplateSlug] = useState(isDownsell ? 'espera' : isUpsell ? 'upsell-vip' : 'ao-vivo');
  const [callId, setCallId] = useState('');
  const [config, setConfig] = useState<PresellConfig>(defaultConfig());
  const [error, setError] = useState('');

  // Slot rows — each has a label and an availability flag
  const [slotRows, setSlotRows] = useState<{ label: string; available: boolean }[]>([
    { label: 'Agora — 1 vaga disponível', available: true },
    { label: 'Em 15 min — 0 vagas', available: false },
    { label: 'Em 30 min — 0 vagas', available: false },
  ]);

  // Image uploads — files kept in state, uploaded after presell create/update
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);

  const avatarUpload = useImageUpload({
    onUpload: (file) => setAvatarFile(file),
    initialUrl: null,
  });
  const bgImageUpload = useImageUpload({
    onUpload: (file) => setBgImageFile(file),
    initialUrl: null,
  });

  // Load existing presell
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['presell', id],
    queryFn: () => getPresell(id!),
    enabled: isEditing,
  });

  // Load user's calls for redirect picker
  const { data: callsData } = useQuery({
    queryKey: ['calls', 1],
    queryFn: () => listCalls(1),
  });
  const calls = callsData?.data ?? [];

  const { data: downsellsData } = useQuery({
    queryKey: ['downsells', 1],
    queryFn: () => listDownsells(1),
    enabled: !isDownsell && !isUpsell,
  });
  const downsells: PresellPage[] = downsellsData?.data ?? [];

  const { data: upsellsData } = useQuery({
    queryKey: ['upsells', 1],
    queryFn: () => listUpsells(1),
    enabled: !isUpsell,
  });
  const upsells: PresellPage[] = upsellsData?.data ?? [];

  useEffect(() => {
    if (existing) {
      setTemplateSlug(existing.template_slug);
      setCallId(existing.call_id ?? '');
      setConfig(existing.config);
      const labels = existing.config.slot_labels ?? [];
      const avail = existing.config.slot_availability ?? labels.map(() => true);
      if (labels.length > 0) {
        setSlotRows(labels.map((label, i) => ({ label, available: avail[i] ?? true })));
      }
      if (existing.config.avatar_url) avatarUpload.setServerUrl(existing.config.avatar_url);
      if (existing.config.bg_image_url) bgImageUpload.setServerUrl(existing.config.bg_image_url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  // Keep config in sync with preview as images change
  useEffect(() => {
    if (avatarUpload.previewUrl !== undefined) {
      setConfig(prev => ({ ...prev, avatar_url: avatarUpload.previewUrl ?? '' }));
    }
  }, [avatarUpload.previewUrl]);

  useEffect(() => {
    if (bgImageUpload.previewUrl !== undefined) {
      setConfig(prev => ({ ...prev, bg_image_url: bgImageUpload.previewUrl ?? '' }));
    }
  }, [bgImageUpload.previewUrl]);

  const mut = useMutation({
    mutationFn: async (payload: UpsertPresellPayload) => {
      // 1. Save presell (create or update)
      const saved = isEditing
        ? await updatePresell(id!, payload)
        : await createPresell(payload);

      // 2. Upload pending images
      let avatarUrl = saved.config.avatar_url;
      let bgUrl = saved.config.bg_image_url;

      if (avatarFile) {
        const res = await uploadPresellImage(saved.id, avatarFile);
        avatarUrl = res.url;
        avatarUpload.setServerUrl(res.url);
        setAvatarFile(null);
      }
      if (bgImageFile) {
        const res = await uploadPresellImage(saved.id, bgImageFile);
        bgUrl = res.url;
        bgImageUpload.setServerUrl(res.url);
        setBgImageFile(null);
      }

      // 3. If images were uploaded, update presell with real URLs
      if (avatarFile || bgImageFile) {
        await updatePresell(saved.id, {
          ...payload,
          config: { ...payload.config, avatar_url: avatarUrl, bg_image_url: bgUrl },
        });
      }

      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      navigate(backPath);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setError(msg ?? 'Erro ao salvar. Tente novamente.');
    },
  });

  function applyTemplate(slug: string) {
    setTemplateSlug(slug);
    const defs = isDownsell
      ? (DOWNSELL_TEMPLATES.find(t => t.slug === slug)?.defaults ?? DOWNSELL_TEMPLATES[0].defaults)
      : isUpsell
        ? (UPSELL_TEMPLATES.find(t => t.slug === slug)?.defaults ?? UPSELL_TEMPLATES[0].defaults)
        : getTemplateDefaults(slug);
    setConfig(prev => ({ ...prev, ...defs }));
    if (defs.slot_labels) {
      const avail = defs.slot_availability ?? defs.slot_labels.map(() => true);
      setSlotRows(defs.slot_labels.map((label, i) => ({ label, available: avail[i] ?? true })));
    }
  }

  function setField<K extends keyof PresellConfig>(key: K, value: PresellConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: value }));
  }

  function syncSlotsToConfig(rows: { label: string; available: boolean }[]) {
    setField('slot_labels', rows.map(r => r.label));
    setField('slot_availability', rows.map(r => r.available));
  }

  function updateSlotRow(i: number, patch: Partial<{ label: string; available: boolean }>) {
    setSlotRows(prev => {
      const next = prev.map((r, idx) => idx === i ? { ...r, ...patch } : r);
      syncSlotsToConfig(next);
      return next;
    });
  }

  function addSlotRow() {
    setSlotRows(prev => {
      const next = [...prev, { label: '', available: false }];
      syncSlotsToConfig(next);
      return next;
    });
  }

  function removeSlotRow(i: number) {
    setSlotRows(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      syncSlotsToConfig(next);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const finalConfig = {
      ...config,
      slot_labels: slotRows.map(r => r.label),
      slot_availability: slotRows.map(r => r.available),
    };
    const payload: UpsertPresellPayload = { type: pageType, template_slug: templateSlug, config: finalConfig };
    if (callId) payload.call_id = callId;
    mut.mutate(payload);
  }

  if (isEditing && loadingExisting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-[#09090b]/90 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={backPath} className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-bold text-white">
              {isEditing
                ? `Editar ${isDownsell ? 'downsell' : isUpsell ? 'upsell' : 'presell'}`
                : `Nova ${isDownsell ? 'downsell' : isUpsell ? 'upsell' : 'presell'}`}
            </h1>
            <p className="text-xs text-gray-500">
              {isDownsell ? 'Página de recuperação de lead' : isUpsell ? 'Página pós-call / oferta de upgrade' : 'Página de agendamento de call'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={mut.isPending}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-green-900/30"
        >
          {mut.isPending ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Check size={15} />
          )}
          {isEditing ? 'Salvar' : `Criar ${isDownsell ? 'downsell' : isUpsell ? 'upsell' : 'presell'}`}
        </button>
      </div>

      <div className="flex gap-0 h-[calc(100vh-69px)]">
        {/* Left: editor */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-xl mx-auto p-6 space-y-6">

            {error && (
              <div className="flex items-center gap-2.5 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle size={15} className="shrink-0" />{error}
              </div>
            )}

            {/* Section tabs */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
              {SECTIONS.map(s => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSection(s.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      section === s.id
                        ? 'bg-[#18181b] text-white shadow'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Icon size={13} />
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ── Template ── */}
            {section === 'template' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Escolha um template</p>
                {templates.map(t => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => applyTemplate(t.slug)}
                    className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${
                      templateSlug === t.slug
                        ? 'bg-green-500/5 border-green-500/30'
                        : 'bg-[#18181b] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      templateSlug === t.slug ? 'bg-green-500/15' : 'bg-white/5'
                    }`}>
                      <LayoutTemplate size={16} className={templateSlug === t.slug ? 'text-green-400' : 'text-gray-500'} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{t.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t.description}</p>
                    </div>
                    {templateSlug === t.slug && (
                      <Check size={15} className="text-green-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* ── Conteúdo ── */}
            {section === 'content' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Textos e conteúdo</p>

                {/* Avatar dropzone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Foto do contato (avatar)</label>
                  <ImageDropzone
                    previewUrl={avatarUpload.previewUrl}
                    fileName={avatarUpload.fileName}
                    onFileChange={avatarUpload.handleFileChange}
                    onRemove={() => { avatarUpload.handleRemove(); setField('avatar_url', ''); }}
                    onClick={avatarUpload.handleThumbnailClick}
                    fileInputRef={avatarUpload.fileInputRef}
                    label="Clique ou arraste a foto"
                    hint="JPG, PNG ou WebP · aparece acima do nome"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Nome do contato</label>
                  <input value={config.name} onChange={e => setField('name', e.target.value)}
                    placeholder="ex: Ana Souza" className={inputCls} />
                  <p className="text-xs text-gray-600">Aparece abaixo do avatar</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Badge / etiqueta</label>
                  <input value={config.badge ?? ''} onChange={e => setField('badge', e.target.value)}
                    placeholder="ex: Consulta Gratuita" className={inputCls} />
                  <p className="text-xs text-gray-600">Pequeno chip no topo — deixe vazio para ocultar</p>
                </div>

                {/* Location badge */}
                <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                          <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2z" fill="#3b82f6" opacity="0.3"/>
                          <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2z" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round"/>
                          <circle cx="12" cy="12" r="2" fill="#3b82f6"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">Badge de localização</p>
                        <p className="text-[10px] text-gray-500">Cidade detectada automaticamente pelo IP do visitante</p>
                      </div>
                    </div>
                    <Toggle
                      value={!!(config.location_label || config.location_city)}
                      onChange={v => {
                        if (!v) { setField('location_label', ''); setField('location_city', ''); }
                        else setField('location_label', 'Ligação Exclusiva');
                      }}
                    />
                  </div>
                  {(config.location_label !== undefined || config.location_city !== undefined) &&
                    (config.location_label || config.location_city) && (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400">Rótulo (ex: "Ligação Exclusiva")</label>
                        <input
                          value={config.location_label ?? ''}
                          onChange={e => setField('location_label', e.target.value)}
                          placeholder="ex: Ligação Exclusiva"
                          className={inputCls}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400">Cidade de fallback (opcional)</label>
                        <input
                          value={config.location_city ?? ''}
                          onChange={e => setField('location_city', e.target.value)}
                          placeholder="ex: São Paulo — usado se detecção falhar"
                          className={inputCls}
                        />
                        <p className="text-xs text-gray-600">A cidade real do visitante é detectada pelo IP automaticamente</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Headline <span className="text-red-400">*</span></label>
                  <textarea value={config.headline} onChange={e => setField('headline', e.target.value)}
                    rows={2} placeholder="ex: Você foi selecionado para uma call exclusiva"
                    className={inputCls + ' resize-none'} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Subheadline</label>
                  <textarea value={config.subheadline ?? ''} onChange={e => setField('subheadline', e.target.value)}
                    rows={2} placeholder="ex: Tenho algo especial para te mostrar."
                    className={inputCls + ' resize-none'} />
                </div>

                {/* Slots */}
                <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">Horários disponíveis</p>
                      <p className="text-xs text-gray-600 mt-0.5">Exibir seletor de horário fake</p>
                    </div>
                    <Toggle value={config.show_slots} onChange={v => setField('show_slots', v)} />
                  </div>
                  {config.show_slots && (
                    <>
                      <div className="flex items-center justify-between py-1 border-t border-white/5">
                        <div>
                          <p className="text-sm font-medium text-white">Usar horário real do lead</p>
                          <p className="text-xs text-gray-600 mt-0.5">Substitui o texto do 1º slot pelo horário atual</p>
                        </div>
                        <Toggle value={config.use_real_time ?? false} onChange={v => setField('use_real_time', v)} />
                      </div>

                      {/* Per-slot editor */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-gray-400">Horários</label>
                          <span className="text-xs text-gray-600">Verde = disponível · Cinza = esgotado</span>
                        </div>
                        {slotRows.map((row, i) => (
                          <div key={i} className="flex items-center gap-2">
                            {/* Availability toggle pill */}
                            <button
                              type="button"
                              onClick={() => updateSlotRow(i, { available: !row.available })}
                              title={row.available ? 'Disponível — clique para esgotar' : 'Esgotado — clique para liberar'}
                              className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                row.available
                                  ? 'bg-green-500 border-green-400'
                                  : 'bg-white/5 border-white/20'
                              }`}
                            >
                              {row.available && <Check size={11} className="text-white" />}
                            </button>
                            <input
                              value={row.label}
                              onChange={e => updateSlotRow(i, { label: e.target.value })}
                              placeholder={`Horário ${i + 1}`}
                              className={`${inputCls} flex-1 text-sm ${!row.available ? 'opacity-50' : ''}`}
                            />
                            <button
                              type="button"
                              onClick={() => removeSlotRow(i)}
                              className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addSlotRow}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-white/10 text-xs text-gray-500 hover:text-white hover:border-white/20 transition-all"
                        >
                          <Plus size={13} /> Adicionar horário
                        </button>
                        <p className="text-xs text-gray-600">
                          Botões esgotados ficam desabilitados na página — lead só clica no disponível.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Social proof & urgência */}
                <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4 space-y-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Prova social & urgência</p>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">Contador de pessoas online</p>
                      <p className="text-xs text-gray-600 mt-0.5">"X pessoas tentando entrar agora"</p>
                    </div>
                    <Toggle value={config.show_viewer_count ?? false} onChange={v => setField('show_viewer_count', v)} />
                  </div>
                  {config.show_viewer_count && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-400">Base do contador (±15%)</label>
                      <input
                        type="number" min={5} max={999}
                        value={config.viewer_count_base ?? 35}
                        onChange={e => setField('viewer_count_base', Number(e.target.value))}
                        className={inputCls}
                      />
                      <p className="text-xs text-gray-600">Ex: 40 → exibe entre 34 e 46 aleatório</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div>
                      <p className="text-sm font-medium text-white">Countdown de urgência</p>
                      <p className="text-xs text-gray-600 mt-0.5">Timer regressivo visível antes do CTA</p>
                    </div>
                    <Toggle value={config.show_countdown ?? false} onChange={v => setField('show_countdown', v)} />
                  </div>
                  {config.show_countdown && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-400">Duração (segundos)</label>
                      <input
                        type="number" min={30} max={3600}
                        value={config.countdown_seconds ?? 300}
                        onChange={e => setField('countdown_seconds', Number(e.target.value))}
                        className={inputCls}
                      />
                      <p className="text-xs text-gray-600">300 = 5min · 600 = 10min · 900 = 15min</p>
                    </div>
                  )}
                </div>

                {/* Vídeo */}
                <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.8" className="w-4 h-4">
                        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-white">Vídeo</p>
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">URL do vídeo</label>
                      <input
                        value={config.video_url ?? ''}
                        onChange={e => setField('video_url', e.target.value)}
                        placeholder="https://... (MP4 direto ou link do YouTube)"
                        className={inputCls}
                      />
                      <p className="text-xs text-gray-600">Deixe em branco para ocultar. Suporta YouTube e MP4 direto.</p>
                    </div>
                    {config.video_url && (
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400">URL da thumbnail (opcional)</label>
                        <input
                          value={config.video_poster_url ?? ''}
                          onChange={e => setField('video_poster_url', e.target.value)}
                          placeholder="https://... (imagem exibida antes do play)"
                          className={inputCls}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Comentários */}
                <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" className="w-4 h-4">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-white">Comentários (prova social)</p>
                    </div>
                    <Toggle value={config.show_comments ?? false} onChange={v => setField('show_comments', v)} />
                  </div>

                  {config.show_comments && (
                    <div className="space-y-2">
                      {(config.comments ?? []).map((c, i) => (
                        <div key={i} className="bg-[#111115] border border-white/5 rounded-xl p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500">Nome</label>
                              <input
                                value={c.name}
                                onChange={e => {
                                  const next = [...(config.comments ?? [])];
                                  next[i] = { ...next[i], name: e.target.value };
                                  setField('comments', next);
                                }}
                                placeholder="ex: Maria S."
                                className={inputCls + ' text-xs py-2'}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500">Emoji avatar (opcional)</label>
                              <input
                                value={c.avatar_emoji ?? ''}
                                onChange={e => {
                                  const next = [...(config.comments ?? [])];
                                  next[i] = { ...next[i], avatar_emoji: e.target.value };
                                  setField('comments', next);
                                }}
                                placeholder="ex: 😍"
                                className={inputCls + ' text-xs py-2'}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500">Comentário</label>
                            <input
                              value={c.text}
                              onChange={e => {
                                const next = [...(config.comments ?? [])];
                                next[i] = { ...next[i], text: e.target.value };
                                setField('comments', next);
                              }}
                              placeholder="ex: Melhor decisão que já tomei 🔥"
                              className={inputCls + ' text-xs py-2'}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500">Tempo (ex: "2h atrás")</label>
                              <input
                                value={c.time ?? ''}
                                onChange={e => {
                                  const next = [...(config.comments ?? [])];
                                  next[i] = { ...next[i], time: e.target.value };
                                  setField('comments', next);
                                }}
                                placeholder="2h atrás"
                                className={inputCls + ' text-xs py-2'}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500">Curtidas</label>
                              <input
                                type="number" min={0}
                                value={c.likes ?? 0}
                                onChange={e => {
                                  const next = [...(config.comments ?? [])];
                                  next[i] = { ...next[i], likes: Number(e.target.value) };
                                  setField('comments', next);
                                }}
                                className={inputCls + ' text-xs py-2'}
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = (config.comments ?? []).filter((_, j) => j !== i);
                              setField('comments', next);
                            }}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >
                            Remover comentário
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...(config.comments ?? []), { name: '', text: '', time: '1h atrás', likes: 0 }];
                          setField('comments', next);
                        }}
                        className="w-full py-2 rounded-xl border border-dashed border-white/10 text-xs text-gray-500 hover:text-white hover:border-white/20 transition-all"
                      >
                        + Adicionar comentário
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Visual ── */}
            {section === 'visual' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Cores e visual</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400">Cor de fundo</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={config.bg_color} onChange={e => setField('bg_color', e.target.value)}
                        className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                      <input value={config.bg_color} onChange={e => setField('bg_color', e.target.value)}
                        className={inputCls} style={{ flex: 1 }} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400">Cor do texto</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={config.text_color} onChange={e => setField('text_color', e.target.value)}
                        className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                      <input value={config.text_color} onChange={e => setField('text_color', e.target.value)}
                        className={inputCls} style={{ flex: 1 }} />
                    </div>
                  </div>
                </div>

                {/* Background image dropzone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Imagem de fundo</label>
                  <ImageDropzone
                    previewUrl={bgImageUpload.previewUrl}
                    fileName={bgImageUpload.fileName}
                    onFileChange={bgImageUpload.handleFileChange}
                    onRemove={() => { bgImageUpload.handleRemove(); setField('bg_image_url', ''); }}
                    onClick={bgImageUpload.handleThumbnailClick}
                    fileInputRef={bgImageUpload.fileInputRef}
                    label="Clique ou arraste a imagem de fundo"
                    hint="JPG, PNG ou WebP · sobrepõe a cor de fundo"
                  />
                  <p className="text-xs text-gray-600">Use uma imagem escura para texto branco ficar legível</p>
                </div>
              </div>
            )}

            {/* ── CTA & Destino ── */}
            {section === 'cta' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Botão e destino</p>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Texto do botão</label>
                  <input value={config.cta_text} onChange={e => setField('cta_text', e.target.value)}
                    placeholder="ex: Entrar na Call Agora" className={inputCls} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Cor do botão</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={config.cta_color} onChange={e => setField('cta_color', e.target.value)}
                      className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                    <input value={config.cta_color} onChange={e => setField('cta_color', e.target.value)}
                      className={inputCls} style={{ flex: 1 }} />
                  </div>
                </div>

                {/* Funil picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Funil de destino</label>
                  {calls.length > 0 ? (
                    <select
                      value={callId}
                      onChange={e => {
                        setCallId(e.target.value);
                        const call = calls.find(c => c.id === e.target.value);
                        if (call) setField('redirect_url', `/c/${call.slug}`);
                        else if (!e.target.value) setField('redirect_url', '');
                      }}
                      className={inputCls + ' cursor-pointer'}
                    >
                      <option value="">— URL manual —</option>
                      {calls.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title} (/c/{c.slug})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-gray-600">Nenhum funil criado ainda.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">
                    {callId ? 'URL preenchida automaticamente' : 'URL de destino (manual)'}
                  </label>
                  <div className="relative">
                    <Phone size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input value={config.redirect_url} onChange={e => setField('redirect_url', e.target.value)}
                      placeholder="/c/abc123 ou https://..."
                      className={inputCls + ' pl-10'}
                      readOnly={Boolean(callId)} />
                  </div>
                  <p className="text-xs text-gray-600">Para onde o lead vai ao clicar no botão</p>
                </div>

                {!isDownsell && !isUpsell && (
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-400">Página Downsell (exit-intent)</label>
                      <Link to="/downsell/new" target="_blank"
                        className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">
                        + Criar downsell →
                      </Link>
                    </div>
                    {downsells.length === 0 ? (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-xs text-red-400">
                        Nenhuma página de downsell criada.{' '}
                        <Link to="/downsell/new" target="_blank" className="underline font-medium">
                          Crie uma agora
                        </Link>{' '}
                        — ela aparecerá quando o lead tentar sair.
                      </div>
                    ) : (
                      <select
                        value={config.downsell_slug ?? ''}
                        onChange={e => setField('downsell_slug', e.target.value)}
                        className={inputCls}
                      >
                        <option value="">— Nenhuma —</option>
                        {downsells.map(d => (
                          <option key={d.id} value={d.slug}>{d.config?.headline ?? d.slug}</option>
                        ))}
                      </select>
                    )}
                    <p className="text-xs text-gray-600">Modal aparece quando o visitante tentar sair (mouse no topo / trocar aba)</p>
                  </div>
                )}

                {!isUpsell && upsells.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <label className="text-xs font-medium text-gray-400">Página Upsell pós-call</label>
                    <select
                      value={upsells.find(u => config.redirect_url === `/u/${u.slug}`)?.id ?? ''}
                      onChange={e => {
                        const page = upsells.find(u => u.id === e.target.value);
                        setField('redirect_url', page ? `/u/${page.slug}` : '');
                      }}
                      className={inputCls}
                    >
                      <option value="">— Nenhuma —</option>
                      {upsells.map(u => (
                        <option key={u.id} value={u.id}>{u.config?.headline ?? u.slug}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-600">Página exibida após a call para fazer upsell</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div className="hidden lg:flex flex-col items-center justify-center w-[340px] shrink-0 border-l border-white/5 bg-[#0d0d0f] p-6 gap-4 sticky top-0 h-full overflow-hidden">
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Preview ao vivo</p>
          <div style={{ height: 700 * 0.45, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', width: '100%' }}>
            <PresellPreview templateSlug={templateSlug} config={config} scale={0.72} />
          </div>
        </div>
      </div>
    </div>
  );
}
