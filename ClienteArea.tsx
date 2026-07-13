import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from './router';
// import { getDevices, getPositions, validateSession, sendCommand, getRouteHistory } from './src/services/traccarApi';
import { getCustomers, AsaasCustomer } from './src/services/asaasApi';

// Mocks temporários das funções do Traccar
const getDevices = async () => [];
const getPositions = async () => [];
const validateSession = async () => false;
const sendCommand = async (deviceId: number, commandType: string) => ({ success: false });
const getRouteHistory = async (deviceId: number, from: string, to: string) => [];
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polygon, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { getDistanceInMeters, isPointInPolygon } from './src/utils/geofenceMath';


// Interface para logs de comandos
interface CommandLog {
  id: string;
  time: string;
  operator: string;
  vehicle: string;
  action: string;
  result: string;
}

// Interface para Geocercas (Cercas Virtuais)
interface Geofence {
  id: string;
  name: string;
  type: 'circle' | 'polygon';
  center?: { lat: number; lng: number };
  radius?: number; // em metros
  coordinates?: { lat: number; lng: number }[];
  deviceId: number;
  deviceName: string;
  alertType: 'entry' | 'exit' | 'both';
  active: boolean;
  createdAt: string;
}

// Interface para Alertas
interface AlertItem {
  id: string;
  deviceId: number;
  deviceName: string;
  type: 'offline' | 'overspeed' | 'ignition_on' | 'ignition_off' | 'geofence_in' | 'geofence_out';
  title: string;
  desc: string;
  priority: 'high' | 'medium' | 'low';
  time: string;
  read: boolean;
}

// Helper component to update map center dynamically
const ChangeMapView: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

