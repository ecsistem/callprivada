import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { dracofyPageview } from './lib/dracofy';
import { PrivateRoute } from './routes/PrivateRoute';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SubscriptionPage from './pages/SubscriptionPage';
import VideosPage from './pages/VideosPage';
import CallsPage from './pages/CallsPage';
import NewCallPage from './pages/NewCallPage';
import EditCallPage from './pages/EditCallPage';
import TimelineEditorPage from './pages/TimelineEditorPage';
import VideoEditorPage from './pages/VideoEditorPage';
import PaymentSettingsPage from './pages/PaymentSettingsPage';
import TrackingSettingsPage from './pages/TrackingSettingsPage';
import CallPublicPage from './pages/CallPublicPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminPage from './pages/AdminPage';
import PresellsPage from './pages/PresellsPage';
import PresellEditorPage from './pages/PresellEditorPage';
import PresellPublicPage from './pages/PresellPublicPage';
import DownsellsPage from './pages/DownsellsPage';
import DownsellEditorPage from './pages/DownsellEditorPage';
import DownsellPublicPage from './pages/DownsellPublicPage';
import UpsellsPage from './pages/UpsellsPage';
import UpsellEditorPage from './pages/UpsellEditorPage';
import UpsellPublicPage from './pages/UpsellPublicPage';
import FunnelsPage from './pages/FunnelsPage';

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
    <Routes>
      {/* Público */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
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

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
