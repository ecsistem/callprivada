import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminStats, listAdminUsers, listAdminSubscriptions, listAdminCalls,
  listAuditLogs, blockUser, unblockUser, deleteAdminUser,
  cancelAdminSubscription, deleteAdminCall, deleteAdminPlan,
  impersonateUser, changeUserPassword,
} from '../services/adminService';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { type Plan } from '../services/subscriptionService';
import api from '../services/api';
import {
  Users, CreditCard, Phone, Eye, ScrollText, ChevronLeft, ChevronRight,
  Search, Shield, AlertCircle, InboxIcon, Settings, Plus, X, Check,
  LogIn, Key, Trash2,
} from 'lucide-react';
import { formatPrice } from '../lib/currency';

type Tab = 'stats' | 'users' | 'subscriptions' | 'calls' | 'logs' | 'plans';

const inputCls = "bg-[#1c0510] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FE015C]/60 focus:ring-1 focus:ring-[#FE015C]/20 transition-all";

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | undefined; color: string }) {
  return (
    <div className="bg-[#18181b] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">
          {value === undefined ? <span className="text-gray-600 text-lg">…</span> : value.toLocaleString('pt-BR')}
        </p>
      </div>
    </div>
  );
}

function Paginator({ page, total, perPage, onPage }: { page: number; total: number; perPage: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-2 mt-4 justify-end">
      <button onClick={() => onPage(page - 1)} disabled={page <= 1}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all">
        <ChevronLeft size={15} />
      </button>
      <span className="text-xs text-gray-500">{page} / {pages}</span>
      <button onClick={() => onPage(page + 1)} disabled={page >= pages}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all">
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

function Badge({ color, label }: { color: 'green' | 'red' | 'purple' | 'gray'; label: string }) {
  const cls = {
    green: 'text-green-400 bg-green-500/10',
    red: 'text-red-400 bg-red-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    gray: 'text-gray-500 bg-white/5',
  }[color];
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <InboxIcon size={32} className="text-gray-700 mb-3" />
      <p className="text-gray-500 text-sm">{label}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2.5 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
      <AlertCircle size={15} className="shrink-0" />{message}
    </div>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto -mx-1"><table className="w-full text-sm min-w-[600px]">{children}</table></div>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="pb-2 pr-4 text-left text-xs text-gray-500 font-medium">{children}</th>;
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={`py-2.5 pr-4 text-sm ${mono ? 'font-mono text-xs text-gray-500' : 'text-gray-300'}`}>{children}</td>;
}

const listAllPlans = () => api.get('/admin/plans').then(r => r.data.data as Plan[]);
const createPlan = (data: object) => api.post('/admin/plans', data).then(r => r.data.data as Plan);
const updatePlan = (id: string, data: object) => api.put(`/admin/plans/${id}`, data).then(r => r.data.data as Plan);
const createAdminUser = (data: object) => api.post('/admin/users', data).then(r => r.data.data);
const assignPlan = (userId: string, planId: string) => api.post(`/admin/users/${userId}/assign-plan`, { plan_id: planId });

const INTERVALS = ['MONTHLY', 'SEMIANNUALLY', 'ANNUALLY'] as const;
const intervalLabel = (i: string) => ({ MONTHLY: 'Mensal', SEMIANNUALLY: 'Semestral', ANNUALLY: 'Anual' }[i] || i);

type PlanForm = {
  name: string; price_cents: number; interval: string;
  abacate_pay_product_id: string; active: boolean;
  max_calls: number; max_presells: number; max_videos: number;
};

const emptyPlanForm = (): PlanForm => ({
  name: '', price_cents: 0, interval: 'MONTHLY',
  abacate_pay_product_id: '', active: true,
  max_calls: 0, max_presells: 0, max_videos: 0,
});

function PlanFormFields({ form, onChange }: { form: PlanForm; onChange: (f: PlanForm) => void }) {
  const set = (k: keyof PlanForm, v: unknown) => onChange({ ...form, [k]: v });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-xs text-gray-500">Nome do plano *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            className={inputCls + ' w-full'} placeholder="Ex: Starter" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Preço (centavos) *</label>
          <input type="number" min={1} value={form.price_cents} onChange={e => set('price_cents', parseInt(e.target.value) || 0)}
            className={inputCls + ' w-full'} placeholder="4990" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Recorrência *</label>
          <select value={form.interval} onChange={e => set('interval', e.target.value)}
            className={inputCls + ' w-full'}>
            {INTERVALS.map(i => <option key={i} value={i}>{intervalLabel(i)}</option>)}
          </select>
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs text-gray-500">AbacatePay Product ID</label>
          <input value={form.abacate_pay_product_id} onChange={e => set('abacate_pay_product_id', e.target.value)}
            className={inputCls + ' w-full'} placeholder="prod_..." />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(['max_calls', 'max_presells', 'max_videos'] as const).map(field => (
          <div key={field} className="space-y-1">
            <label className="text-xs text-gray-500">
              {field === 'max_calls' ? 'Máx Funis' : field === 'max_presells' ? 'Máx Presells' : 'Máx Vídeos'}
              <span className="text-gray-600 ml-1">(0=∞)</span>
            </label>
            <input type="number" min={0} value={form[field]}
              onChange={e => set(field, parseInt(e.target.value) || 0)}
              className={inputCls + ' w-full'} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="plan-active" checked={form.active} onChange={e => set('active', e.target.checked)}
          className="w-4 h-4 rounded accent-green-500" />
        <label htmlFor="plan-active" className="text-sm text-gray-400">Plano ativo (visível para assinatura)</label>
      </div>
    </div>
  );
}

function PlansTab() {
  const qc = useQueryClient();
  const { data: plans = [], isLoading, isError } = useQuery({ queryKey: ['admin-plans'], queryFn: listAllPlans });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<PlanForm>(emptyPlanForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PlanForm>(emptyPlanForm());

  const createMutation = useMutation({
    mutationFn: () => createPlan({ ...createForm }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); setShowCreate(false); setCreateForm(emptyPlanForm()); },
  });

  const updateMutation = useMutation({
    mutationFn: () => updatePlan(editingId!, { ...editForm }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminPlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-plans'] }),
  });

  const startEdit = (p: Plan) => {
    setEditingId(p.id);
    setEditForm({
      name: p.name, price_cents: p.price_cents, interval: p.interval,
      abacate_pay_product_id: p.abacate_pay_product_id || '',
      active: p.active, max_calls: p.max_calls, max_presells: p.max_presells, max_videos: p.max_videos,
    });
  };

  if (isLoading) return <div className="animate-pulse h-32 bg-white/5 rounded-xl" />;
  if (isError) return <ErrorState message="Erro ao carregar planos." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Gerencie os planos pagos da plataforma. Não há plano gratuito.</p>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-xs bg-[#FE015C] hover:bg-[#FD267D] text-white px-3 py-2 rounded-xl font-semibold transition-all">
          <Plus size={13} /> Criar plano
        </button>
      </div>

      {showCreate && (
        <div className="border border-green-500/20 bg-green-500/5 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Novo plano</p>
            <button onClick={() => setShowCreate(false)}><X size={15} className="text-gray-500" /></button>
          </div>
          <PlanFormFields form={createForm} onChange={setCreateForm} />
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !createForm.name || !createForm.price_cents}
              className="flex items-center gap-1.5 text-xs bg-[#FE015C] hover:bg-[#FD267D] disabled:opacity-50 text-white px-4 py-2 rounded-xl font-semibold transition-all">
              <Check size={13} /> {createMutation.isPending ? 'Criando…' : 'Criar'}
            </button>
            <button onClick={() => setShowCreate(false)} className="text-xs text-gray-500 hover:text-white px-3 py-2">Cancelar</button>
          </div>
          {createMutation.isError && <ErrorState message="Erro ao criar plano." />}
        </div>
      )}

      {plans.length === 0 && <EmptyState label="Nenhum plano criado ainda." />}

      {plans.map(p => (
        <div key={p.id} className="border border-white/5 rounded-xl p-4 space-y-3">
          {editingId === p.id ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">Editando: {p.name}</p>
                <button onClick={() => setEditingId(null)}><X size={15} className="text-gray-500" /></button>
              </div>
              <PlanFormFields form={editForm} onChange={setEditForm} />
              <div className="flex gap-2 pt-1">
                <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}
                  className="flex items-center gap-1.5 text-xs bg-[#FE015C] hover:bg-[#FD267D] disabled:opacity-50 text-white px-4 py-2 rounded-xl font-semibold transition-all">
                  <Check size={13} /> {updateMutation.isPending ? 'Salvando…' : 'Salvar'}
                </button>
                <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-white px-3 py-2">Cancelar</button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm">{p.name}</p>
                    <Badge color={p.active ? 'green' : 'gray'} label={p.active ? 'Ativo' : 'Inativo'} />
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {formatPrice(p.price_cents)}/{intervalLabel(p.interval)}
                    {p.abacate_pay_product_id && <span className="ml-2 font-mono">{p.abacate_pay_product_id}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => startEdit(p)}
                    className="text-xs text-[#FE015C] hover:text-[#FD267D] font-medium transition-colors">
                    Editar
                  </button>
                  <button
                    onClick={() => { if (confirm(`Excluir plano "${p.name}"? Esta ação não pode ser desfeita.`)) deleteMutation.mutate(p.id); }}
                    disabled={deleteMutation.isPending}
                    className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors disabled:opacity-50 flex items-center gap-1">
                    <Trash2 size={11} /> Excluir
                  </button>
                </div>
              </div>
              <div className="flex gap-6 text-xs">
                <span className="text-gray-400">Funis: <span className="text-white font-medium">{p.max_calls === 0 ? '∞' : p.max_calls}</span></span>
                <span className="text-gray-400">Presells: <span className="text-white font-medium">{p.max_presells === 0 ? '∞' : p.max_presells}</span></span>
                <span className="text-gray-400">Vídeos: <span className="text-white font-medium">{p.max_videos === 0 ? '∞' : p.max_videos}</span></span>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [input, setInput] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '' });
  const [assigningUser, setAssigningUser] = useState<{ id: string; name: string } | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [changingPwd, setChangingPwd] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [impersonating, setImpersonating] = useState<string | null>(null);
  useAuthStore(); // trigger re-render on auth change
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['admin-users', page, search], queryFn: () => listAdminUsers(page, search) });
  const { data: plans = [] } = useQuery({ queryKey: ['admin-plans'], queryFn: listAllPlans });
  const block = useMutation({ mutationFn: blockUser, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }) });
  const unblock = useMutation({ mutationFn: unblockUser, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }) });
  const del = useMutation({ mutationFn: deleteAdminUser, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }) });

  const changePwdMutation = useMutation({
    mutationFn: () => changeUserPassword(changingPwd!.id, newPassword),
    onSuccess: () => { setChangingPwd(null); setNewPassword(''); },
  });

  const handleImpersonate = async (u: { id: string; name: string; email: string; role: string }) => {
    setImpersonating(u.id);
    try {
      const { access_token } = await impersonateUser(u.id);
      const { setAuth } = useAuthStore.getState();
      setAuth({ id: u.id, name: u.name, email: u.email, role: u.role, created_at: '' }, access_token, '');
      navigate('/dashboard');
    } finally {
      setImpersonating(null);
    }
  };

  const createMutation = useMutation({
    mutationFn: () => createAdminUser(createForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setShowCreate(false);
      setCreateForm({ name: '', email: '', password: '' });
    },
  });

  const assignMutation = useMutation({
    mutationFn: () => assignPlan(assigningUser!.id, selectedPlanId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setAssigningUser(null);
      setSelectedPlanId('');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <form onSubmit={(e) => { e.preventDefault(); setSearch(input); setPage(1); }} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Buscar por nome ou email…"
              className={inputCls + ' w-full pl-9'} />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-[#FE015C] hover:bg-[#FD267D] text-white rounded-xl text-sm font-semibold transition-all">
            Buscar
          </button>
        </form>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-all whitespace-nowrap">
          <Plus size={14} /> Criar usuário
        </button>
      </div>

      {showCreate && (
        <div className="border border-white/10 bg-[#1c0510] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Criar usuário</p>
            <button onClick={() => setShowCreate(false)}><X size={15} className="text-gray-500" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Nome *</label>
              <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                className={inputCls + ' w-full'} placeholder="Maria Silva" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Email *</label>
              <input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                className={inputCls + ' w-full'} placeholder="maria@email.com" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-gray-500">Senha *</label>
              <input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                className={inputCls + ' w-full'} placeholder="mínimo 6 caracteres" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !createForm.name || !createForm.email || createForm.password.length < 6}
              className="flex items-center gap-1.5 text-xs bg-[#FE015C] hover:bg-[#FD267D] disabled:opacity-50 text-white px-4 py-2 rounded-xl font-semibold transition-all">
              <Check size={13} /> {createMutation.isPending ? 'Criando…' : 'Criar'}
            </button>
            <button onClick={() => setShowCreate(false)} className="text-xs text-gray-500 hover:text-white px-3 py-2">Cancelar</button>
          </div>
          {createMutation.isError && <ErrorState message="Erro ao criar usuário. Email pode já estar em uso." />}
        </div>
      )}

      {assigningUser && (
        <div className="border border-blue-500/20 bg-blue-500/5 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Vincular plano — {assigningUser.name}</p>
            <button onClick={() => setAssigningUser(null)}><X size={15} className="text-gray-500" /></button>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Selecione o plano</label>
            <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)}
              className={inputCls + ' w-full'}>
              <option value="">— escolha um plano —</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatPrice(p.price_cents)}/{intervalLabel(p.interval)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending || !selectedPlanId}
              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-semibold transition-all">
              <Check size={13} /> {assignMutation.isPending ? 'Vinculando…' : 'Vincular'}
            </button>
            <button onClick={() => setAssigningUser(null)} className="text-xs text-gray-500 hover:text-white px-3 py-2">Cancelar</button>
          </div>
          {assignMutation.isError && <ErrorState message="Erro ao vincular plano." />}
        </div>
      )}

      {changingPwd && (
        <div className="border border-[#FE015C]/20 bg-[#FE015C]/5 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <Key size={14} className="text-[#FE015C]" />
              Alterar senha — {changingPwd.name}
            </p>
            <button onClick={() => { setChangingPwd(null); setNewPassword(''); }}><X size={15} className="text-gray-500" /></button>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Nova senha (mín. 6 caracteres)</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className={inputCls + ' w-full'}
              placeholder="••••••••"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => changePwdMutation.mutate()}
              disabled={changePwdMutation.isPending || newPassword.length < 6}
              className="flex items-center gap-1.5 text-xs bg-[#FE015C] hover:bg-[#FD267D] disabled:opacity-50 text-white px-4 py-2 rounded-xl font-semibold transition-all">
              <Check size={13} /> {changePwdMutation.isPending ? 'Salvando…' : 'Salvar senha'}
            </button>
            <button onClick={() => { setChangingPwd(null); setNewPassword(''); }} className="text-xs text-gray-500 hover:text-white px-3 py-2">Cancelar</button>
          </div>
          {changePwdMutation.isError && <ErrorState message="Erro ao alterar senha." />}
          {changePwdMutation.isSuccess && <p className="text-xs text-green-400">Senha alterada com sucesso.</p>}
        </div>
      )}

      {isLoading ? <div className="h-48 bg-white/5 rounded-xl animate-pulse" /> : isError ? (
        <ErrorState message="Erro ao carregar usuários." />
      ) : !data?.data?.length ? (
        <EmptyState label="Nenhum usuário encontrado." />
      ) : (
        <>
          <TableWrap>
            <thead><tr>{['Nome','Email','Role','Status','Ações'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {data.data.map((u) => (
                <tr key={u.id} className="border-t border-white/5">
                  <Td>{u.name}</Td>
                  <Td mono>{u.email}</Td>
                  <Td><Badge color={u.role === 'admin' ? 'purple' : 'gray'} label={u.role} /></Td>
                  <Td><Badge color={u.is_blocked ? 'red' : 'green'} label={u.is_blocked ? 'Bloqueado' : 'Ativo'} /></Td>
                  <td className="py-2.5 flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => handleImpersonate(u)}
                      disabled={impersonating === u.id}
                      className="text-xs text-[#FE015C] hover:text-[#FD267D] font-medium flex items-center gap-1 disabled:opacity-50 transition-colors"
                      title="Acessar dashboard deste usuário">
                      <LogIn size={11} /> {impersonating === u.id ? 'Acessando…' : 'Acessar'}
                    </button>
                    <button onClick={() => { setAssigningUser({ id: u.id, name: u.name }); setSelectedPlanId(''); }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium">Plano</button>
                    <button
                      onClick={() => { setChangingPwd({ id: u.id, name: u.name }); setNewPassword(''); }}
                      className="text-xs text-yellow-400 hover:text-yellow-300 font-medium flex items-center gap-1">
                      <Key size={11} /> Senha
                    </button>
                    {u.is_blocked
                      ? <button onClick={() => unblock.mutate(u.id)} className="text-xs text-green-400 hover:text-green-300 font-medium">Desbloquear</button>
                      : <button onClick={() => block.mutate(u.id)} className="text-xs text-gray-400 hover:text-gray-300 font-medium">Bloquear</button>
                    }
                    <button onClick={() => { if (confirm(`Excluir ${u.name}?`)) del.mutate(u.id); }}
                      className="text-xs text-red-400 hover:text-red-300 font-medium">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          {data && <Paginator page={page} total={data.total} perPage={data.per_page} onPage={setPage} />}
        </>
      )}
    </div>
  );
}

function SubscriptionsTab() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['admin-subs', page], queryFn: () => listAdminSubscriptions(page) });
  const cancel = useMutation({ mutationFn: cancelAdminSubscription, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-subs'] }) });

  return (
    <div className="space-y-4">
      {isLoading ? <div className="h-48 bg-white/5 rounded-xl animate-pulse" /> : isError ? (
        <ErrorState message="Erro ao carregar assinaturas." />
      ) : !data?.data?.length ? (
        <EmptyState label="Nenhuma assinatura encontrada." />
      ) : (
        <>
          <TableWrap>
            <thead><tr>{['Usuário','Email','Status','Criado','Ação'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {data.data.map((s: { id: string; user_id: string; user_name?: string; user_email?: string; status: string; created_at: string }) => (
                <tr key={s.id} className="border-t border-white/5">
                  <Td>{s.user_name || '—'}</Td>
                  <Td mono>{s.user_email || s.user_id.slice(0, 8) + '…'}</Td>
                  <Td><Badge color={s.status === 'active' ? 'green' : 'gray'} label={s.status} /></Td>
                  <Td>{new Date(s.created_at).toLocaleDateString('pt-BR')}</Td>
                  <td className="py-2.5">
                    {s.status === 'active' && (
                      <button onClick={() => { if (confirm('Cancelar assinatura?')) cancel.mutate(s.id); }}
                        className="text-xs text-red-400 hover:text-red-300 font-medium">Cancelar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Paginator page={page} total={data.total} perPage={data.per_page} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function CallsTab() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['admin-calls', page], queryFn: () => listAdminCalls(page) });
  const del = useMutation({ mutationFn: deleteAdminCall, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-calls'] }) });

  return (
    <div className="space-y-4">
      {isLoading ? <div className="h-48 bg-white/5 rounded-xl animate-pulse" /> : isError ? (
        <ErrorState message="Erro ao carregar chamadas." />
      ) : !data?.data?.length ? (
        <EmptyState label="Nenhuma chamada encontrada." />
      ) : (
        <>
          <TableWrap>
            <thead><tr>{['Título','Slug','Status','Criado','Ação'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {data.data.map((c) => (
                <tr key={c.id} className="border-t border-white/5">
                  <Td>{c.title}</Td>
                  <Td mono>{c.slug}</Td>
                  <Td><Badge color={c.is_active ? 'green' : 'gray'} label={c.is_active ? 'Ativa' : 'Inativa'} /></Td>
                  <Td>{new Date(c.created_at).toLocaleDateString('pt-BR')}</Td>
                  <td className="py-2.5">
                    <button onClick={() => { if (confirm(`Excluir "${c.title}"?`)) del.mutate(c.id); }}
                      className="text-xs text-red-400 hover:text-red-300 font-medium">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Paginator page={page} total={data.total} perPage={data.per_page} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function AuditLogsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useQuery({ queryKey: ['admin-logs', page], queryFn: () => listAuditLogs(page) });

  return (
    <div className="space-y-4">
      {isLoading ? <div className="h-48 bg-white/5 rounded-xl animate-pulse" /> : isError ? (
        <ErrorState message="Erro ao carregar logs." />
      ) : !data?.data?.length ? (
        <EmptyState label="Nenhum log de auditoria encontrado." />
      ) : (
        <>
          <TableWrap>
            <thead><tr>{['Ação','Alvo','Detalhe','Data'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {data.data.map((l) => (
                <tr key={l.id} className="border-t border-white/5">
                  <td className="py-2.5 pr-4 font-mono text-xs text-purple-400">{l.action}</td>
                  <Td>{l.target}{l.target_id ? ` (${l.target_id.slice(0, 8)}…)` : ''}</Td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500 max-w-[200px] truncate">{l.detail || '—'}</td>
                  <td className="py-2.5 text-xs text-gray-500">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Paginator page={page} total={data.total} perPage={data.per_page} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('stats');

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    enabled: tab === 'stats',
  });

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'stats', label: 'Visão Geral', icon: <Shield size={14} /> },
    { key: 'users', label: 'Usuários', icon: <Users size={14} /> },
    { key: 'subscriptions', label: 'Assinaturas', icon: <CreditCard size={14} /> },
    { key: 'calls', label: 'Chamadas', icon: <Phone size={14} /> },
    { key: 'logs', label: 'Audit Log', icon: <ScrollText size={14} /> },
    { key: 'plans', label: 'Planos', icon: <Settings size={14} /> },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Painel Admin</h1>
        <p className="text-gray-500 text-sm mt-0.5">Gerenciamento interno da plataforma</p>
      </div>

      <div className="flex gap-1 overflow-x-auto bg-white/5 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.key
                ? 'bg-[#18181b] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6">
        {tab === 'stats' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat icon={<Users size={20} className="text-blue-400" />} label="Usuários" value={stats?.total_users} color="bg-blue-500/10" />
            <Stat icon={<CreditCard size={20} className="text-green-400" />} label="Assin. Ativas" value={stats?.active_subscriptions} color="bg-green-500/10" />
            <Stat icon={<Phone size={20} className="text-purple-400" />} label="Chamadas" value={stats?.total_calls} color="bg-purple-500/10" />
            <Stat icon={<Eye size={20} className="text-orange-400" />} label="Visitas" value={stats?.total_visits} color="bg-orange-500/10" />
          </div>
        )}
        {tab === 'users' && <UsersTab />}
        {tab === 'subscriptions' && <SubscriptionsTab />}
        {tab === 'calls' && <CallsTab />}
        {tab === 'logs' && <AuditLogsTab />}
        {tab === 'plans' && <PlansTab />}
      </div>
    </div>
  );
}
