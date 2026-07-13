import api from './api';

export interface TrackingConfig {
  facebook_pixel_id: string;
  tiktok_pixel_id: string;
  google_analytics_id: string;
  gtm_container_id: string;
  utmify_token: string;
  dracofy_token: string;
  clarity_project_id: string;
  custom_head_script: string;
}

export const trackingService = {
  get: async (): Promise<TrackingConfig> => {
    const { data } = await api.get('/settings/tracking');
    return data.data;
  },
  save: async (config: TrackingConfig): Promise<TrackingConfig> => {
    const { data } = await api.put('/settings/tracking', config);
    return data.data;
  },
};