// Custom premium vehicle icons for Leaflet
const getCustomCarIcon = (color: 'emerald' | 'yellow' | 'red', iconName: string = 'directions_car') => {
  const primaryColor = color === 'emerald' ? 'from-emerald-400 to-emerald-600' : (color === 'red' ? 'from-red-400 to-red-600' : 'from-yellow-400 to-yellow-600');
  const shadowColor = color === 'emerald' ? 'rgba(16,185,129,0.6)' : (color === 'red' ? 'rgba(239,68,68,0.6)' : 'rgba(234,179,8,0.6)');
  const pulseBg = color === 'emerald' ? 'bg-emerald-500/25' : (color === 'red' ? 'bg-red-500/25' : 'bg-yellow-500/25');
  const pulseBorder = color === 'emerald' ? 'bg-emerald-500/15' : (color === 'red' ? 'bg-red-500/15' : 'bg-yellow-500/15');
  
  const iconMap: Record<string, string> = {
    directions_car: 'directions_car',
    two_wheeler: 'two_wheeler',
    local_shipping: 'local_shipping',
    directions_bus: 'directions_bus'
  };
  const fontIcon = iconMap[iconName] || 'directions_car';

  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="relative flex items-center justify-center" style="width: 40px; height: 40px;">
      <div class="absolute -inset-4 rounded-full ${pulseBg} animate-ping opacity-75"></div>
      <div class="absolute -inset-2 rounded-full ${pulseBorder} animate-pulse"></div>
      <div class="h-10 w-10 bg-gradient-to-br ${primaryColor} rounded-full flex items-center justify-center shadow-[0_0_20px_${shadowColor}] border-2 border-white">
        <span class="material-icons-round text-white text-[16px] leading-none" style="display: block;">${fontIcon}</span>
      </div>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Route History View Component
const RouteHistoryView: React.FC<{ device: any; navigate: (path: string) => void }> = ({ device, navigate }) => {
  const [routePoints, setRoutePoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 16);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 16));
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await getRouteHistory(device.id, new Date(dateFrom).toISOString(), new Date(dateTo).toISOString());
      setRoutePoints(data || []);
    } catch (e) {
      console.error('Erro ao buscar histórico:', e);
      setRoutePoints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const setPreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDateFrom(from.toISOString().slice(0, 16));
    setDateTo(to.toISOString().slice(0, 16));
  };

  const totalPointsCount = routePoints.length;
  const speeds = routePoints.map(p => (p.speed || 0) * 1.852);
  const maxSpeed = speeds.length > 0 ? Math.round(Math.max(...speeds)) : 0;
  const avgSpeed = speeds.length > 0 ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0;
  
  let totalDistanceKm = 0;
  if (routePoints.length > 1) {
    for (let i = 1; i < routePoints.length; i++) {
      const p1 = routePoints[i - 1];
      const p2 = routePoints[i];
      const R = 6371;
      const dLat = (p2.latitude - p1.latitude) * Math.PI / 180;
      const dLng = (p2.longitude - p1.longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(p1.latitude * Math.PI / 180) * Math.cos(p2.latitude * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      totalDistanceKm += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
  }

  const totalTimeMs = routePoints.length >= 2
    ? new Date(routePoints[routePoints.length - 1].deviceTime).getTime() - new Date(routePoints[0].deviceTime).getTime()
    : 0;
  const totalHours = Math.floor(totalTimeMs / 3600000);
  const totalMinutes = Math.floor((totalTimeMs % 3600000) / 60000);

  const polylinePositions = routePoints
    .filter(p => p.latitude && p.longitude)
    .map(p => [p.latitude, p.longitude] as [number, number]);

  const mapCenter: [number, number] = polylinePositions.length > 0
    ? polylinePositions[Math.floor(polylinePositions.length / 2)]
    : [-8.05389, -34.88111];

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto my-4 px-2 sm:px-0 animate-fade-in-up gap-4">
      {/* Header */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-6 backdrop-blur-xl relative">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FBBF24]/20 to-transparent"></div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
              <span className="material-icons-round text-primary text-xl">route</span>
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-white tracking-widest leading-none">
                Histórico de Rotas
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5 flex items-center gap-1.5">
                Veículo: <span className="text-primary">{device.name}</span>
                <span className="text-[8px] text-slate-500 font-mono">({device.uniqueId})</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/cliente')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
          >
            <span className="material-icons-round text-xs">arrow_back</span>
            Voltar
          </button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="flex-1 grid grid-cols-2 gap-3 w-full">
            <div>
              <label className="block text-[8px] uppercase font-black text-slate-500 tracking-wider mb-1.5">Data Início</label>
              <input
                type="datetime-local"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/5 focus:border-primary rounded-xl py-2 px-3 text-[11px] text-white outline-none transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-[8px] uppercase font-black text-slate-500 tracking-wider mb-1.5">Data Fim</label>
              <input
                type="datetime-local"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/5 focus:border-primary rounded-xl py-2 px-3 text-[11px] text-white outline-none transition-all font-mono"
              />
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { label: 'Hoje', days: 1 },
              { label: '7 dias', days: 7 },
              { label: '30 dias', days: 30 },
              { label: '4 meses', days: 120 },
            ].map(p => (
              <button
                key={p.label}
                onClick={() => setPreset(p.days)}
                className="px-2.5 py-1.5 bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/5 rounded-lg text-[8px] font-black uppercase tracking-wider text-slate-300 transition-all active:scale-95"
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="px-4 py-1.5 bg-primary hover:bg-yellow-500 text-secondary rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1 disabled:opacity-50"
            >
              <span className="material-icons-round text-xs">{loading ? 'hourglass_empty' : 'search'}</span>
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {routePoints.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: 'straighten', label: 'Distância Total', value: `${totalDistanceKm.toFixed(1)} km`, color: 'text-blue-400' },
            { icon: 'speed', label: 'Vel. Média', value: `${avgSpeed} km/h`, color: 'text-emerald-400' },
            { icon: 'shutter_speed', label: 'Vel. Máxima', value: `${maxSpeed} km/h`, color: 'text-red-400' },
            { icon: 'timer', label: 'Tempo Total', value: `${totalHours}h ${totalMinutes}min`, color: 'text-purple-400' },
          ].map((s, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className={`material-icons-round text-sm ${s.color}`}>{s.icon}</span>
                <span className="text-[7px] uppercase font-black text-slate-500 tracking-wider">{s.label}</span>
              </div>
              <span className="text-sm font-black text-white font-mono">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Map with Polyline */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden" style={{ height: '350px' }}>
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Carregando rota...</p>
          </div>
        ) : polylinePositions.length > 0 ? (
          <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ChangeMapView center={mapCenter} />
            <Polyline
              positions={polylinePositions}
              pathOptions={{ color: '#FBBF24', weight: 3, opacity: 0.8 }}
            />
            <Marker position={polylinePositions[0]}>
              <Popup><strong>Início</strong><br/>{new Date(routePoints[0].deviceTime).toLocaleString('pt-BR')}</Popup>
            </Marker>
            <Marker position={polylinePositions[polylinePositions.length - 1]}>
              <Popup><strong>Fim</strong><br/>{new Date(routePoints[routePoints.length - 1].deviceTime).toLocaleString('pt-BR')}</Popup>
            </Marker>
          </MapContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2">
            <span className="material-icons-round text-slate-600 text-3xl">map</span>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Nenhum ponto de rota encontrado para o período selecionado</p>
          </div>
        )}
      </div>

      {/* Points Table */}
      {routePoints.length > 0 && (
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
              <span className="material-icons-round text-primary text-sm">list</span>
              Pontos Registrados ({totalPointsCount})
            </h4>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-950/90 backdrop-blur z-10">
                <tr className="text-[8px] uppercase font-black text-slate-500 tracking-wider border-b border-white/5">
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Data/Hora</th>
                  <th className="py-2.5 px-4">Latitude</th>
                  <th className="py-2.5 px-4">Longitude</th>
                  <th className="py-2.5 px-4">Velocidade</th>
                  <th className="py-2.5 px-4">Ignição</th>
                  <th className="py-2.5 px-4">Endereço</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {routePoints.map((pt, idx) => (
                  <tr
                    key={pt.id || idx}
                    className={`text-[10px] hover:bg-white/[0.02] transition-colors cursor-pointer ${selectedPoint?.id === pt.id ? 'bg-primary/5' : ''}`}
                    onClick={() => setSelectedPoint(pt)}
                  >
                    <td className="py-2 px-4 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-2 px-4 text-white font-mono">{new Date(pt.deviceTime).toLocaleString('pt-BR')}</td>
                    <td className="py-2 px-4 text-slate-300 font-mono">{pt.latitude?.toFixed(6)}</td>
                    <td className="py-2 px-4 text-slate-300 font-mono">{pt.longitude?.toFixed(6)}</td>
                    <td className="py-2 px-4 font-bold">
                      <span className={`${(pt.speed || 0) * 1.852 > 80 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {Math.round((pt.speed || 0) * 1.852)} km/h
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      <span className={`inline-flex items-center gap-1 ${pt.attributes?.ignition ? 'text-emerald-400' : 'text-slate-500'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${pt.attributes?.ignition ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                        {pt.attributes?.ignition ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-slate-400 max-w-[200px] truncate">{pt.address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export const ClienteArea: React.FC = () => {
  const { navigate, currentPath } = useRouter();

  // Estado para registro do cliente logado (verificação de bloqueio)
  const [currentUserRecord, setCurrentUserRecord] = useState<AsaasCustomer | null>(null);

  // Estado para configurações de alertas inteligentes (persistido no localStorage)
  const [alertConfigs, setAlertConfigs] = useState(() => {
    try {
      const stored = localStorage.getItem('3a-alert-configs');
      return stored ? JSON.parse(stored) : {
        ignition: true,
        overspeed: true,
        offline: true,
        geofence: true
      };
    } catch {
      return {
        ignition: true,
        overspeed: true,
        offline: true,
        geofence: true
      };
    }
  });

  // --- NEW SaaS STATES ---
  const [activeMobileTab, setActiveMobileTab] = useState<'map' | 'fleet' | 'control'>('map');
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; title: string; desc: string; type: string }[]>([]);

  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [vehicleIcons, setVehicleIcons] = useState<Record<number, string>>(() => {
    try {
      const stored = localStorage.getItem('3a-vehicle-icons');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [vehiclePhotos, setVehiclePhotos] = useState<Record<number, string>>(() => {
    try {
      const stored = localStorage.getItem('3a-vehicle-photos');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Sync alert filters from query parameters when path shifts
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const deviceIdParam = urlParams.get('deviceId');
      if (deviceIdParam) {
        setSelectedVehicleFilter(deviceIdParam);
      } else {
        setSelectedVehicleFilter('all');
      }
    } catch (e) {
      console.warn("Erro ao buscar filtros da URL:", e);
    }
  }, [currentPath]);

  // Real authentication check on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const stored = localStorage.getItem('3a-session');
        if (!stored) {
          navigate('/login');
          return;
        }
        const session = JSON.parse(stored);
        if (!session || !session.logged || !session.auth) {
          navigate('/login');
          return;
        }

        // Set admin user state
        setIsAdminUser(session.role === 'admin');

        // Validação em tempo real com o Traccar
        const isValid = await validateSession();
        if (!isValid) {
          alert("Sessão expirou ou não autorizada no servidor Traccar!");
          navigate('/login');
          return;
        }

        // Buscar registro do cliente logado no backend/localStorage para verificar status de suspensão
        try {
          const customers = await getCustomers();
          const email = session.email;
          const matched = customers.find((c: any) => c.email?.toLowerCase() === email?.toLowerCase());
          if (matched) {
            setCurrentUserRecord(matched);
          }
        } catch (err) {
          console.warn("Erro ao buscar dados do cliente:", err);
        }
      } catch (e) {
        navigate('/login');
      }
    };
    checkAuth();
  }, [navigate]);
  
  // Estados para simular telemetria em tempo real
  const [speed, setSpeed] = useState(62);
  const [battery, setBattery] = useState(98);
  const [ignition, setIgnition] = useState(true);
  const [carStatus, setCarStatus] = useState<'online' | 'blocked'>('online');

  // Estados da API Traccar
  const [devices, setDevices] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [selectedTraccarDevice, setSelectedTraccarDevice] = useState<any | null>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // --- STATE FOR REMOTE BLOCKING (Synced via localStorage) ---
  const [blockStates, setBlockStates] = useState<Record<number, 'blocked' | 'unblocked' | 'sending' | 'waiting'>>(() => {
    try {
      const stored = localStorage.getItem('3a-device-block-states');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // --- MAP MODE STATE (street or satellite) ---
  const [mapMode, setMapMode] = useState<'street' | 'satellite'>(() => {
    try {
      const stored = localStorage.getItem('3a-map-mode');
      return stored === 'satellite' ? 'satellite' : 'street';
    } catch {
      return 'street';
    }
  });

  // Persist map mode changes
  const toggleMapMode = () => {
    const next = mapMode === 'street' ? 'satellite' : 'street';
    setMapMode(next);
    localStorage.setItem('3a-map-mode', next);
  };

  // Preferência de camada de mapa do cliente
  const [selectedMapLayer, setSelectedMapLayer] = useState<string>(() => {
    return localStorage.getItem('3a-preferred-map-layer') || 'google-satelite';
  });

  // Estado para controle do modal do teclado de PIN de 4 dígitos
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pendingAction, setPendingAction] = useState<'engineStop' | 'engineResume' | null>(null);

  // Menu de escolha de mapa aberto
  const [showLayerSelector, setShowLayerSelector] = useState(false);

  const [commandLogs, setCommandLogs] = useState<CommandLog[]>(() => {
    try {
      const stored = localStorage.getItem('3a-command-logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // --- STATE FOR GEOFENCES (Synced via localStorage) ---
  const [geofences, setGeofences] = useState<Geofence[]>(() => {
    try {
      const stored = localStorage.getItem('3a-geofences');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // --- STATE FOR ALERTS (Synced via localStorage) ---
  const [alerts, setAlerts] = useState<AlertItem[]>(() => {
    try {
      const stored = localStorage.getItem('3a-alerts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Referência para armazenar o último estado conhecido de cada veículo (para detecção de transição de alertas)
  const lastKnownStates = useRef<Record<number, { status: string; ignition: boolean | undefined; speed: number }>>({});

  // Sync state variables from localStorage on intervals/changes
  const syncLocalStorageData = () => {
    try {
      const storedBlocks = localStorage.getItem('3a-device-block-states');
      if (storedBlocks) setBlockStates(JSON.parse(storedBlocks));

      const storedLogs = localStorage.getItem('3a-command-logs');
      if (storedLogs) setCommandLogs(JSON.parse(storedLogs));

      const storedFences = localStorage.getItem('3a-geofences');
      if (storedFences) setGeofences(JSON.parse(storedFences));

      const storedAlerts = localStorage.getItem('3a-alerts');
      if (storedAlerts) setAlerts(JSON.parse(storedAlerts));
    } catch (err) {
      console.error('Error syncing localStorage in client view:', err);
    }
  };

  useEffect(() => {
    syncLocalStorageData();
    window.addEventListener('storage', syncLocalStorageData);
    const syncInterval = setInterval(syncLocalStorageData, 2000);
    return () => {
      window.removeEventListener('storage', syncLocalStorageData);
      clearInterval(syncInterval);
    };
  }, []);

  // Check geofence transitions and update alerts
  const checkGeofenceTransitions = (devicesList: any[], positionsList: any[]) => {
    // Check if geofence alerts are enabled globally
    const storedConfigs = localStorage.getItem('3a-alert-configs');
    const configs = storedConfigs ? JSON.parse(storedConfigs) : { geofence: true };
    if (!configs.geofence) return [];

    const storedGeofencesStr = localStorage.getItem('3a-geofences');
    if (!storedGeofencesStr) return [];
    
    const activeFences: Geofence[] = JSON.parse(storedGeofencesStr).filter((g: any) => g.active);
    if (activeFences.length === 0) return [];

    const newAlertsList: AlertItem[] = [];
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    devicesList.forEach((device) => {
      const pos = positionsList.find((p: any) => p.deviceId === device.id);
      if (!pos || !pos.latitude || !pos.longitude) return;

      const deviceFences = activeFences.filter(f => f.deviceId === device.id);
      deviceFences.forEach((fence) => {
        let inside = false;
        if (fence.type === 'circle' && fence.center) {
          inside = getDistanceInMeters(pos.latitude, pos.longitude, fence.center.lat, fence.center.lng) <= (fence.radius || 300);
        } else if (fence.type === 'polygon' && fence.coordinates) {
          inside = isPointInPolygon(pos.latitude, pos.longitude, fence.coordinates);
        }

        const stateKey = `3a-fence-state-${device.id}-${fence.id}`;
        const lastState = sessionStorage.getItem(stateKey);

        if (lastState === null) {
          sessionStorage.setItem(stateKey, inside ? 'inside' : 'outside');
        } else {
          const wasInside = lastState === 'inside';
          if (!wasInside && inside) {
            sessionStorage.setItem(stateKey, 'inside');
            if (fence.alertType === 'entry' || fence.alertType === 'both') {
              newAlertsList.push({
                id: `gfe-${Date.now()}-${device.id}-${fence.id}-in`,
                deviceId: device.id,
                deviceName: device.name,
                type: 'geofence_in',
                title: 'Entrada na Cerca',
                desc: `O veículo ${device.name} ENTROU na cerca virtual "${fence.name}".`,
                priority: 'high',
                time: nowStr,
                read: false
              });
            }
          } else if (wasInside && !inside) {
            sessionStorage.setItem(stateKey, 'outside');
            if (fence.alertType === 'exit' || fence.alertType === 'both') {
              newAlertsList.push({
                id: `gfe-${Date.now()}-${device.id}-${fence.id}-out`,
                deviceId: device.id,
                deviceName: device.name,
                type: 'geofence_out',
                title: 'Saída da Cerca',
                desc: `O veículo ${device.name} SAIU da cerca virtual "${fence.name}".`,
                priority: 'high',
                time: nowStr,
                read: false
              });
            }
          }
        }
      });
    });

    return newAlertsList;
  };

  // Buscar dispositivos e posições do Traccar
  const fetchData = async () => {
    try {
      // Recarrega informações do cliente logado em tempo real para controle de bloqueio instantâneo
      try {
        const stored = localStorage.getItem('3a-session');
        if (stored) {
          const session = JSON.parse(stored);
          const email = session.email;
          const customers = await getCustomers();
          const matched = customers.find((c: any) => c.email?.toLowerCase() === email?.toLowerCase());
          if (matched) {
            setCurrentUserRecord(matched);
          }
        }
      } catch (err) {
        console.warn("Erro ao atualizar dados em tempo real do cliente:", err);
      }

      const [devicesData, positionsData] = await Promise.all([
        getDevices(),
        getPositions()
      ]);
      
      setDevices(devicesData || []);
      setPositions(positionsData || []);

      // Detecção de Transição para Alertas em Tempo Real (Traccar)
      if (devicesData && positionsData) {
        const newAlertsList: any[] = [];
        const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Carrega configurações ativas de disparo de alertas
        const storedConfigs = localStorage.getItem('3a-alert-configs');
        const configs = storedConfigs ? JSON.parse(storedConfigs) : { ignition: true, overspeed: true, offline: true };

        devicesData.forEach((device: any) => {
          const pos = positionsData.find((p: any) => p.deviceId === device.id);
          const devSpeed = pos ? Math.round((pos.speed || 0) * 1.852) : 0;
          const devIgnition = pos?.attributes?.ignition;
          const currentStatus = device.status || 'offline';

          const lastKnown = lastKnownStates.current[device.id];

          if (lastKnown) {
            if (configs.offline && lastKnown.status === 'online' && currentStatus !== 'online') {
              newAlertsList.push({ id: `alert-${Date.now()}-${device.id}-off`, deviceId: device.id, deviceName: device.name, type: 'offline', title: 'Dispositivo Offline', desc: `O veículo ${device.name} perdeu comunicação com o servidor.`, priority: 'medium', time: nowStr, read: false });
            }
            if (configs.overspeed && lastKnown.speed <= 80 && devSpeed > 80) {
              newAlertsList.push({ id: `alert-${Date.now()}-${device.id}-speed`, deviceId: device.id, deviceName: device.name, type: 'overspeed', title: 'Excesso de Velocidade', desc: `O veículo ${device.name} excedeu o limite: ${devSpeed} km/h.`, priority: 'high', time: nowStr, read: false });
            }
            if (configs.ignition && (lastKnown.ignition === false || lastKnown.ignition === undefined) && devIgnition === true) {
              newAlertsList.push({ id: `alert-${Date.now()}-${device.id}-ignon`, deviceId: device.id, deviceName: device.name, type: 'ignition_on', title: 'Ignição LIGADA', desc: `A ignição do veículo ${device.name} foi LIGADA.`, priority: 'low', time: nowStr, read: false });
            }
            if (configs.ignition && lastKnown.ignition === true && devIgnition === false) {
              newAlertsList.push({ id: `alert-${Date.now()}-${device.id}-ignoff`, deviceId: device.id, deviceName: device.name, type: 'ignition_off', title: 'Ignição DESLIGADA', desc: `A ignição do veículo ${device.name} foi DESLIGADA.`, priority: 'low', time: nowStr, read: false });
            }
          }

          lastKnownStates.current[device.id] = { status: currentStatus, ignition: devIgnition, speed: devSpeed };
        });

        // Verificar cercas virtuais
        const geofenceAlerts = checkGeofenceTransitions(devicesData, positionsData);
        const combinedAlerts = [...geofenceAlerts, ...newAlertsList];

        if (combinedAlerts.length > 0) {
          setAlerts(prev => {
            const updated = [...combinedAlerts, ...prev];
            localStorage.setItem('3a-alerts', JSON.stringify(updated));
            return updated;
          });
          // Trigger floating toast notifications
          combinedAlerts.forEach(alert => {
            const newToast = {
              id: alert.id,
              title: alert.title,
              desc: alert.desc,
              type: alert.type
            };
            setToasts(t => [...t, newToast]);
            // Automatically clear toast after 5 seconds
            setTimeout(() => {
              setToasts(t => t.filter(x => x.id !== alert.id));
            }, 5000);
          });
        }
      }
      
      setSelectedTraccarDevice((prev: any) => {
        if (prev) {
          const updated = devicesData?.find((d: any) => d.id === prev.id);
          return updated || prev;
        }
        return devicesData && devicesData.length > 0 ? devicesData[0] : null;
      });
    } catch (error) {
      console.error("Erro ao sincronizar dados do Traccar:", error);
    } finally {
      setLoadingDevices(false);
    }
  };

  // Polling automático a cada 15 segundos
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Posição real do dispositivo selecionado
  const devicePosition = selectedTraccarDevice
    ? positions.find((p: any) => p.deviceId === selectedTraccarDevice.id)
    : null;

  const realSpeed = devicePosition ? Math.round((devicePosition.speed || 0) * 1.852) : null;
  const realIgnition = devicePosition?.attributes?.ignition;
  const hasRealPosition = devicePosition && devicePosition.latitude && devicePosition.longitude;
  
  // Estado para endereço e cidade aproximados
  const [addressInfo, setAddressInfo] = useState<{ address: string; city: string }>({
    address: 'Buscando localização...',
    city: 'Carregando...'
  });

  useEffect(() => {
    if (hasRealPosition && devicePosition) {
      const lat = devicePosition.latitude;
      const lng = devicePosition.longitude;
      
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: {
          'Accept-Language': 'pt-BR'
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data) {
            const address = data.address;
            const road = address.road || address.pedestrian || address.suburb || '';
            const houseNumber = address.house_number ? `, ${address.house_number}` : '';
            const city = address.city || address.town || address.village || address.municipality || 'Recife';
            const state = address.state ? address.state.toUpperCase() : 'PE';
            
            let formattedRoad = road;
            if (address.house_number) {
              formattedRoad = `${road}${houseNumber}`;
            }
            if (!formattedRoad && data.display_name) {
              formattedRoad = data.display_name.split(',').slice(0, 2).join(',');
            }
            
            setAddressInfo({
              address: formattedRoad || 'Localização identificada',
              city: `${city} - ${state}`
            });
          }
        })
        .catch(err => {
          console.error("Erro no geocoding reverso:", err);
          setAddressInfo({
            address: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`,
            city: 'Recife - PE'
          });
        });
    } else {
      setAddressInfo({
        address: 'Aguardando sinal GPS...',
        city: 'Aguardando...'
      });
    }
  }, [hasRealPosition, devicePosition?.latitude, devicePosition?.longitude]);

  // Simulação de oscilação da velocidade e telemetria
  useEffect(() => {
    const isDeviceBlocked = selectedTraccarDevice ? (blockStates[selectedTraccarDevice.id] === 'blocked') : false;
    if (isDeviceBlocked || !ignition) {
      setSpeed(0);
      return;
    }

    const interval = setInterval(() => {
      setSpeed(prev => {
        const delta = (Math.random() - 0.5) * 6;
        const nextSpeed = Math.round(prev + delta);
        return Math.max(55, Math.min(82, nextSpeed));
      });

      setBattery(prev => {
        if (Math.random() > 0.95) {
          return Math.max(90, prev - 1);
        }
        return prev;
      });

    }, 1500);

    return () => clearInterval(interval);
  }, [ignition, blockStates, selectedTraccarDevice]);

  const filteredDevices = devices.filter(device => 
    device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.uniqueId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedDeviceBlockStatus = selectedTraccarDevice ? (blockStates[selectedTraccarDevice.id] || 'unblocked') : 'unblocked';
  const isIgnitionOn = selectedDeviceBlockStatus === 'blocked' ? false : (realIgnition !== undefined ? realIgnition : ignition);
  
  // Custom vehicle status marker color: red if blocked, emerald if engine is on, yellow if engine is off
  const markerColor = selectedDeviceBlockStatus === 'blocked' ? 'red' : (isIgnitionOn ? 'emerald' : 'yellow');

  // Filter geofences associated with the selected vehicle
  const currentVehicleGeofences = selectedTraccarDevice
    ? geofences.filter(g => g.deviceId === selectedTraccarDevice.id)
    : [];

  // Toggle geofence state (active/inactive) for the current vehicle's geofences
  const handleToggleGeofences = () => {
    if (currentUserRecord?.status === 'Bloqueado') {
      alert("Cercas Virtuais desativadas temporariamente devido ao bloqueio administrativo.");
      return;
    }
    if (!selectedTraccarDevice) return;
    const isAnyActive = currentVehicleGeofences.some(g => g.active);
    
    // Toggle all associated fences to the opposite of current general state
    const nextActiveState = !isAnyActive;
    const updated = geofences.map(g => 
      g.deviceId === selectedTraccarDevice.id ? { ...g, active: nextActiveState } : g
    );

    setGeofences(updated);
    localStorage.setItem('3a-geofences', JSON.stringify(updated));
  };

  // Envia comando de corte/restabelecimento pelo cliente (com sincronização de estado)
  const handleSendClientCommand = async (action: 'engineStop' | 'engineResume') => {
    if (!selectedTraccarDevice) return;

    const deviceId = selectedTraccarDevice.id;
    const deviceName = selectedTraccarDevice.name;
    const actionText = action === 'engineStop' ? 'Corte de Combustível' : 'Restabelecimento';

    // Obter dados de permissões do cliente atual
    const customerPerms = JSON.parse(localStorage.getItem('3a-customer-lock-permissions') || '{}');
    // Como os clientes simulados compartilham dados, vamos buscar pelo ID ou assumir default
    const currentClientId = currentUserRecord?.id || 'simulado-client-id';
    const perm = customerPerms[currentClientId] || {
      allowLock: true,
      allowUnlock: true,
      requirePin: false,
      allowMovingLock: false
    };

    // Obter dados de configurações do veículo atual
    const vehicleSettings = JSON.parse(localStorage.getItem('3a-vehicle-lock-settings') || '{}');
    const vehicleConf = vehicleSettings[deviceId] || {
      lockEnabled: true,
      allowMovingLock: false,
      maxLockSpeed: 20
    };

    const registerAuditLog = (status: 'success' | 'failed', reason: string) => {
      const auditLogs = JSON.parse(localStorage.getItem('3a-audit-logs') || '[]');
      const newAudit = {
        id: `audit-${Date.now()}`,
        time: new Date().toLocaleString('pt-BR'),
        user: currentUserRecord?.name || 'Cliente Simulado',
        role: 'cliente',
        deviceId,
        deviceName,
        action: action === 'engineStop' ? 'block' : 'unblock',
        status,
        reason
      };
      auditLogs.unshift(newAudit);
      localStorage.setItem('3a-audit-logs', JSON.stringify(auditLogs));
    };

    // 1. Verificar se a conta está bloqueada administrativamente
    if (currentUserRecord?.status === 'Bloqueado') {
      alert("Sua conta está bloqueada e não é permitido enviar comandos.");
      registerAuditLog('failed', 'Tentativa bloqueada: Conta suspensa/inadimplente.');
      return;
    }

    // 2. Verificar se o bloqueio veicular está habilitado nas configurações do veículo
    if (!vehicleConf.lockEnabled) {
      alert("A funcionalidade de bloqueio está desabilitada para este veículo. Contate o administrador.");
      registerAuditLog('failed', 'Tentativa bloqueada: Funcionalidade desabilitada para este veículo.');
      return;
    }

    // 3. Verificar permissões específicas do cliente de permitir bloqueio/desbloqueio
    if (action === 'engineStop' && !perm.allowLock) {
      alert("Você não possui permissão para bloquear este veículo.");
      registerAuditLog('failed', 'Tentativa bloqueada: Cliente sem permissão de bloqueio.');
      return;
    }
    if (action === 'engineResume' && !perm.allowUnlock) {
      alert("Você não possui permissão para desbloquear este veículo.");
      registerAuditLog('failed', 'Tentativa bloqueada: Cliente sem permissão de desbloqueio.');
      return;
    }

    // 4. Verificar se o veículo está em movimento e validar restrições
    const pos = positions.find((p: any) => p.deviceId === deviceId);
    const currentSpeed = pos ? Math.round((pos.speed || 0) * 1.852) : 0;
    const isMoving = currentSpeed > 0;

    if (action === 'engineStop' && isMoving) {
      // Bloqueio em movimento não permitido pelo cliente OU pelo veículo
      if (!perm.allowMovingLock) {
        alert("Operação negada: Seu usuário não tem permissão para efetuar bloqueios com o veículo em movimento.");
        registerAuditLog('failed', `Tentativa de bloqueio recusada: Veículo em movimento (${currentSpeed} km/h) e cliente sem permissão.`);
        return;
      }
      if (!vehicleConf.allowMovingLock) {
        alert("Operação negada: Bloqueio em movimento está desabilitado para as configurações deste veículo.");
        registerAuditLog('failed', `Tentativa de bloqueio recusada: Veículo em movimento (${currentSpeed} km/h) e configuração do veículo bloqueia.`);
        return;
      }
      // Velocidade atual excede a velocidade máxima configurada no veículo
      if (currentSpeed > vehicleConf.maxLockSpeed) {
        alert(`Operação negada: A velocidade atual (${currentSpeed} km/h) excede o limite máximo de segurança permitido para bloqueio (${vehicleConf.maxLockSpeed} km/h).`);
        registerAuditLog('failed', `Tentativa de bloqueio recusada: Velocidade de ${currentSpeed} km/h acima do limite configurado de ${vehicleConf.maxLockSpeed} km/h.`);
        return;
      }
    }

    // 5. Exigir PIN de 4 dígitos se ativado
    if (perm.requirePin) {
      // Abrir modal de PIN
      setPendingAction(action);
      setPinValue('');
      setShowPinModal(true);
      return;
    }

    // Executar comando caso todas as validações passem e o PIN não seja necessário
    await executeVerifiedClientCommand(action, deviceId, deviceName, actionText, registerAuditLog);
  };

  const executeVerifiedClientCommand = async (
    action: 'engineStop' | 'engineResume', 
    deviceId: number, 
    deviceName: string, 
    actionText: string,
    registerAuditLog: (status: 'success' | 'failed', reason: string) => void
  ) => {
    // Altera estado local temporariamente
    const updatedStates = { ...blockStates, [deviceId]: 'sending' as const };
    setBlockStates(updatedStates);
    localStorage.setItem('3a-device-block-states', JSON.stringify(updatedStates));
    
    // Adiciona log de comando
    const newLog: CommandLog = {
      id: Date.now().toString(),
      time: new Date().toLocaleString('pt-BR'),
      operator: currentUserRecord?.name || 'Cliente',
      vehicle: deviceName,
      action: actionText,
      result: 'Enviado...'
    };
    
    const updatedLogs = [newLog, ...commandLogs];
    setCommandLogs(updatedLogs);
    localStorage.setItem('3a-command-logs', JSON.stringify(updatedLogs));

    // Pequeno delay para efeito visual premium
    setTimeout(() => {
      setBlockStates(prev => {
        const next = { ...prev, [deviceId]: 'waiting' as const };
        localStorage.setItem('3a-device-block-states', JSON.stringify(next));
        return next;
      });
    }, 1500);

    try {
      const apiRes = await sendCommand(deviceId, action);
      
      const finalState = action === 'engineStop' ? 'blocked' : 'unblocked';
      const resultText = apiRes ? 'Sucesso' : 'Falha';
      
      setBlockStates(prev => {
        const next = { ...prev, [deviceId]: finalState as const };
        localStorage.setItem('3a-device-block-states', JSON.stringify(next));
        return next;
      });
      
      setCommandLogs(prev => {
        const next = prev.map(l => l.id === newLog.id ? { ...l, result: resultText } : l);
        localStorage.setItem('3a-command-logs', JSON.stringify(next));
        return next;
      });

      registerAuditLog('success', `Comando de ${actionText.toLowerCase()} executado com sucesso.`);
    } catch (e) {
      console.error("Erro ao enviar comando do cliente:", e);
      setBlockStates(prev => {
        const next = { ...prev, [deviceId]: 'unblocked' as const };
        localStorage.setItem('3a-device-block-states', JSON.stringify(next));
        return next;
      });
      setCommandLogs(prev => {
        const next = prev.map(l => l.id === newLog.id ? { ...l, result: 'Falha de Rede' } : l);
        localStorage.setItem('3a-command-logs', JSON.stringify(next));
        return next;
      });
      registerAuditLog('failed', `Falha de rede ao enviar comando de ${actionText.toLowerCase()}.`);
    }
  };

  // Build the unified activity feed from logs and alerts of the selected vehicle
  const getUnifiedActivity = () => {
    if (!selectedTraccarDevice) return [];

    const deviceLogs = commandLogs
      .filter(l => l.vehicle === selectedTraccarDevice.name)
      .map(l => ({
        id: `log-${l.id}`,
        event: `${l.action.toUpperCase()}: ${l.result.includes('Sucesso') ? 'SUCESSO' : 'ENVIADO'}`,
        time: l.time.split(' ')[0], // pega o horario
        icon: l.action.includes('Corte') ? 'block' : 'lock_open',
        priority: 'high'
      }));

    const deviceAlerts = alerts
      .filter(a => a.deviceId === selectedTraccarDevice.id)
      .map(a => ({
        id: `alert-${a.id}`,
        event: a.title,
        time: a.time,
        icon: alertIconMap[a.type]?.icon || 'notification_important',
        priority: a.priority
      }));

    // Default simulation records if list is empty
    const defaults = [
      { id: 'def-1', event: 'Ignição Monitorada', time: '12:00', icon: 'key', priority: 'low' },
      { id: 'def-2', event: 'Modem GPS Sincronizado', time: '09:00', icon: 'satellite_alt', priority: 'low' }
    ];

    const combined = [...deviceLogs, ...deviceAlerts];
    return combined.length > 0 ? combined.slice(0, 8) : defaults;
  };

  const handlePhotoUpload = (deviceId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 800;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/webp', 0.6);
          
          setVehiclePhotos(prev => {
            const next = { ...prev, [deviceId]: dataUrl };
            localStorage.setItem('3a-vehicle-photos', JSON.stringify(next));
            return next;
          });
          alert("Foto do veículo carregada e comprimida com sucesso!");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const renderAlertCenter = () => {
    
    const filteredAlertsList = alerts.filter(a => {
      const matchVehicle = selectedVehicleFilter === 'all' || a.deviceId.toString() === selectedVehicleFilter;
      const matchType = selectedTypeFilter === 'all' || a.type === selectedTypeFilter;
      return matchVehicle && matchType;
    });

    const handleMarkAllRead = () => {
      const updated = alerts.map(a => ({ ...a, read: true }));
      setAlerts(updated);
      localStorage.setItem('3a-alerts', JSON.stringify(updated));
    };

    const handleClearAll = () => {
      if (!isAdminUser) {
        alert("Apenas administradores podem limpar o histórico de alertas.");
        return;
      }
      if (window.confirm("Deseja realmente limpar todos os alertas do histórico?")) {
        setAlerts([]);
        localStorage.removeItem('3a-alerts');
      }
    };

    return (
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 animate-fade-in-up">
        {/* Left pane: Filters & Alert toggles per vehicle */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <div className="bg-white/[0.02] border border-white/5 shadow-2xl rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FBBF24]/20 to-transparent"></div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
              <span className="material-icons-round text-primary text-sm">tune</span>
              Filtros Avançados
            </h3>
            
            {/* Filter by Vehicle */}
            <div className="mb-4">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Filtrar por Veículo</label>
              <select 
                value={selectedVehicleFilter}
                onChange={(e) => setSelectedVehicleFilter(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-primary"
              >
                <option value="all">Todos os Veículos</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Filter by Type */}
            <div className="mb-4">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Tipo de Alerta</label>
              <select 
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-primary"
              >
                <option value="all">Todos os Tipos</option>
                <option value="ignition_on">Ignição LIGADA</option>
                <option value="ignition_off">Ignição DESLIGADA</option>
                <option value="overspeed">Excesso de Velocidade</option>
                <option value="offline">GPS Desconectado</option>
                <option value="geofence_in">Entrada em Cerca</option>
                <option value="geofence_out">Saída de Cerca</option>
              </select>
            </div>
          </div>

          {/* Configurações por veículo */}
          <div className="bg-white/[0.02] border border-white/5 shadow-2xl rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FBBF24]/20 to-transparent"></div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
              <span className="material-icons-round text-primary text-sm">notifications_active</span>
              Alertas por Veículo
            </h3>
            <p className="text-[10px] text-slate-500 font-medium mb-3">Ative ou desative as notificações de alertas veiculares individualmente.</p>
            
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
              {devices.map(dev => {
                const isFenceActive = geofences.filter(g => g.deviceId === dev.id).some(g => g.active);
                return (
                  <div key={dev.id} className="flex items-center justify-between p-2.5 bg-slate-950/20 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="material-icons-round text-slate-400 text-sm">directions_car</span>
                      <span className="text-[10px] font-bold text-white uppercase">{dev.name}</span>
                    </div>
                    <button 
                      onClick={() => {
                        const updated = geofences.map(g => 
                          g.deviceId === dev.id ? { ...g, active: !isFenceActive } : g
                        );
                        setGeofences(updated);
                        localStorage.setItem('3a-geofences', JSON.stringify(updated));
                      }}
                      className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                        isFenceActive ? 'bg-primary' : 'bg-slate-700'
                      }`}
                    >
                      <div className={`bg-[#070b13] w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${
                        isFenceActive ? 'translate-x-3' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right pane: Centralized alerts feed */}
        <div className="flex-1 flex flex-col bg-white/[0.02] border border-white/5 shadow-2xl rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden min-h-[450px]">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FBBF24]/20 to-transparent"></div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4 mb-4">
            <div>
              <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
                <span className="material-icons-round text-primary">notifications</span>
                Central de Alertas Recentes
              </h3>
              <p className="text-[10px] text-slate-500 font-bold mt-1">Registros de telemetria inteligente integrados em tempo real.</p>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={handleMarkAllRead}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
              >
                Marcar Lidos
              </button>
              <button 
                onClick={handleClearAll}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
              >
                Limpar Tudo
              </button>
            </div>
          </div>

          {/* List of alerts */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[500px] scrollbar-thin">
            {filteredAlertsList.length === 0 ? (
              <div className="py-16 text-center">
                <span className="material-icons-round text-slate-700 text-3xl">notifications_off</span>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mt-2">Nenhum alerta registrado</p>
              </div>
            ) : (
              filteredAlertsList.map(a => {
                const mapIcon = alertIconMap[a.type] || { icon: 'notification_important', color: 'text-slate-400' };
                return (
                  <div 
                    key={a.id}
                    className={`p-3 border rounded-xl flex items-start justify-between gap-4 transition-all duration-200 ${
                      a.read ? 'bg-slate-950/10 border-white/5 opacity-60' : 'bg-white/[0.02] border-white/10 shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-8 w-8 rounded-full bg-slate-900/60 border border-white/5 flex items-center justify-center shrink-0`}>
                        <span className={`material-icons-round text-base ${mapIcon.color}`}>{mapIcon.icon}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-[11px] font-black text-white uppercase">{a.title}</h4>
                          <span className="text-[9px] font-mono text-slate-500 bg-slate-950/40 px-1.5 py-0.5 rounded border border-white/5 uppercase">{a.deviceName}</span>
                        </div>
                        <p className="text-[10px] text-slate-300 font-medium mt-1 leading-normal">{a.desc}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end justify-between h-full text-right shrink-0">
                      <span className="text-[8px] text-slate-500 font-bold uppercase">{a.time}</span>
                      {!a.read && (
                        <button 
                          onClick={() => {
                            const updated = alerts.map(x => x.id === a.id ? { ...x, read: true } : x);
                            setAlerts(updated);
                            localStorage.setItem('3a-alerts', JSON.stringify(updated));
                          }}
                          className="mt-2 text-[9px] font-black text-primary uppercase hover:underline"
                        >
                          Lido
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <button 
            onClick={() => navigate('/cliente')}
            className="w-full mt-4 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-icons-round text-sm">arrow_back</span>
            Voltar ao Mapa
          </button>
        </div>
      </div>
    );
  };

  const renderHistoryPage = (deviceId: number) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) {
      return (
        <div className="p-12 text-center">
          <p className="text-sm font-bold text-red-400">Veículo não encontrado ou não cadastrado.</p>
          <button onClick={() => navigate('/cliente')} className="mt-4 bg-white/5 text-white px-4 py-2 rounded-xl text-xs uppercase font-bold">Voltar</button>
        </div>
      );
    }

    return <RouteHistoryView device={device} navigate={navigate} />;
  };

  const alertIconMap: Record<string, { icon: string; color: string }> = {
    offline:       { icon: 'wifi_off',         color: 'text-orange-400' },
    overspeed:     { icon: 'speed',             color: 'text-red-400' },
    ignition_on:   { icon: 'key',               color: 'text-emerald-400' },
    ignition_off:  { icon: 'key_off',           color: 'text-slate-400' },
    geofence_in:   { icon: 'gpp_good',          color: 'text-blue-400' },
    geofence_out:  { icon: 'gpp_maybe',         color: 'text-yellow-400' },
  };

  const isAlertsPage = currentPath.startsWith('/alerts') || currentPath.startsWith('/cliente/alerts');
  const isHistoryPage = currentPath.startsWith('/vehicle/') || currentPath.startsWith('/cliente/history/');
  
  const pathParts = currentPath.split('/');
  const historyDeviceId = currentPath.startsWith('/vehicle/') 
    ? parseInt(pathParts[2]) 
    : (currentPath.startsWith('/cliente/history/') ? parseInt(pathParts[3]) : null);

  const isMaintenanceMode = true; // Flag para desativação temporária da Área do Cliente

  if (isMaintenanceMode) {
    return (
      <div className="min-h-screen bg-[#070b13] text-slate-100 font-sans flex flex-col relative overflow-hidden">
        {/* Luzes difusas de fundo */}
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] rounded-full bg-blue-900/10 blur-[150px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] rounded-full bg-emerald-900/10 blur-[150px] pointer-events-none"></div>

        {/* Header do Painel */}
        <header className="border-b border-white/5 bg-slate-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center p-1 shadow-inner">
              <span className="material-icons-round text-primary text-xl">security</span>
            </div>
            <div>
              <h2 className="text-md font-black tracking-tight flex items-center gap-1.5 leading-none">
                3A <span className="text-primary">RASTREAR</span>
                <span className="text-[10px] font-bold bg-white/5 px-2 py-0.5 rounded text-slate-400 border border-white/5 uppercase">CLIENTE</span>
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider mt-1 uppercase">Monitoramento Ativo</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => {
                localStorage.removeItem('3a-session');
                navigate('/login');
              }}
              className="flex items-center justify-center p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 active:scale-95 transition-all"
              title="Sair da conta"
            >
              <span className="material-icons-round text-lg">logout</span>
            </button>
          </div>
        </header>

        {/* Grid Principal (Em Manutenção) */}
        <main className="flex-1 flex items-center justify-center p-6 z-10">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl max-w-md w-full text-center py-12 flex flex-col items-center gap-4">
            <div className="h-16 w-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center animate-pulse">
              <span className="material-icons-round text-primary text-3xl">construction</span>
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Área em Atualização</h3>
            <p className="text-slate-300 text-xs leading-relaxed max-w-xs mx-auto font-medium">
              A Área do Cliente está em atualização e estará disponível em breve.
            </p>
            <Link
              to="/"
              className="mt-4 px-6 py-2.5 bg-primary text-secondary hover:bg-yellow-500 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg inline-block"
            >
              Voltar ao Início
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 font-sans flex flex-col relative overflow-hidden">
      {/* Banner de Suspensão de Conta */}
      {currentUserRecord?.status === 'Bloqueado' && (
        <div className="bg-red-600 text-white px-6 py-3 flex items-center justify-between z-50 shadow-lg border-b border-red-700 animate-pulse shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-icons-round text-xl animate-bounce">warning</span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider">Acesso Parcial / Suspenso por Inadimplência</p>
              <p className="text-[10px] opacity-90 font-medium">Seu painel foi colocado em modo de leitura básica. As funções de geocercas e corte de motor foram bloqueadas. Regularize seus pagamentos ou entre em contato com o suporte.</p>
            </div>
          </div>
          <a
            href="https://wa.me/5581985938044"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-red-600 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-slate-100 active:scale-95 transition-all shadow-md flex items-center gap-1 shrink-0"
          >
            Falar Financeiro
          </a>
        </div>
      )}
      {/* Luzes difusas de fundo */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] rounded-full bg-blue-900/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] rounded-full bg-emerald-900/10 blur-[150px] pointer-events-none"></div>

      {/* Header do Painel */}
      <header className="border-b border-white/5 bg-slate-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center p-1 shadow-inner">
            <span className="material-icons-round text-primary text-xl">security</span>
          </div>
          <div>
            <h2 className="text-md font-black tracking-tight flex items-center gap-1.5 leading-none">
              3A <span className="text-primary">RASTREAR</span>
              <span className="text-[10px] font-bold bg-white/5 px-2 py-0.5 rounded text-slate-400 border border-white/5 uppercase">CLIENTE</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider mt-1 uppercase">Monitoramento Ativo</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-white">Carlos André</span>
            <span className="text-[10px] text-emerald-400 font-bold flex items-center justify-end gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Sessão Segura
            </span>
          </div>
          
          {/* Centralized Alerts Button */}
          <button
            onClick={() => navigate('/cliente/alerts')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              isAlertsPage 
                ? 'bg-primary text-secondary border-primary shadow-lg shadow-primary/10 font-black' 
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5'
            }`}
            title="Central de Alertas"
          >
            <span className="material-icons-round text-base">notifications</span>
            <span className="hidden sm:inline">Alertas</span>
          </button>
          
          <button
            onClick={() => {
              localStorage.removeItem('3a-session');
              navigate('/login');
            }}
            className="flex items-center justify-center p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 active:scale-95 transition-all"
            title="Sair da conta"
          >
            <span className="material-icons-round text-lg">logout</span>
          </button>
        </div>
      </header>

      {/* Grid Principal */}
      <main className="flex-1 flex flex-col p-6 z-10 pb-20 lg:pb-6 overflow-y-auto">
        {isAlertsPage ? (
          renderAlertCenter()
        ) : isHistoryPage && historyDeviceId ? (
          renderHistoryPage(historyDeviceId)
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full h-full">
            {/* Coluna 1: Frota Lateral e Filtros */}
            <section className={`lg:col-span-1 flex flex-col gap-4 bg-white/[0.02] border border-white/5 shadow-2xl rounded-2xl p-4 backdrop-blur-xl relative overflow-hidden animate-fade-in-up ${
              activeMobileTab === 'fleet' ? 'flex' : 'hidden lg:flex'
            }`}>
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FBBF24]/20 to-transparent"></div>
          
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black tracking-wider text-white flex items-center gap-2 uppercase">
              <span className="material-icons-round text-primary text-sm">directions_car</span>
              Minha Frota
            </h3>
            <button
              onClick={fetchData}
              className="flex items-center justify-center p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 active:scale-95 transition-all animate-pulse"
              title="Sincronizar"
            >
              <span className="material-icons-round text-xs">sync</span>
            </button>
          </div>

          {/* Contador de Veículos */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-[#10B981]/5 border border-[#10B981]/10 rounded-xl py-2 px-3 flex flex-col justify-center">
              <span className="text-[8px] uppercase font-bold text-[#10B981] tracking-wider">Online</span>
              <span className="text-sm font-black text-white font-mono mt-0.5">
                {devices.filter((d: any) => d.status === 'online').length}
              </span>
            </div>
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl py-2 px-3 flex flex-col justify-center">
              <span className="text-[8px] uppercase font-bold text-red-400 tracking-wider">Offline</span>
              <span className="text-sm font-black text-white font-mono mt-0.5">
                {devices.filter((d: any) => d.status !== 'online').length}
              </span>
            </div>
          </div>

          {/* Campo de Busca */}
          <div className="relative">
            <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar veículo..."
              className="w-full bg-slate-950/60 border border-white/5 focus:border-[#FBBF24]/30 rounded-xl py-2 pl-9 pr-8 text-xs text-white placeholder-slate-500 outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <span className="material-icons-round text-xs">close</span>
              </button>
            )}
          </div>

          {/* Lista de Veículos */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[300px] lg:max-h-[calc(100vh-320px)] scrollbar-thin scrollbar-thumb-white/10">
            {loadingDevices ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Carregando...</p>
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="py-8 text-center">
                <span className="material-icons-round text-slate-600 text-lg">navigation</span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Nenhum veículo</p>
              </div>
            ) : (
              filteredDevices.map((device) => {
                const isOnline = device.status === 'online';
                const isSelected = selectedTraccarDevice?.id === device.id;
                
                const pos = positions.find((p: any) => p.deviceId === device.id);
                const devSpeed = pos ? Math.round((pos.speed || 0) * 1.852) : 0;
                const devIgnition = pos?.attributes?.ignition;
                
                const formattedComm = device.lastUpdate
                  ? new Date(device.lastUpdate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : 'Sem sinal';

                const deviceBlock = blockStates[device.id] || 'unblocked';

                return (
                  <div
                    key={device.id}
                    onClick={() => setSelectedTraccarDevice(device)}
                    className={`p-3 bg-white/[0.01] hover:bg-white/[0.04] border rounded-xl cursor-pointer transition-all duration-300 relative group flex flex-col justify-between ${
                      isSelected 
                        ? 'border-primary/60 bg-white/[0.04] shadow-[0_0_12px_rgba(251,191,36,0.1)]' 
                        : 'border-white/5'
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${
                          deviceBlock === 'blocked' ? 'bg-red-500 animate-pulse' : (isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500')
                        }`}></span>
                        <h4 className="text-[11px] font-black text-white group-hover:text-primary transition-colors truncate uppercase flex items-center gap-1.5">
                          {device.name}
                          <span className={`text-[7px] font-extrabold px-1 rounded-full shrink-0 uppercase tracking-widest ${
                            deviceBlock === 'blocked' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {deviceBlock === 'blocked' ? 'Bloqueado' : 'Ativo'}
                          </span>
                        </h4>
                      </div>
                      <span className="text-[8px] text-slate-500 font-mono">
                        {device.uniqueId}
                      </span>
                    </div>

                    {/* Bottom telemetry indicators */}
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.02]">
                      <div className="flex items-center gap-2">
                        {/* Speed badge */}
                        <div className="flex items-center gap-1 bg-slate-950/40 px-1.5 py-0.5 rounded border border-white/5 text-[9px] text-slate-300 font-mono">
                          <span className="material-icons-round text-[10px] text-primary">speed</span>
                          {deviceBlock === 'blocked' ? 0 : devSpeed} km/h
                        </div>
                        {/* Ignition badge */}
                        <div className="flex items-center gap-1 bg-slate-950/40 px-1.5 py-0.5 rounded border border-white/5 text-[9px] text-slate-300">
                          <span className={`material-icons-round text-[10px] ${
                            deviceBlock === 'blocked' ? 'text-slate-600' : (devIgnition ? 'text-emerald-400' : 'text-slate-500')
                          }`}>
                            key
                          </span>
                          <span className="text-[8px] font-bold">
                            {deviceBlock === 'blocked' ? 'OFF' : (devIgnition ? 'ON' : 'OFF')}
                          </span>
                        </div>
                      </div>
                      <span className="text-[8px] text-slate-400 font-bold uppercase flex items-center gap-0.5">
                        <span className="material-icons-round text-[9px]">schedule</span>
                        {formattedComm}
                      </span>
                    </div>

                    {/* Quick action buttons row */}
                    <div className="flex items-center justify-between gap-1.5 mt-3 pt-2.5 border-t border-white/5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTraccarDevice(device);
                          navigate(`/cliente/history/${device.id}`);
                        }}
                        className="flex-1 flex items-center justify-center gap-0.5 bg-white/5 hover:bg-primary/25 hover:text-white py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all text-slate-300"
                        title="Histórico de comandos"
                      >
                        <span className="material-icons-round text-[9px]">history</span>
                        Histórico
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTraccarDevice(device);
                          navigate(`/cliente/alerts?deviceId=${device.id}`);
                        }}
                        className="flex-1 flex items-center justify-center gap-0.5 bg-white/5 hover:bg-primary/25 hover:text-white py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all text-slate-300"
                        title="Visualizar Alertas"
                      >
                        <span className="material-icons-round text-[9px]">notifications</span>
                        Alertas
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTraccarDevice(device);
                          if (pos && pos.latitude && pos.longitude) {
                            alert(`Localização focada no mapa para: ${device.name}`);
                            setActiveMobileTab('map'); // Switch to map tab instantly on mobile
                          } else {
                            alert("Sem sinal GPS ativo para este veículo.");
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-0.5 bg-white/5 hover:bg-primary/25 hover:text-white py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all text-slate-300"
                        title="Focar no mapa"
                      >
                        <span className="material-icons-round text-[9px]">my_location</span>
                        Focar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Coluna 2: Mapa e Telemetria */}
        <section className={`lg:col-span-2 flex flex-col bg-white/[0.02] border border-white/5 shadow-2xl rounded-2xl p-4 sm:p-5 backdrop-blur-xl relative overflow-hidden min-h-[400px] ${
          activeMobileTab === 'map' ? 'flex h-[calc(100vh-130px)] lg:h-auto' : 'hidden lg:flex'
        }`}>
          <div className="flex justify-between items-center mb-4 z-10">
            <div>
              <h4 className="text-xs uppercase font-black text-slate-400 tracking-wider">
                {hasRealPosition ? 'Localização em Tempo Real' : 'Localização Simulada'}
              </h4>
              <p className="text-xs text-white font-bold mt-1 flex items-center gap-1.5 truncate max-w-[320px] uppercase">
                <span className="material-icons-round text-primary text-sm">place</span>
                {hasRealPosition && devicePosition
                  ? `Lat: ${devicePosition.latitude.toFixed(5)} | Lng: ${devicePosition.longitude.toFixed(5)}`
                  : (selectedTraccarDevice ? `Rastreando: ${selectedTraccarDevice.name}` : 'Av. Governador Agamenon Magalhães, Recife - PE')}
              </p>
              {hasRealPosition && devicePosition && devicePosition.fixTime && (
                <p className="text-[9px] text-slate-500 font-bold mt-1 flex items-center gap-1">
                  <span className="material-icons-round text-[10px]">update</span>
                  Última posição: {new Date(devicePosition.fixTime).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
            
            <div className={`border px-3 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-bold ${
              selectedDeviceBlockStatus === 'blocked'
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : (hasRealPosition ? 'bg-emerald-900/30 border-emerald-500/20 text-emerald-400' : 'bg-slate-900/60 border-white/5 text-slate-400')
            }`}>
              <span className={`h-2 w-2 rounded-full animate-ping ${
                selectedDeviceBlockStatus === 'blocked' ? 'bg-red-500' : (hasRealPosition ? 'bg-emerald-500' : 'bg-yellow-500')
              }`}></span>
              {selectedDeviceBlockStatus === 'blocked' ? 'VEÍCULO BLOQUEADO' : (hasRealPosition ? 'GPS REAL ATIVO' : 'GPS SIMULADO')}
            </div>
          </div>

          {/* Área do Mapa */}
          <div className={`flex-1 rounded-xl bg-[#03060a] border border-white/5 relative overflow-hidden min-h-[300px] ${
            mapMode === 'street' ? 'dark-leaflet' : ''
          }`}>
            {/* Seletor de Camadas Premium Flutuante no Cliente */}
            <div className="absolute top-4 right-4 z-[1000]">
              <button
                onClick={() => setShowLayerSelector(!showLayerSelector)}
                className="bg-slate-900/90 hover:bg-primary hover:text-secondary text-slate-200 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur flex items-center justify-center active:scale-95 transition-all"
                title="Seletor de Camadas do Mapa"
              >
                <span className="material-icons-round text-base">layers</span>
              </button>

              {showLayerSelector && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-950/95 border border-white/10 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md flex flex-col gap-1 z-[1001] animate-fade-in-up">
                  {[
                    { id: 'google-maps', label: 'Google Maps' },
                    { id: 'google-satelite', label: 'Google Satélite' },
                    { id: 'google-hibrido', label: 'Google Híbrido' },
                    { id: 'google-transito', label: 'Google Trânsito' },
                    { id: 'openstreetmap', label: 'OpenStreetMap' },
                    { id: 'dark-all', label: 'Modo Escuro' }
                  ].map((lyr) => (
                    <button
                      key={lyr.id}
                      onClick={() => {
                        setSelectedMapLayer(lyr.id);
                        setShowLayerSelector(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                        selectedMapLayer === lyr.id
                          ? 'bg-primary text-secondary font-black'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {lyr.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {hasRealPosition && devicePosition ? (
              <MapContainer 
                key={`client-map-${selectedTraccarDevice?.id}-${currentVehicleGeofences.length}-${selectedMapLayer}`}
                center={[devicePosition.latitude, devicePosition.longitude]} 
                zoom={16} 
                style={{ width: '100%', height: '100%' }}
                zoomControl={true}
              >
                <ChangeMapView center={[devicePosition.latitude, devicePosition.longitude]} />
                
                {/* Renderização condicional da camada conforme selectedMapLayer */}
                {selectedMapLayer === 'google-maps' && (
                  <TileLayer
                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                    attribution='&copy; Google Maps'
                  />
                )}
                {selectedMapLayer === 'google-satelite' && (
                  <TileLayer
                    url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                    attribution='&copy; Google Satellite'
                  />
                )}
                {selectedMapLayer === 'google-hibrido' && (
                  <TileLayer
                    url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                    attribution='&copy; Google Hybrid'
                  />
                )}
                {selectedMapLayer === 'google-transito' && (
                  <TileLayer
                    url="https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}"
                    attribution='&copy; Google Traffic'
                  />
                )}
                {selectedMapLayer === 'openstreetmap' && (
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                  />
                )}
                {selectedMapLayer === 'dark-all' && (
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; CARTO'
                  />
                )}

                {/* Render Circular and Polygonal Geofences overlays */}
                {currentVehicleGeofences.map(fence => {
                  const color = fence.active ? '#3b82f6' : '#64748b';
                  return fence.type === 'circle' && fence.center ? (
                    <Circle
                      key={fence.id}
                      center={[fence.center.lat, fence.center.lng]}
                      radius={fence.radius || 300}
                      pathOptions={{ color: color, fillColor: color, fillOpacity: 0.15 }}
                    />
                  ) : fence.type === 'polygon' && fence.coordinates ? (
                    <Polygon
                      key={fence.id}
                      positions={fence.coordinates.map(c => [c.lat, c.lng])}
                      pathOptions={{ color: color, fillColor: color, fillOpacity: 0.15 }}
                    />
                  ) : null;
                })}

                <Marker 
                  position={[devicePosition.latitude, devicePosition.longitude]} 
                  icon={getCustomCarIcon(markerColor, selectedTraccarDevice ? (vehicleIcons[selectedTraccarDevice.id] || 'directions_car') : 'directions_car')}
                >
                  <Popup>
                    <div className="text-xs text-slate-900 font-bold p-1">
                      <p className="text-sm font-black uppercase text-emerald-600 leading-none">{selectedTraccarDevice?.name}</p>
                      <p className="mt-1.5 font-mono text-[10px]">ID: {selectedTraccarDevice?.uniqueId}</p>
                      <p className="mt-1">Velocidade: {selectedDeviceBlockStatus === 'blocked' ? 0 : (realSpeed || 0)} km/h</p>
                      <p className="mt-0.5">Bloqueio: {selectedDeviceBlockStatus.toUpperCase()}</p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050911]/95 p-6 text-center animate-fade-in">
                <div className="relative mb-6 flex items-center justify-center">
                  <div className="absolute h-20 w-20 rounded-full border border-yellow-500/20 animate-ping"></div>
                  <div className="absolute h-14 w-14 rounded-full border border-yellow-500/30 animate-pulse"></div>
                  <div className="h-12 w-12 bg-yellow-500/10 border border-yellow-500/30 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                    <span className="material-icons-round text-yellow-400 text-2xl animate-spin">
                      radar
                    </span>
                  </div>
                </div>
                <h5 className="text-sm font-black uppercase tracking-wider text-slate-300">
                  Aguardando localização do rastreador
                </h5>
                <p className="text-[10px] text-slate-500 mt-2 font-semibold max-w-[280px]">
                  O dispositivo {selectedTraccarDevice?.name || 'vinculado'} ainda não transmitiu coordenadas válidas ou está sem sinal GPS.
                </p>
              </div>
            )}
          </div>

          {/* Informações abaixo do mapa */}
          {hasRealPosition && devicePosition ? (
            <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs z-10 animate-fade-in-up">
              <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5 flex items-start gap-3">
                <span className="material-icons-round text-primary text-lg mt-0.5">place</span>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Endereço Aproximado</p>
                  <p className="text-[11px] font-bold text-slate-200 mt-0.5 leading-snug line-clamp-2" title={addressInfo.address}>
                    {addressInfo.address}
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5 flex items-start gap-3">
                <span className="material-icons-round text-emerald-400 text-lg mt-0.5">location_city</span>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Cidade</p>
                  <p className="text-xs font-bold text-slate-200 mt-0.5">{addressInfo.city}</p>
                </div>
              </div>

              <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5 flex items-start gap-3">
                <span className="material-icons-round text-blue-400 text-lg mt-0.5">speed</span>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Velocidade</p>
                  <p className="text-xs font-bold text-slate-200 mt-0.5 font-mono">
                    {selectedDeviceBlockStatus === 'blocked' ? '0 km/h' : (realSpeed !== null ? `${realSpeed} km/h` : '0 km/h')}
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5 flex items-start gap-3">
                <span className="material-icons-round text-purple-400 text-lg mt-0.5">history</span>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Última Atualização</p>
                  <p className="text-xs font-bold text-slate-200 mt-0.5">
                    {devicePosition.fixTime 
                      ? new Date(devicePosition.fixTime).toLocaleString('pt-BR') 
                      : 'Sem registro'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-center p-4 bg-slate-950/20 rounded-xl border border-white/5 text-center text-xs">
              <span className="material-icons-round text-yellow-500/70 mr-2 text-lg">warning_amber</span>
              <span className="text-slate-400 font-bold uppercase tracking-wider">Aguardando localização do rastreador</span>
            </div>
          )}
        </section>

        {/* Coluna 3: Status, Comandos e Atividade (Visualização apenas) */}
        <section className={`lg:col-span-1 flex flex-col gap-4 ${
          activeMobileTab === 'control' ? 'flex' : 'hidden lg:flex'
        }`}>
          
          {/* Telemetria e Visualização de Status do Bloqueio */}
          <div className="bg-white/[0.02] border border-white/5 shadow-2xl rounded-2xl p-4 backdrop-blur-xl relative overflow-hidden flex flex-col gap-4">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FBBF24]/20 to-transparent"></div>
            
            <div className="flex items-start justify-between border-b border-white/[0.04] pb-3">
              <div>
                <span className="text-[8px] uppercase font-bold text-slate-400 tracking-widest">Painel do Veículo</span>
                <h4 className="text-xs font-black text-white mt-1 truncate max-w-[150px] uppercase flex items-center gap-1.5">
                {selectedTraccarDevice ? selectedTraccarDevice.name : 'Toyota Corolla'}
                </h4>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                selectedDeviceBlockStatus === 'blocked'
                  ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
                  : (selectedTraccarDevice?.status === 'online' ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20')
              }`}>
                {selectedDeviceBlockStatus === 'blocked' ? 'BLOQUEADO' : (selectedTraccarDevice?.status === 'online' ? 'ONLINE' : 'OFFLINE')}
              </span>
            </div>

            {/* Vehicle Picture with Upload Button */}
            {selectedTraccarDevice && (
              <div className="relative rounded-xl overflow-hidden h-28 bg-gradient-to-br from-slate-950/80 to-slate-900 border border-white/5 flex items-center justify-center group/photo shadow-inner">
                {vehiclePhotos[selectedTraccarDevice.id] ? (
                  <img 
                    src={vehiclePhotos[selectedTraccarDevice.id]} 
                    alt={selectedTraccarDevice.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-105" 
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-500">
                    <span className="material-icons-round text-3xl text-slate-600">directions_car</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-600">Sem Foto</span>
                  </div>
                )}

              </div>
            )}

            {/* Grid de Sensores Rápidos */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950/40 p-2.5 rounded-xl border border-white/5 flex flex-col justify-center">
                <span className="text-[8px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <span className="material-icons-round text-[10px] text-primary">battery_charging_full</span>
                  Bateria
                </span>
                <span className="text-sm font-black text-white mt-1 font-mono">{battery}%</span>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-xl border border-white/5 flex flex-col justify-center">
                <span className="text-[8px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <span className="material-icons-round text-[10px] text-emerald-400">gps_fixed</span>
                  Sinal GPS
                </span>
                <span className="text-[10px] font-black text-slate-200 mt-1 truncate font-mono">
                  {hasRealPosition ? 'Excelente' : 'Simulado'}
                </span>
              </div>
            </div>

            {/* Sensores Toggles (Cerca Virtual real-time toggle) */}
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between p-2.5 bg-slate-950/20 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <span className={`material-icons-round p-1 rounded bg-white/5 text-sm ${isIgnitionOn ? 'text-emerald-400' : 'text-slate-500'}`}>
                    key
                  </span>
                  <div>
                    <p className="text-[10px] font-bold text-white leading-none font-sans">Ignição</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">{isIgnitionOn ? 'Ligada' : 'Desligada'}</p>
                  </div>
                </div>
                <span className={`h-2 w-2 rounded-full ${isIgnitionOn ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 'bg-slate-600'}`}></span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-950/20 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <span className={`material-icons-round p-1 rounded bg-white/5 text-sm ${
                    currentVehicleGeofences.some(g => g.active) ? 'text-primary' : 'text-slate-500'
                  }`}>
                    gpp_good
                  </span>
                  <div>
                    <p className="text-[10px] font-bold text-white leading-none font-sans">Cerca Virtual</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">
                      {currentVehicleGeofences.some(g => g.active) 
                        ? `${currentVehicleGeofences.filter(g => g.active).length} Cercas Ativas` 
                        : 'Desabilitada'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleToggleGeofences}
                  disabled={currentUserRecord?.status === 'Bloqueado'}
                  className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    currentVehicleGeofences.some(g => g.active) ? 'bg-primary' : 'bg-slate-700'
                  }`}
                >
                  <div className={`bg-[#070b13] w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${
                    currentVehicleGeofences.some(g => g.active) ? 'translate-x-3' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {/* Ações de Comando (Interativo para clientes, bloqueado se inadimplente) */}
            <div className="mt-2 pt-3 border-t border-white/[0.04] text-center">
              {currentUserRecord?.status === 'Bloqueado' ? (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col items-center gap-1.5 text-center">
                  <span className="material-icons-round text-red-500 text-lg leading-none animate-bounce">block</span>
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-wider">Comandos Suspensos</p>
                  <p className="text-[8px] text-slate-400 font-medium leading-relaxed">Painel restrito para leitura. Regularize a assinatura para reativar o bloqueio remoto.</p>
                </div>
              ) : selectedDeviceBlockStatus === 'blocked' ? (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col items-center gap-1.5">
                    <span className="material-icons-round text-red-500 text-lg leading-none">block</span>
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-wider">Corte de Motor Ativo</p>
                  <p className="text-[8px] text-slate-400 font-medium mb-2.5">Funcionamento mecânico suspenso.</p>
                  <button
                    onClick={() => {
                      setPendingAction('engineResume');
                      setShowPinModal(true);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-lg shadow-emerald-500/10"
                  >
                    Desbloquear Motor
                  </button>
                </div>
              ) : selectedDeviceBlockStatus === 'sending' || selectedDeviceBlockStatus === 'waiting' ? (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex flex-col items-center gap-1.5 animate-pulse">
                  <span className="material-icons-round text-blue-400 text-lg leading-none animate-spin">radar</span>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Comando em Trânsito</p>
                  <p className="text-[8px] text-slate-400 font-medium">Aguardando confirmação do módulo GSM.</p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col items-center gap-1.5">
                  <span className="material-icons-round text-emerald-400 text-lg leading-none">check_circle</span>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Motor Autorizado</p>
                  <p className="text-[8px] text-slate-400 font-medium mb-2.5">Combustível liberado para partida.</p>
                  <button
                    onClick={() => {
                      setPendingAction('engineStop');
                      setShowPinModal(true);
                    }}
                    className="w-full bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-lg shadow-red-500/10"
                  >
                    Bloquear Motor
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Painel de Alertas Inteligentes */}
          <div className="bg-white/[0.02] border border-white/5 shadow-2xl rounded-2xl p-4 backdrop-blur-xl relative overflow-hidden flex flex-col gap-3">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FBBF24]/20 to-transparent"></div>
            <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1.5 leading-none">
              <span className="material-icons-round text-primary text-xs">notifications_active</span>
              Configurações de Alertas
            </h4>
            
            <div className="space-y-2">
              {/* Switch Ignição */}
              <div className="flex items-center justify-between p-2.5 bg-slate-950/20 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="material-icons-round text-emerald-400 text-sm">key</span>
                  <span className="text-[10px] font-bold text-white font-sans">Alerta de Ignição</span>
                </div>
                <button 
                  onClick={() => {
                    const updated = { ...alertConfigs, ignition: !alertConfigs.ignition };
                    setAlertConfigs(updated);
                    localStorage.setItem('3a-alert-configs', JSON.stringify(updated));
                  }}
                  className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                    alertConfigs.ignition ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div className={`bg-[#070b13] w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${
                    alertConfigs.ignition ? 'translate-x-3' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Switch Velocidade */}
              <div className="flex items-center justify-between p-2.5 bg-slate-950/20 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="material-icons-round text-red-400 text-sm">speed</span>
                  <span className="text-[10px] font-bold text-white font-sans">Excesso de Velocidade</span>
                </div>
                <button 
                  onClick={() => {
                    const updated = { ...alertConfigs, overspeed: !alertConfigs.overspeed };
                    setAlertConfigs(updated);
                    localStorage.setItem('3a-alert-configs', JSON.stringify(updated));
                  }}
                  className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                    alertConfigs.overspeed ? 'bg-red-500' : 'bg-slate-700'
                  }`}
                >
                  <div className={`bg-[#070b13] w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${
                    alertConfigs.overspeed ? 'translate-x-3' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Switch Offline */}
              <div className="flex items-center justify-between p-2.5 bg-slate-950/20 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="material-icons-round text-orange-400 text-sm">wifi_off</span>
                  <span className="text-[10px] font-bold text-white font-sans">GPS Desconectado</span>
                </div>
                <button 
                  onClick={() => {
                    const updated = { ...alertConfigs, offline: !alertConfigs.offline };
                    setAlertConfigs(updated);
                    localStorage.setItem('3a-alert-configs', JSON.stringify(updated));
                  }}
                  className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                    alertConfigs.offline ? 'bg-orange-500' : 'bg-slate-700'
                  }`}
                >
                  <div className={`bg-[#070b13] w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${
                    alertConfigs.offline ? 'translate-x-3' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Switch Cerca */}
              <div className="flex items-center justify-between p-2.5 bg-slate-950/20 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="material-icons-round text-blue-400 text-sm">gpp_maybe</span>
                  <span className="text-[10px] font-bold text-white font-sans">Cercas Virtuais</span>
                </div>
                <button 
                  onClick={() => {
                    const updated = { ...alertConfigs, geofence: !alertConfigs.geofence };
                    setAlertConfigs(updated);
                    localStorage.setItem('3a-alert-configs', JSON.stringify(updated));
                  }}
                  className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                    alertConfigs.geofence ? 'bg-blue-500' : 'bg-slate-700'
                  }`}
                >
                  <div className={`bg-[#070b13] w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${
                    alertConfigs.geofence ? 'translate-x-3' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Atividade Recente (Integra logs e alertas reais da geocerca) */}
          <div className="bg-white/[0.02] border border-white/5 shadow-2xl rounded-2xl p-4 backdrop-blur-xl flex-1 flex flex-col justify-between gap-4">
            <div>
              <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-3">Atividade Recente</h4>
              
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                {getUnifiedActivity().map(item => (
                  <div key={item.id} className="flex items-start gap-2.5 border-l border-white/5 pl-3 ml-1.5 relative py-0.5">
                    <div className={`absolute -left-1 top-2 h-1.5 w-1.5 rounded-full ${
                      item.priority === 'high' 
                        ? 'bg-red-500 shadow-[0_0_5px_#ef4444]' 
                        : 'bg-[#FBBF24] shadow-[0_0_5px_#FBBF24]'
                    }`}></div>
                    
                    <span className="material-icons-round text-slate-500 text-xs mt-0.5">
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-slate-200 truncate">{item.event}</p>
                      <p className="text-[8px] text-slate-500 font-bold mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suporte Técnico */}
            <div className="pt-2 border-t border-white/[0.04] flex flex-col gap-2">
              <a
                href="https://wa.me/5581985938044"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 hover:border-[#25D366]/40 text-[#25D366] py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                  alt="WhatsApp"
                  className="w-3.5 h-3.5"
                />
                Suporte WhatsApp 24h
              </a>
            </div>
          </div>
        </section>
      </div>
    )}
  </main>

      {/* Floating Toast Alerts */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="bg-slate-900/90 border border-white/10 backdrop-blur-md p-4 rounded-2xl shadow-2xl flex items-start gap-3 pointer-events-auto animate-fade-in-up">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
              t.type.includes('geofence_out') || t.type.includes('overspeed') ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              <span className="material-icons-round text-lg">
                {t.type.includes('geofence') ? 'gpp_maybe' : (t.type.includes('ignition') ? 'key' : 'speed')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-black text-white">{t.title}</h5>
              <p className="text-[10px] text-slate-400 font-medium mt-1 leading-normal">{t.desc}</p>
            </div>
            <button 
              onClick={() => setToasts(curr => curr.filter(x => x.id !== t.id))}
              className="text-slate-500 hover:text-white transition-colors shrink-0 font-bold"
            >
              <span className="material-icons-round text-sm">close</span>
            </button>
          </div>
        ))}
      </div>

      {/* Modal Teclado de PIN de Segurança */}
      {showPinModal && pendingAction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#0a111b] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#FBBF24] to-transparent"></div>
            
            <span className="material-icons-round text-primary text-4xl mb-2">lock</span>
            <h3 className="text-sm font-black text-white uppercase tracking-wider text-center">PIN de Segurança Exigido</h3>
            <p className="text-[10px] text-slate-400 mt-1 text-center font-medium">Digite o seu PIN de 4 dígitos para autorizar a transmissão do comando.</p>

            {/* Display do PIN */}
            <div className="flex gap-3 my-6">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-bold transition-all ${
                    pinValue.length > idx 
                      ? 'border-[#FBBF24] bg-[#FBBF24]/10 text-[#FBBF24]' 
                      : 'border-white/5 bg-slate-950/50 text-slate-600'
                  }`}
                >
                  {pinValue.length > idx ? '●' : ''}
                </div>
              ))}
            </div>

            {/* Teclado Virtual Numérico */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (pinValue.length < 4) {
                      setPinValue(prev => prev + num.toString());
                    }
                  }}
                  className="h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-base active:scale-90 transition-all border border-white/5"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPinValue('')}
                className="h-12 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-black text-[10px] uppercase active:scale-90 transition-all"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pinValue.length < 4) {
                    setPinValue(prev => prev + '0');
                  }
                }}
                className="h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-base active:scale-90 transition-all border border-white/5"
              >
                0
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (pinValue.length !== 4) return;
                  
                  // Verificar PIN criptografado
                  const customerPerms = JSON.parse(localStorage.getItem('3a-customer-lock-permissions') || '{}');
                  const currentClientId = currentUserRecord?.id || 'simulado-client-id';
                  const perm = customerPerms[currentClientId] || {};

                  // Função hash local
                  const hashPinLocal = async (pin: string): Promise<string> => {
                    try {
                      const msgBuffer = new TextEncoder().encode(pin);
                      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
                      const hashArray = Array.from(new Uint8Array(hashBuffer));
                      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                    } catch (e) {
                      let hash = 0;
                      for (let i = 0; i < pin.length; i++) {
                        const char = pin.charCodeAt(i);
                        hash = (hash << 5) - hash + char;
                        hash = hash & hash;
                      }
                      return hash.toString(16);
                    }
                  };

                  const computedHash = await hashPinLocal(pinValue);

                  const registerAuditLog = (status: 'success' | 'failed', reason: string) => {
                    const auditLogs = JSON.parse(localStorage.getItem('3a-audit-logs') || '[]');
                    const newAudit = {
                      id: `audit-${Date.now()}`,
                      time: new Date().toLocaleString('pt-BR'),
                      user: currentUserRecord?.name || 'Cliente Simulado',
                      role: 'cliente',
                      deviceId: selectedTraccarDevice.id,
                      deviceName: selectedTraccarDevice.name,
                      action: pendingAction === 'engineStop' ? 'block' : 'unblock',
                      status,
                      reason
                    };
                    auditLogs.unshift(newAudit);
                    localStorage.setItem('3a-audit-logs', JSON.stringify(auditLogs));
                  };

                  if (perm.pinHash && perm.pinHash !== computedHash) {
                    alert("PIN de segurança incorreto! Ação bloqueada.");
                    registerAuditLog('failed', 'Tentativa bloqueada: PIN incorreto digitado pelo cliente.');
                    setShowPinModal(false);
                    setPinValue('');
                    setPendingAction(null);
                    return;
                  }

                  // Sucesso de PIN
                  setShowPinModal(false);
                  const actionText = pendingAction === 'engineStop' ? 'Corte de Combustível' : 'Restabelecimento';
                  await executeVerifiedClientCommand(pendingAction, selectedTraccarDevice.id, selectedTraccarDevice.name, actionText, registerAuditLog);
                  setPinValue('');
                  setPendingAction(null);
                }}
                disabled={pinValue.length !== 4}
                className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase active:scale-90 transition-all disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>

            <button
              onClick={() => {
                setShowPinModal(false);
                setPinValue('');
                setPendingAction(null);
              }}
              className="mt-6 text-[10px] text-slate-500 font-bold uppercase hover:text-white transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation for Mobile */}
      {!isAlertsPage && !isHistoryPage && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a111b] border-t border-white/5 py-2 px-6 flex justify-around items-center z-50 shadow-2xl backdrop-blur-md">
          <button 
            onClick={() => { setActiveMobileTab('map'); navigate('/cliente'); }}
            className={`flex flex-col items-center gap-1 ${activeMobileTab === 'map' ? 'text-primary' : 'text-slate-400'}`}
          >
            <span className="material-icons-round text-xl">map</span>
            <span className="text-[9px] font-extrabold uppercase">Mapa</span>
          </button>
          <button 
            onClick={() => { setActiveMobileTab('fleet'); navigate('/cliente'); }}
            className={`flex flex-col items-center gap-1 ${activeMobileTab === 'fleet' ? 'text-primary' : 'text-slate-400'}`}
          >
            <span className="material-icons-round text-xl">directions_car</span>
            <span className="text-[9px] font-extrabold uppercase">Frota</span>
          </button>
          <button 
            onClick={() => { setActiveMobileTab('control'); navigate('/cliente'); }}
            className={`flex flex-col items-center gap-1 ${activeMobileTab === 'control' ? 'text-primary' : 'text-slate-400'}`}
          >
            <span className="material-icons-round text-xl">tune</span>
            <span className="text-[9px] font-extrabold uppercase">Painel</span>
          </button>
        </div>
      )}

    </div>
  );
};
