import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { dracofyPageview } from './lib/dracofy';
import { PrivateRoute } from './routes/PrivateRoute';

// Code-splitting por rota: cada página vira um chunk separado, carregado sob
// demanda. Assim um lead que abre /c/:slug baixa só o necessário para ver a
// chamada — não o app inteiro (editor de vídeo, admin, etc.).
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const PendingApprovalPage = lazy(() => import('./pages/PendingApprovalPage'));
const CallPublicPage = lazy(() => import('./pages/CallPublicPage'));
const PresellPublicPage = lazy(() => import('./pages/PresellPublicPage'));
const DownsellPublicPage = lazy(() => import('./pages/DownsellPublicPage'));
const UpsellPublicPage = lazy(() => import('./pages/UpsellPublicPage'));

const AppLayout = lazy(() => import('./components/AppLayout'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const VideosPage = lazy(() => import('./pages/VideosPage'));
const CallsPage = lazy(() => import('./pages/CallsPage'));
const NewCallPage = lazy(() => import('./pages/NewCallPage'));
const EditCallPage = lazy(() => import('./pages/EditCallPage'));
const TimelineEditorPage = lazy(() => import('./pages/TimelineEditorPage'));
const VideoEditorPage = lazy(() => import('./pages/VideoEditorPage'));
const PaymentSettingsPage = lazy(() => import('./pages/PaymentSettingsPage'));
const TrackingSettingsPage = lazy(() => import('./pages/TrackingSettingsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const PresellsPage = lazy(() => import('./pages/PresellsPage'));
const PresellEditorPage = lazy(() => import('./pages/PresellEditorPage'));
const DownsellsPage = lazy(() => import('./pages/DownsellsPage'));
const DownsellEditorPage = lazy(() => import('./pages/DownsellEditorPage'));
const UpsellsPage = lazy(() => import('./pages/UpsellsPage'));
const UpsellEditorPage = lazy(() => import('./pages/UpsellEditorPage'));
const FunnelsPage = lazy(() => import('./pages/FunnelsPage'));

function RouteFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0b141a]">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const location = useLocation();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    dracofyPageview(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Público */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pending" element={<PendingApprovalPage />} />
        <Route path="/c/:slug" element={<CallPublicPage />} />
        <Route path="/p/:slug" element={<PresellPublicPage />} />
        <Route path="/d/:slug" element={<DownsellPublicPage />} />
        <Route path="/u/:slug" element={<UpsellPublicPage />} />

        {/* Privado — editor usa tela cheia, sem sidebar */}
        <Route element={<PrivateRoute />}>
          <Route path="/calls/:id/editor" element={<VideoEditorPage />} />
          <Route path="/calls/:id/timeline" element={<TimelineEditorPage />} />
          <Route path="/presell/new" element={<PresellEditorPage />} />
          <Route path="/presell/:id/edit" element={<PresellEditorPage />} />
          <Route path="/downsell/new" element={<DownsellEditorPage />} />
          <Route path="/downsell/:id/edit" element={<DownsellEditorPage />} />
          <Route path="/upsell/new" element={<UpsellEditorPage />} />
          <Route path="/upsell/:id/edit" element={<UpsellEditorPage />} />

          {/* Demais páginas usam AppLayout com sidebar */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
            <Route path="/videos" element={<VideosPage />} />
            <Route path="/calls" element={<CallsPage />} />
            <Route path="/calls/new" element={<NewCallPage />} />
            <Route path="/calls/:id/edit" element={<EditCallPage />} />
            <Route path="/calls/:id/analytics" element={<AnalyticsPage />} />
            <Route path="/settings/payment" element={<PaymentSettingsPage />} />
            <Route path="/settings/tracking" element={<TrackingSettingsPage />} />
            <Route path="/presell" element={<PresellsPage />} />
            <Route path="/downsell" element={<DownsellsPage />} />
            <Route path="/upsell" element={<UpsellsPage />} />
            <Route path="/funnels" element={<FunnelsPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
