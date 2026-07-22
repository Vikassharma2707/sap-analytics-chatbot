import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SapSystemSettings {
  host: string;
  port: number;
  client: string;
  sid: string;
  username: string;
  password: string;
  authType: 'basic' | 'oauth2';
  sslVerify: boolean;
  protocol: 'http' | 'https';
  /** 'direct' = host:port, 'destination' = BTP Destination Service + Cloud Connector */
  connectionMode: 'direct' | 'destination';
  destinationName: string;
}

export interface ODataService {
  name: string;
  path: string;
  title: string;
  active: boolean;
  selected: boolean;
}

export interface CdsView {
  name: string;
  description: string;
  entity_set: string;
  service: string;
  selected: boolean;
}

export interface ConnectionStatus {
  state: 'unknown' | 'connected' | 'failed' | 'testing';
  message: string;
  lastChecked?: string;
}

interface SettingsState {
  system: SapSystemSettings;
  odataServices: ODataService[];
  cdsViews: CdsView[];
  connection: ConnectionStatus;
  setSystem: (s: Partial<SapSystemSettings>) => void;
  setOdataServices: (services: ODataService[]) => void;
  setCdsViews: (views: CdsView[]) => void;
  toggleOdata: (name: string) => void;
  toggleCds: (name: string) => void;
  selectAllOdata: (selected: boolean) => void;
  selectAllCds: (selected: boolean) => void;
  setConnection: (c: ConnectionStatus) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      system: {
        host: '9.100.1.115',
        port: 44300,
        client: '100',
        sid: 'S4H',
        username: 'basis',
        password: '',
        authType: 'basic',
        sslVerify: false,
        protocol: 'http',
        connectionMode: 'direct',
        destinationName: 'S4HANA_SYSTEM',
      },
      odataServices: [],
      cdsViews: [],
      connection: { state: 'unknown', message: 'Not tested yet' },

      setSystem: (s) => set((st) => ({ system: { ...st.system, ...s } })),
      setOdataServices: (services) => set({ odataServices: services }),
      setCdsViews: (views) => set({ cdsViews: views }),
      toggleOdata: (name) => set((st) => ({
        odataServices: st.odataServices.map((s) => s.name === name ? { ...s, selected: !s.selected } : s),
      })),
      toggleCds: (name) => set((st) => ({
        cdsViews: st.cdsViews.map((v) => v.name === name ? { ...v, selected: !v.selected } : v),
      })),
      selectAllOdata: (selected) => set((st) => ({
        odataServices: st.odataServices.map((s) => ({ ...s, selected })),
      })),
      selectAllCds: (selected) => set((st) => ({
        cdsViews: st.cdsViews.map((v) => ({ ...v, selected })),
      })),
      setConnection: (c) => set({ connection: c }),
    }),
    { name: 'sap-settings' }
  )
);
