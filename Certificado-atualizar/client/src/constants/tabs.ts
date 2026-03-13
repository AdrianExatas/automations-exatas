export type TabId = 'sieg' | 'unecont' | 'onvio';

export interface TabConfig {
  id: TabId;
  label: string;
  panelId: string;
}

export const TABS: TabConfig[] = [
  { id: 'sieg', label: 'SIEG', panelId: 'panel-sieg' },
  { id: 'unecont', label: 'UNECONT', panelId: 'panel-unecont' },
  { id: 'onvio', label: 'ONVIO', panelId: 'panel-onvio' },
];
