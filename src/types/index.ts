// ============================================
// 3A RASTREAR — Tipos Globais
// ============================================

// --- GEOCERCA ---
export interface GeofencePoint {
  lat: number;
  lng: number;
}

export interface Geofence {
  id: string;
  name: string;
  type: 'circle' | 'polygon';
  center?: GeofencePoint;       // para círculo
  radius?: number;              // raio em metros (para círculo)
  points?: GeofencePoint[];     // vértices (para polígono)
  deviceIds: number[];          // veículos associados (vazio = todos)
  alertType: 'enter' | 'exit' | 'both';
  active: boolean;
  createdAt: string;
  color?: string;               // cor de exibição
}

export interface GeofenceEvent {
  id: string;
  geofenceId: string;
  geofenceName: string;
  deviceId: number;
  deviceName: string;
  type: 'enter' | 'exit';
  timestamp: string;
}

// --- BLOQUEIO REMOTO ---
export type BlockAction = 'block' | 'unblock';
export type BlockStatus = 'blocked' | 'unblocked' | 'pending' | 'error';

export interface BlockLog {
  id: string;
  deviceId: number;
  deviceName: string;
  action: BlockAction;
  operator: string;
  status: 'success' | 'error' | 'pending';
  message?: string;
  timestamp: string;
}

// --- ALERTAS ---
export type AlertPriority = 'high' | 'medium' | 'low';
export type AlertType = 'offline' | 'overspeed' | 'ignition_on' | 'ignition_off' | 'geofence_enter' | 'geofence_exit';

export interface AlertItem {
  id: string;
  deviceId: number;
  deviceName: string;
  type: AlertType;
  title: string;
  desc: string;
  priority: AlertPriority;
  time: string;
  read: boolean;
}
