import React, { useState, useEffect, useRef } from 'react';
import { SystemLogs } from './src/components/SystemLogs';
import { useRouter } from './router';
import { getDevices, getPositions, sendCommand, validateSession } from './src/services/traccarApi';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polygon, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { getDistanceInMeters, isPointInPolygon } from './src/utils/geofenceMath';
import { 
  getCustomers, 
  createCustomer, 
  removeCustomer, 
  updateCustomerStatus, 
  getInvoices, 
  createInvoice, 
  payInvoice, 
  checkOverduePayments,
  isProductionModeActive,
  setProductionMode,
  resetMockData,
  getAsaasConfig,
  saveAsaasConfig,
  AsaasCustomer,
  AsaasPayment,
  AsaasConfig
} from './src/services/asaasApi';

// Interface para clientes mapeada ao Asaas
type Cliente = AsaasCustomer;

// Interface para Permissões de Bloqueio por Cliente
export interface CustomerLockPermission {
  allowLock: boolean;
  allowUnlock: boolean;
  requirePin: boolean;
  allowMovingLock: boolean;
  pinHash?: string;
}

// Interface para Configurações de Bloqueio por Veículo
export interface VehicleLockSetting {
  lockEnabled: boolean;
  allowMovingLock: boolean;
  maxLockSpeed: number;
}

// Interface de Log de Auditoria
export interface AuditLog {
  id: string;
  time: string;
  user: string;
  deviceId: number;
  deviceName: string;
  action: 'block' | 'unblock' | 'permission_change' | 'setting_change';
  status: 'success' | 'failed';
  reason?: string;
}

// Função para criptografar PIN de 4 dígitos via SHA-256
export const hashPin = async (pin: string): Promise<string> => {
  try {
    const msgBuffer = new TextEncoder().encode(pin);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // fallback caso crypto.subtle não esteja disponível (por ex. HTTP local não seguro)
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
};


// Interface para logs de comandos
interface CommandLog {
  id: string;
  time: string;
  operator: string;
  vehicle: string;
  action: string;
  result: string;
}

// Interface para alertas
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

// Helper component to update map center dynamically
const ChangeMapView: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

// Custom click handler on map for drawing fences
const MapClickHandler: React.FC<{ onClick: (latlng: L.LatLng) => void }> = ({ onClick }) => {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
  });
  return null;
};

// Custom premium vehicle icons for Leaflet
const getCustomCarIcon = (color: 'emerald' | 'yellow' | 'red') => {
  const primaryColor = color === 'emerald' ? 'from-emerald-400 to-emerald-600' : (color === 'red' ? 'from-red-400 to-red-600' : 'from-yellow-400 to-yellow-600');
  const shadowColor = color === 'emerald' ? 'rgba(16,185,129,0.6)' : (color === 'red' ? 'rgba(239,68,68,0.6)' : 'rgba(234,179,8,0.6)');
  const pulseBg = color === 'emerald' ? 'bg-emerald-500/25' : (color === 'red' ? 'bg-red-500/25' : 'bg-yellow-500/25');
  const pulseBorder = color === 'emerald' ? 'bg-emerald-500/15' : (color === 'red' ? 'bg-red-500/15' : 'bg-yellow-500/15');
  
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="relative flex items-center justify-center" style="width: 40px; height: 40px;">
      <div class="absolute -inset-4 rounded-full ${pulseBg} animate-ping opacity-75"></div>
      <div class="absolute -inset-2 rounded-full ${pulseBorder} animate-pulse"></div>
      <div class="h-10 w-10 bg-gradient-to-br ${primaryColor} rounded-full flex items-center justify-center shadow-[0_0_20px_${shadowColor}] border-2 border-white">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff" style="display: block;">
          <path d="M240-160q-33 0-56.5-23.5T160-240v-320q0-33 23.5-56.5T240-640h480q33 0 56.5 23.5T832-560v320q0-33-23.5-56.5T752-160H240Zm0-80h480v-40H240v40Zm0-120h480v-160H240v160Zm0-240h480v-40H240v40Zm100 160q17 0 28.5-11.5T380-480q0-17-11.5-28.5T340-520q-17 0-28.5 11.5T300-480q0 17 11.5 28.5T340-440Zm280 0q17 0 28.5-11.5T660-480q0-17-11.5-28.5T620-520q-17 0-28.5 11.5T580-480q0 17 11.5 28.5T620-440Z"/>
        </svg>
      </div>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

export const AdminArea: React.FC = () => {
  const { navigate } = useRouter();

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
        if (!session || !session.logged || !session.auth || session.role !== 'admin') {
          alert("Acesso restrito a administradores!");
          navigate('/login');
          return;
        }
        
        // Validação em tempo real com o Traccar
        const isValid = await validateSession();
        if (!isValid) {
          alert("Sessão expirou ou não autorizada no servidor Traccar!");
          navigate('/login');
        }
      } catch (e) {
        navigate('/login');
      }
    };
    checkAuth();
  }, [navigate]);

  // Abas do Menu Lateral e Estados de Layout
  const [activeTab, setActiveTab] = useState<'mapa' | 'dashboard' | 'clientes' | 'veiculos' | 'cobrancas' | 'os' | 'instaladores' | 'relatorios' | 'alertas' | 'geocercas' | 'logs' | 'integracoes'>('mapa');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Estados do Mapa Global de Monitoramento
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [searchVehicleQuery, setSearchVehicleQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'online' | 'offline' | 'ignition_on' | 'ignition_off'>('todos');
  const [showHistory, setShowHistory] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const [inlinePassword, setInlinePassword] = useState('');
  const [inlineCommandSending, setInlineCommandSending] = useState(false);

  // Configurações de Alertas Inteligentes (Sincronizado via localStorage)
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

  // Estado de Faturamento e Produção (Asaas SaaS)
  const [isProductionMode, setIsProductionMode] = useState(() => isProductionModeActive());
  const [invoices, setInvoices] = useState<AsaasPayment[]>([]);
  const [asaasConfig, setAsaasConfig] = useState<AsaasConfig>({ apiKey: "", webhookUrl: "https://3arastrearof.com.br/api/asaas/webhook", environment: "sandbox" });

  // Estado para os Clientes (Carregado dinamicamente)
  const [clientes, setClientes] = useState<Cliente[]>([]);

  useEffect(() => {
    const loadClientes = async () => {
      const data = await getCustomers();
      setClientes(data || []);
    };
    loadClientes();
  }, [activeTab]);

  useEffect(() => {
    const loadInvoicesAndConfig = async () => {
      const invData = await getInvoices();
      setInvoices(invData || []);
      const confData = await getAsaasConfig();
      setAsaasConfig(confData);
    };
    loadInvoicesAndConfig();
  }, [activeTab, isProductionMode]);

  // Modal novo cliente
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPlan, setNewPlan] = useState('Plano Prata Plus');
  const [newPlate, setNewPlate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // --- STATES FOR VEHICLES & TELEMETRY ---
  const [devices, setDevices] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loadingTraccar, setLoadingTraccar] = useState(true);

  // --- STATE FOR REMOTE BLOCKING ---
  const [blockStates, setBlockStates] = useState<Record<number, 'blocked' | 'unblocked' | 'sending' | 'waiting'>>(() => {
    try {
      const stored = localStorage.getItem('3a-device-block-states');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [commandLogs, setCommandLogs] = useState<CommandLog[]>(() => {
    try {
      const stored = localStorage.getItem('3a-command-logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [targetBlockDevice, setTargetBlockDevice] = useState<any | null>(null);
  const [blockActionType, setBlockActionType] = useState<'engineStop' | 'engineResume'>('engineStop');
  const [blockPassword, setBlockPassword] = useState('');

  // --- ESTADOS ADICIONADOS PARA BLOQUEIO AVANÇADO, AUDITORIA E MAPAS ---
  // Permissões por cliente
  const [customerPermissions, setCustomerPermissions] = useState<Record<string, CustomerLockPermission>>(() => {
    try {
      const stored = localStorage.getItem('3a-customer-lock-permissions');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Configurações por veículo
  const [vehicleSettings, setVehicleSettings] = useState<Record<number, VehicleLockSetting>>(() => {
    try {
      const stored = localStorage.getItem('3a-vehicle-lock-settings');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Auditoria completa de logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const stored = localStorage.getItem('3a-audit-logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Preferência de camada de mapa global
  const [selectedMapLayer, setSelectedMapLayer] = useState<string>(() => {
    return localStorage.getItem('3a-preferred-map-layer') || 'google-satelite';
  });

  // Menu de escolha de mapa aberto
  const [showLayerSelector, setShowLayerSelector] = useState(false);

  // --- STATE FOR GEOFENCES ---
  const [geofences, setGeofences] = useState<Geofence[]>(() => {
    try {
      const stored = localStorage.getItem('3a-geofences');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // State for drawing/creating geofence
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawType, setDrawType] = useState<'circle' | 'polygon'>('circle');
  const [drawName, setDrawName] = useState('');
  const [drawDeviceId, setDrawDeviceId] = useState<number>(0);
  const [drawAlertType, setDrawAlertType] = useState<'entry' | 'exit' | 'both'>('both');
  const [drawRadius, setDrawRadius] = useState<number>(300); // em metros
  const [drawCenter, setDrawCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [drawPolygonCoords, setDrawPolygonCoords] = useState<{ lat: number; lng: number }[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-8.05389, -34.88111]); // Recife

  // --- VEHICLE PERSONALIZATION (Photo + Icon) ---
  const [vehicleIcons, setVehicleIcons] = useState<Record<number, string>>(() => {
    try {
      const stored = localStorage.getItem('3a-vehicle-icons');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const [vehiclePhotos, setVehiclePhotos] = useState<Record<number, string>>(() => {
    try {
      const stored = localStorage.getItem('3a-vehicle-photos');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const [showVehicleEditModal, setShowVehicleEditModal] = useState(false);
  const [editTargetDevice, setEditTargetDevice] = useState<any | null>(null);

  const handleAdminPhotoUpload = (deviceId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 800;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/webp', 0.65);
          setVehiclePhotos(prev => {
            const next = { ...prev, [deviceId]: dataUrl };
            localStorage.setItem('3a-vehicle-photos', JSON.stringify(next));
            return next;
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const vehicleIconOptions = [
    { id: 'directions_car',   label: 'Carro'     },
    { id: 'two_wheeler',      label: 'Moto'      },
    { id: 'local_shipping',   label: 'Caminhão'  },
    { id: 'directions_bus',   label: 'Ônibus'    },
    { id: 'agriculture',      label: 'Agrícola'  },
    { id: 'electric_car',     label: 'Elétrico'  },
  ];

  // --- ALERTS STATE (Shared via localStorage) ---
  const defaultAlerts: AlertItem[] = [];

  const [alerts, setAlerts] = useState<AlertItem[]>(() => {
    try {
      const stored = localStorage.getItem('3a-alerts');
      return stored ? JSON.parse(stored) : defaultAlerts;
    } catch {
      return defaultAlerts;
    }
  });

  const lastKnownStates = useRef<Record<number, { status: string; ignition: boolean | undefined; speed: number }>>({});

  // Sync state variables to localStorage
  useEffect(() => {
    localStorage.setItem('3a-device-block-states', JSON.stringify(blockStates));
  }, [blockStates]);

  useEffect(() => {
    localStorage.setItem('3a-command-logs', JSON.stringify(commandLogs));
  }, [commandLogs]);

  useEffect(() => {
    localStorage.setItem('3a-geofences', JSON.stringify(geofences));
  }, [geofences]);

  useEffect(() => {
    localStorage.setItem('3a-alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('3a-customer-lock-permissions', JSON.stringify(customerPermissions));
  }, [customerPermissions]);

  useEffect(() => {
    localStorage.setItem('3a-vehicle-lock-settings', JSON.stringify(vehicleSettings));
  }, [vehicleSettings]);

  useEffect(() => {
    localStorage.setItem('3a-audit-logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('3a-preferred-map-layer', selectedMapLayer);
  }, [selectedMapLayer]);

  // Função para verificar transição de cercas virtuais
  const checkGeofenceTransitions = (devicesList: any[], positionsList: any[]) => {
    // Verifica se os alertas de cerca estão habilitados globalmente
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
            // Entrou na cerca
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
            // Saiu da cerca
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

  // Buscar dados Traccar e gerar alertas reais
  const fetchTraccarData = async () => {
    try {
      const [devicesData, positionsData] = await Promise.all([
        getDevices(),
        getPositions()
      ]);

      if (devicesData && positionsData) {
        setDevices(devicesData);
        setPositions(positionsData);
        setLoadingTraccar(false);

        const newAlertsList: AlertItem[] = [];
        const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Carrega configurações ativas de disparo de alertas no Admin
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
              newAlertsList.push({ id: `alert-${Date.now()}-${device.id}-speed`, deviceId: device.id, deviceName: device.name, type: 'overspeed', title: 'Excesso de Velocidade', desc: `${device.name} atingiu ${devSpeed} km/h.`, priority: 'high', time: nowStr, read: false });
            }
            if (configs.ignition && (lastKnown.ignition === false || lastKnown.ignition === undefined) && devIgnition === true) {
              newAlertsList.push({ id: `alert-${Date.now()}-${device.id}-ignon`, deviceId: device.id, deviceName: device.name, type: 'ignition_on', title: 'Ignição LIGADA', desc: `A ignição de ${device.name} foi LIGADA.`, priority: 'low', time: nowStr, read: false });
            }
            if (configs.ignition && lastKnown.ignition === true && devIgnition === false) {
              newAlertsList.push({ id: `alert-${Date.now()}-${device.id}-ignoff`, deviceId: device.id, deviceName: device.name, type: 'ignition_off', title: 'Ignição DESLIGADA', desc: `A ignição de ${device.name} foi DESLIGADA.`, priority: 'low', time: nowStr, read: false });
            }
          }

          lastKnownStates.current[device.id] = { status: currentStatus, ignition: devIgnition, speed: devSpeed };
        });

        // Verificar transições de geocercas
        const geofenceAlerts = checkGeofenceTransitions(devicesData, positionsData);
        const combinedAlerts = [...geofenceAlerts, ...newAlertsList];

        if (combinedAlerts.length > 0) {
          setAlerts(prev => {
            const updated = [...combinedAlerts, ...prev];
            localStorage.setItem('3a-alerts', JSON.stringify(updated));
            return updated;
          });
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados Traccar no Admin:', err);
    }
  };

  useEffect(() => {
    fetchTraccarData();
    const interval = setInterval(fetchTraccarData, 15000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = alerts.filter(a => !a.read).length;
  const highPriorityCount = alerts.filter(a => a.priority === 'high' && !a.read).length;

  const markAllRead = () => setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  const markRead = (id: string) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  const removeAlert = (id: string) => setAlerts(prev => prev.filter(a => a.id !== id));

  const alertIconMap: Record<string, { icon: string; color: string; bg: string; border: string }> = {
    offline:       { icon: 'wifi_off',         color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    overspeed:     { icon: 'speed',             color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
    ignition_on:   { icon: 'key',               color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20' },
    ignition_off:  { icon: 'key_off',           color: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-500/20' },
    geofence_in:   { icon: 'gpp_good',          color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
    geofence_out:  { icon: 'gpp_maybe',         color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  };

  const priorityBadge: Record<string, string> = {
    high:   'bg-red-500/15 text-red-400 border-red-500/30',
    medium: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    low:    'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };
  const priorityLabel: Record<string, string> = { high: 'Crítico', medium: 'Médio', low: 'Baixo' };

  // Adição de Cliente
  const handleAddCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPlate) { alert('Preencha todos os campos obrigatórios!'); return; }
    
    const newCliente = await createCustomer({
      name: newName,
      plan: newPlan,
      plates: [newPlate.toUpperCase().trim()]
    });
    
    setClientes(prev => [newCliente, ...prev]);
    setShowAddModal(false);
    setNewName('');
    setNewPlate('');
  };

  const filteredClientes = clientes.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.plates.some(plate => plate.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // COMANDOS DE BLOQUEIO REMOTO (Apenas Admin)
  const handleOpenBlockConfirmation = (device: any, action: 'engineStop' | 'engineResume') => {
    setTargetBlockDevice(device);
    setBlockActionType(action);
    setBlockPassword('');
    setShowBlockModal(true);
  };

  const handleSendBlockCommand = async () => {
    if (blockPassword !== '1234' && blockPassword !== '4859') {
      alert('Senha de segurança incorreta! Dica de Simulação: use a senha 1234.');
      return;
    }

    if (!targetBlockDevice) return;
    const deviceId = targetBlockDevice.id;
    const deviceName = targetBlockDevice.name;
    const actionText = blockActionType === 'engineStop' ? 'Corte de Combustível' : 'Restabelecimento';

    // 1. Atualizar estado para "comando enviado"
    setBlockStates(prev => ({ ...prev, [deviceId]: 'sending' }));
    setShowBlockModal(false);

    const logId = `log-${Date.now()}`;
    const newLog: CommandLog = {
      id: logId,
      time: new Date().toLocaleTimeString('pt-BR') + ' ' + new Date().toLocaleDateString('pt-BR'),
      operator: 'Administrador (carlos.andre@3a)',
      vehicle: deviceName,
      action: actionText,
      result: 'Enviando...'
    };
    setCommandLogs(prev => [newLog, ...prev]);

    // 2. Transicionar para "aguardando resposta"
    setTimeout(() => {
      setBlockStates(prev => ({ ...prev, [deviceId]: 'waiting' }));
      setCommandLogs(prev => prev.map(l => l.id === logId ? { ...l, result: 'Aguardando resposta do veículo...' } : l));
    }, 600);

    // 3. Executar requisição real na API do Traccar
    const apiRes = await sendCommand(deviceId, blockActionType);

    // 4. Retornar resposta final, atualizar log e criar log de auditoria
    setTimeout(() => {
      const finalState = blockActionType === 'engineStop' ? 'blocked' : 'unblocked';
      setBlockStates(prev => ({ ...prev, [deviceId]: finalState }));

      const outcome = apiRes.success 
        ? 'Sucesso (Resposta do Servidor)' 
        : `Simulado (Veículo Offline / ${apiRes.error})`;
      
      setCommandLogs(prev => prev.map(l => l.id === logId ? { ...l, result: outcome } : l));

      // Gravação do Log de Auditoria
      const newAudit: AuditLog = {
        id: `audit-${Date.now()}`,
        time: new Date().toLocaleString('pt-BR'),
        user: 'carlos.andre@3a (Admin)',
        role: 'admin',
        deviceId,
        deviceName,
        action: blockActionType === 'engineStop' ? 'block' : 'unblock',
        status: apiRes.success ? 'success' : 'failed',
        reason: apiRes.success ? 'Comando executado com sucesso.' : `Falha no comando. Detalhe: ${outcome}`
      };
      setAuditLogs(prev => [newAudit, ...prev]);
    }, 2000);
  };

  // DESENHO E CRIAÇÃO DE GEOCERCA
  const handleMapClick = (latlng: L.LatLng) => {
    if (!isDrawing) return;

    if (drawType === 'circle') {
      setDrawCenter({ lat: latlng.lat, lng: latlng.lng });
    } else {
      setDrawPolygonCoords(prev => [...prev, { lat: latlng.lat, lng: latlng.lng }]);
    }
  };

  const handleSaveGeofence = () => {
    if (!drawName.trim()) {
      alert('Insira um nome para a cerca virtual!');
      return;
    }
    if (!drawDeviceId) {
      alert('Selecione um veículo associado!');
      return;
    }
    if (drawType === 'circle' && !drawCenter) {
      alert('Clique no mapa para definir o centro do círculo!');
      return;
    }
    if (drawType === 'polygon' && drawPolygonCoords.length < 3) {
      alert('Clique no mapa para adicionar pelo menos 3 pontos ao polígono!');
      return;
    }

    const matchedDev = devices.find(d => d.id === Number(drawDeviceId));
    const newFence: Geofence = {
      id: `fence-${Date.now()}`,
      name: drawName.trim(),
      type: drawType,
      center: drawType === 'circle' ? drawCenter! : undefined,
      radius: drawType === 'circle' ? drawRadius : undefined,
      coordinates: drawType === 'polygon' ? drawPolygonCoords : undefined,
      deviceId: Number(drawDeviceId),
      deviceName: matchedDev ? matchedDev.name : 'Desconhecido',
      alertType: drawAlertType,
      active: true,
      createdAt: new Date().toLocaleDateString('pt-BR')
    };

    setGeofences(prev => [...prev, newFence]);
    setIsDrawing(false);
    setDrawName('');
    setDrawCenter(null);
    setDrawPolygonCoords([]);
  };

  const handleDeleteGeofence = (id: string) => {
    if (confirm('Deseja realmente remover esta cerca virtual?')) {
      setGeofences(prev => prev.filter(g => g.id !== id));
    }
  };

  const handleToggleGeofenceActive = (id: string) => {
    setGeofences(prev => prev.map(g => g.id === id ? { ...g, active: !g.active } : g));
  };

  const totalFaturamento = isProductionMode
    ? invoices.filter(i => i.status === 'RECEIVED').reduce((sum, i) => sum + i.value, 0)
    : 14890.00;

  const formattedFaturamento = `R$ ${totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const navCategories = [
    {
      title: 'Monitoramento',
      items: [
        { id: 'mapa',        label: 'Mapa Global',          icon: 'map' },
        { id: 'dashboard',   label: 'Dashboard KPI',        icon: 'grid_view' },
        { id: 'alertas',     label: 'Central de Alertas',   icon: 'notifications_active', badge: unreadCount },
        { id: 'geocercas',   label: 'Cercas Virtuais',      icon: 'layers' },
      ]
    },
    {
      title: 'Gestão',
      items: [
        { id: 'clientes',    label: 'Clientes',             icon: 'people' },
        { id: 'veiculos',    label: 'Frota & Bloqueios',    icon: 'directions_car' },
        { id: 'os',          label: 'Ordens de Serviço',    icon: 'build' },
        { id: 'instaladores',label: 'Instaladores',          icon: 'engineering' },
      ]
    },
    {
      title: 'Financeiro',
      items: [
        { id: 'cobrancas',   label: 'Cobranças & Caixa',    icon: 'monetization_on' },
        { id: 'integracoes', label: 'Integração Asaas',     icon: 'extension' },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { id: 'logs',        label: 'Logs do Sistema',      icon: 'terminal' },
      ]
    }
  ];


  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 font-sans flex flex-col md:flex-row relative">
      {/* Luzes difusas de fundo */}
      <div className="absolute top-0 right-0 w-[30rem] h-[30rem] rounded-full bg-blue-900/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] rounded-full bg-yellow-900/5 blur-[120px] pointer-events-none"></div>

      {/* Toggle Mobile */}
      <div className="md:hidden bg-slate-950 text-white p-4 flex items-center justify-between border-b border-white/5 w-full z-40">
        <div className="flex items-center gap-3">
          <span className="material-icons-round text-primary text-xl">security</span>
          <span className="text-sm font-black tracking-tight uppercase">3A RASTREAR ADMIN</span>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
              {unreadCount}
            </span>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-primary focus:outline-none">
            <span className="material-icons-round text-2xl">{isSidebarOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Sidebar Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      } bg-slate-950 text-slate-300 flex flex-col justify-between border-r border-white/5 transition-all duration-300 z-30 fixed md:sticky top-0 bottom-0 left-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } h-screen`}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/20">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="material-icons-round text-primary text-2xl flex-shrink-0">security</span>
              {!isSidebarCollapsed && (
                <div className="flex flex-col min-w-0 transition-opacity duration-300">
                  <span className="text-sm font-black tracking-tight leading-none text-white truncate">
                    3A <span className="text-primary font-black">RASTREAR</span>
                  </span>
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">
                    Painel Admin v2.0
                  </span>
                </div>
              )}
            </div>
            
            {/* Toggle collapse (somente desktop) */}
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
              className="hidden md:flex h-6 w-6 items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              <span className="material-icons-round text-base">
                {isSidebarCollapsed ? 'chevron_right' : 'chevron_left'}
              </span>
            </button>
          </div>

          {/* Contador de alertas críticos no topo */}
          {highPriorityCount > 0 && !isSidebarCollapsed && (
            <div
              onClick={() => { setActiveTab('alertas'); setIsSidebarOpen(false); }}
              className="mx-3 mt-3 cursor-pointer bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2 flex items-center gap-2.5 hover:bg-red-500/20 transition-all"
            >
              <span className="material-icons-round text-red-400 text-base animate-pulse flex-shrink-0">warning</span>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-red-400 uppercase tracking-wider truncate">{highPriorityCount} Alerta{highPriorityCount !== 1 ? 's' : ''} Crítico{highPriorityCount !== 1 ? 's' : ''}</p>
                <p className="text-[8px] text-slate-500 mt-0.5 font-bold uppercase">Visualizar</p>
              </div>
            </div>
          )}

          {/* Nav Categorizada */}
          <nav className="flex-1 p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navCategories.map(cat => (
              <div key={cat.title} className="space-y-1">
                {/* Título da Categoria */}
                {!isSidebarCollapsed ? (
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-3 mb-1.5 mt-2">
                    {cat.title}
                  </p>
                ) : (
                  <div className="border-t border-white/5 my-2 first:mt-0" />
                )}

                {/* Items */}
                {cat.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center ${
                      isSidebarCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'
                    } rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 ${
                      activeTab === item.id
                        ? 'bg-primary text-secondary font-black shadow-[0_4px_15px_rgba(251,191,36,0.12)]'
                        : 'hover:bg-white/5 hover:text-white text-slate-400'
                    }`}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="material-icons-round text-base flex-shrink-0 leading-none">{item.icon}</span>
                      {!isSidebarCollapsed && <span className="truncate leading-none">{item.label}</span>}
                    </div>
                    {!isSidebarCollapsed && 'badge' in item && (item.badge as number) > 0 && (
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center ${
                        activeTab === item.id ? 'bg-secondary/20 text-secondary' : 'bg-red-500 text-white animate-pulse'
                      }`}>
                        {item.badge as number}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </div>

        {/* Info da conta */}
        <div className="p-3 border-t border-white/5 bg-slate-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-[10px] flex-shrink-0">
              AD
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-white leading-none truncate">Administrador</span>
                <span className="text-[8px] text-slate-500 font-semibold mt-1 truncate">carlos.andre@3a</span>
              </div>
            )}
          </div>
          {!isSidebarCollapsed && (
            <button
              onClick={() => {
                localStorage.removeItem('3a-session');
                navigate('/login');
              }}
              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 active:scale-95 transition-all"
              title="Sair do painel"
            >
              <span className="material-icons-round text-xs leading-none">logout</span>
            </button>
          )}
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="hidden md:flex bg-slate-950/40 border-b border-white/5 px-8 py-4 items-center justify-between sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {/* Botão de toggle rápido em desktop se quiser expandir manual */}
            <div>
              <h1 className="text-lg font-black text-white tracking-tight uppercase">
                {activeTab === 'mapa'         && 'Monitoramento em Tempo Real'}
                {activeTab === 'dashboard'    && 'Indicadores de Desempenho'}
                {activeTab === 'alertas'      && 'Central de Alertas Críticos'}
                {activeTab === 'geocercas'    && 'Gestão de Cercas Virtuais'}
                {activeTab === 'logs'         && 'Terminal de Logs do Sistema'}
                {activeTab === 'clientes'     && 'Gerenciamento de Clientes'}
                {activeTab === 'veiculos'     && 'Frota & Bloqueios'}
                {activeTab === 'cobrancas'    && 'Controle de Cobranças e Faturamento'}
                {activeTab === 'os'           && 'Ordens de Serviço Integradas'}
                {activeTab === 'instaladores' && 'Técnicos & Instaladores de Campo'}
                {activeTab === 'relatorios'   && 'Relatórios e Métricas Consolidadas'}
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Plataforma Administrativa Grupo 3A</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Faturamento Rápido na Topbar */}
            {!['dashboard', 'cobrancas'].includes(activeTab) && (
              <div className="hidden lg:flex flex-col items-end border-r border-white/5 pr-4">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Caixa Geral</span>
                <span className="text-xs font-mono font-black text-emerald-400 mt-0.5">{formattedFaturamento}</span>
              </div>
            )}

            {/* Badge de alertas na topbar */}
            <button
              onClick={() => setActiveTab('alertas')}
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                unreadCount > 0
                  ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
              }`}
            >
              <span className="material-icons-round text-sm">notifications</span>
              {unreadCount > 0 ? `${unreadCount} Alerta${unreadCount !== 1 ? 's' : ''}` : 'Sem alertas'}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-500 rounded-full animate-ping" />
              )}
            </button>

            {/* Status Servidor */}
            <div className="flex items-center gap-2 bg-emerald-500/5 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/10 text-[10px] font-black uppercase tracking-wider shadow-sm">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              Servidor Ativo
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        {/* Conteúdo */}
        <main className={`flex-1 z-10 ${activeTab === 'mapa' ? 'relative overflow-hidden' : 'p-6 md:p-8 overflow-y-auto'}`}>

          {/* TAB: MAPA GLOBAL DE MONITORAMENTO */}
          {activeTab === 'mapa' && (
            <div className="absolute inset-0 w-full h-full flex overflow-hidden animate-fade-in">
              {/* Mapa de Fundo */}
              <div className="w-full h-full dark-leaflet z-0">
                <MapContainer
                  key={`admin-global-map-${geofences.length}-${devices.length}-${showRoute}-${selectedMapLayer}`}
                  center={mapCenter}
                  zoom={13}
                  zoomControl={false} // Remover controles padrão para customizar
                  style={{ width: '100%', height: '100%', background: '#070b13' }}
                >
                  <ChangeMapView center={mapCenter} />
                  
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
                  {/* Fallback de mapa escuro padrão caso prefira */}
                  {selectedMapLayer === 'dark-all' && (
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; CARTO'
                    />
                  )}

                  {/* Cercas Virtuais no mapa global */}
                  {geofences.filter(g => g.active).map(fence => {
                    const color = '#3b82f6';
                    return fence.type === 'circle' && fence.center ? (
                      <Circle
                        key={`global-${fence.id}`}
                        center={[fence.center.lat, fence.center.lng]}
                        radius={fence.radius || 300}
                        pathOptions={{ color, fillColor: color, fillOpacity: 0.07, weight: 1.5, dashArray: '4 4' }}
                      />
                    ) : fence.type === 'polygon' && fence.coordinates ? (
                      <Polygon
                        key={`global-${fence.id}`}
                        positions={fence.coordinates.map(c => [c.lat, c.lng])}
                        pathOptions={{ color, fillColor: color, fillOpacity: 0.07, weight: 1.5, dashArray: '4 4' }}
                      />
                    ) : null;
                  })}

                  {/* Rastro do Histórico / Rota do Veículo Selecionado */}
                  {selectedDevice && showRoute && (() => {
                    const pos = positions.find(p => p.deviceId === selectedDevice.id);
                    if (!pos || !pos.latitude || !pos.longitude) return null;
                    const routePoints: [number, number][] = [
                      [pos.latitude - 0.008, pos.longitude - 0.005],
                      [pos.latitude - 0.006, pos.longitude - 0.002],
                      [pos.latitude - 0.003, pos.longitude - 0.004],
                      [pos.latitude, pos.longitude]
                    ];
                    return (
                      <>
                        <Polyline
                          positions={routePoints}
                          pathOptions={{ color: '#fbbf24', weight: 4, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
                        />
                        {/* Pontos de parada simulados */}
                        <Circle center={routePoints[0]} radius={15} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }} />
                        <Circle center={routePoints[2]} radius={15} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1 }} />
                      </>
                    );
                  })()}

                  {/* Veículos no Mapa */}
                  {devices.map(device => {
                    const pos = positions.find(p => p.deviceId === device.id);
                    if (!pos || !pos.latitude || !pos.longitude) return null;
                    const isIgnitionOn = pos.attributes?.ignition === true;
                    const blockState = blockStates[device.id] || 'unblocked';
                    
                    // Cor do marcador baseado no status de ignição e bloqueio
                    const markerColor = blockState === 'blocked' ? 'red' : (isIgnitionOn ? 'emerald' : 'yellow');

                    return (
                      <Marker
                        key={`global-marker-${device.id}`}
                        position={[pos.latitude, pos.longitude]}
                        icon={getCustomCarIcon(markerColor)}
                        eventHandlers={{
                          click: () => {
                            setSelectedDevice(device);
                            setMapCenter([pos.latitude, pos.longitude]);
                          }
                        }}
                      >
                        <Popup>
                          <div className="text-xs text-slate-800 font-bold p-1">
                            <p className="text-sm font-black text-slate-900 uppercase leading-none">{device.name}</p>
                            <p className="mt-1 font-mono text-[9px] text-slate-500">Placa/ID: {device.uniqueId}</p>
                            <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1 text-[10px] text-slate-600">
                              <p className="flex items-center gap-1">
                                <span className="material-icons-round text-xs">key</span>
                                Ignição: <strong className={isIgnitionOn ? 'text-emerald-600' : 'text-slate-600'}>{isIgnitionOn ? 'LIGADA' : 'DESLIGADA'}</strong>
                              </p>
                              <p className="flex items-center gap-1">
                                <span className="material-icons-round text-xs">speed</span>
                                Velocidade: <strong>{Math.round(pos.speed * 1.852)} km/h</strong>
                              </p>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>

                {/* Seletor de Camadas Premium Flutuante no Admin */}
                <div className="absolute top-4 right-4 z-[1000]">
                  <button
                    onClick={() => setShowLayerSelector(!showLayerSelector)}
                    className="bg-slate-950/90 hover:bg-primary hover:text-secondary text-slate-200 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur flex items-center justify-center active:scale-95 transition-all"
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
              </div>

              {/* Painel Esquerdo Flutuante: Lista de Veículos */}
              <div className="absolute top-4 left-4 bottom-4 w-80 bg-slate-950/75 border border-white/5 shadow-2xl rounded-2xl flex flex-col backdrop-blur-md z-[1000] overflow-hidden">
                {/* Cabeçalho */}
                <div className="p-4 border-b border-white/5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5 leading-none">
                      <span className="material-icons-round text-primary text-sm">directions_car</span>
                      Frota Rastreada ({devices.length})
                    </h3>
                    <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">
                      Live
                    </span>
                  </div>

                  {/* Busca */}
                  <div className="relative">
                    <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
                    <input
                      type="text"
                      value={searchVehicleQuery}
                      onChange={e => setSearchVehicleQuery(e.target.value)}
                      placeholder="Buscar veículo ou placa..."
                      className="w-full bg-slate-900/60 border border-white/5 focus:border-primary rounded-xl py-2 pl-9 pr-4 text-[10px] placeholder-slate-500 outline-none transition-all text-white font-bold"
                    />
                  </div>

                  {/* Filtros rápidos */}
                  <div className="flex flex-wrap gap-1">
                    {[
                      { id: 'todos', label: 'Todos' },
                      { id: 'online', label: 'Online' },
                      { id: 'offline', label: 'Offline' },
                      { id: 'ignition_on', label: 'Ign ON' },
                      { id: 'ignition_off', label: 'Ign OFF' },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setStatusFilter(f.id as any)}
                        className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border transition-all ${
                          statusFilter === f.id
                            ? 'bg-primary border-primary text-secondary'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03] p-2 space-y-1">
                  {loadingTraccar ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2">
                      <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Acessando modems GPS...</p>
                    </div>
                  ) : (
                    devices
                      .filter(device => {
                        const matchesQuery = device.name.toLowerCase().includes(searchVehicleQuery.toLowerCase()) || device.uniqueId.toLowerCase().includes(searchVehicleQuery.toLowerCase());
                        const pos = positions.find(p => p.deviceId === device.id);
                        const isOnline = device.status === 'online';
                        const isIgnitionOn = pos?.attributes?.ignition === true;

                        if (statusFilter === 'online') return matchesQuery && isOnline;
                        if (statusFilter === 'offline') return matchesQuery && !isOnline;
                        if (statusFilter === 'ignition_on') return matchesQuery && isIgnitionOn;
                        if (statusFilter === 'ignition_off') return matchesQuery && !isIgnitionOn;
                        return matchesQuery;
                      })
                      .map(device => {
                        const pos = positions.find(p => p.deviceId === device.id);
                        const isIgnitionOn = pos?.attributes?.ignition === true;
                        const blockState = blockStates[device.id] || 'unblocked';
                        const speed = pos ? Math.round((pos.speed || 0) * 1.852) : 0;
                        const isSelected = selectedDevice?.id === device.id;

                        return (
                          <div
                            key={device.id}
                            onClick={() => {
                              setSelectedDevice(device);
                              if (pos && pos.latitude) {
                                setMapCenter([pos.latitude, pos.longitude]);
                              }
                            }}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-primary/10 border-primary text-white shadow-lg'
                                : 'bg-slate-950/40 border-transparent hover:border-white/5 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Ícone de ignição / conexão */}
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                device.status === 'online'
                                  ? (isIgnitionOn ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400')
                                  : 'bg-red-500/10 text-red-400'
                              }`}>
                                <span className="material-icons-round text-base">
                                  {vehicleIcons[device.id] || 'directions_car'}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-[10px] font-black uppercase text-white truncate leading-tight">
                                  {device.name}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-1 text-[8px] text-slate-500 font-bold">
                                  <span className="font-mono">{device.uniqueId}</span>
                                  <span>&bull;</span>
                                  <span className={isIgnitionOn ? 'text-emerald-400' : ''}>
                                    {isIgnitionOn ? 'Ign ON' : 'Ign OFF'}
                                  </span>
                                  {speed > 0 && (
                                    <>
                                      <span>&bull;</span>
                                      <span>{speed} km/h</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Status de Bloqueio Tag */}
                            {blockState === 'blocked' && (
                              <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider flex-shrink-0">
                                BLOQ
                              </span>
                            )}
                          </div>
                        );
                      })
                  )}

                  {!loadingTraccar && devices.length === 0 && (
                    <div className="py-12 text-center text-slate-500">
                      <span className="material-icons-round text-lg">error_outline</span>
                      <p className="text-[9px] uppercase font-black mt-1">Nenhum veículo</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Painel Direito Flutuante: Detalhes do Veículo Selecionado */}
              {selectedDevice && (() => {
                const pos = positions.find(p => p.deviceId === selectedDevice.id);
                const isIgnitionOn = pos?.attributes?.ignition === true;
                const blockState = blockStates[selectedDevice.id] || 'unblocked';
                const speed = pos ? Math.round((pos.speed || 0) * 1.852) : 0;
                const photo = vehiclePhotos[selectedDevice.id];

                return (
                  <div className="absolute top-4 right-4 bottom-4 w-80 bg-slate-950/75 border border-white/5 shadow-2xl rounded-2xl flex flex-col backdrop-blur-md z-[1000] overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/30">
                      <div>
                        <h3 className="text-xs font-black uppercase text-white truncate max-w-[180px]">
                          {selectedDevice.name}
                        </h3>
                        <p className="text-[8px] font-mono text-slate-500 mt-0.5">Placa: {selectedDevice.uniqueId}</p>
                      </div>
                      <button
                        onClick={() => { setSelectedDevice(null); setShowRoute(false); setShowHistory(false); }}
                        className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-white/5 transition-colors"
                      >
                        <span className="material-icons-round text-sm">close</span>
                      </button>
                    </div>

                    {/* Scrollable details */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {/* Photo or Icon */}
                      <div className="relative h-32 rounded-xl overflow-hidden bg-slate-900 border border-white/5 flex items-center justify-center">
                        {photo ? (
                          <img src={photo} alt={selectedDevice.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-600">
                            <span className="material-icons-round text-4xl">{vehicleIcons[selectedDevice.id] || 'directions_car'}</span>
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Sem Imagem</span>
                          </div>
                        )}
                        <span className={`absolute top-2 left-2 text-[8px] font-black border px-2 py-0.5 rounded-full ${
                          selectedDevice.status === 'online' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                        }`}>
                          {selectedDevice.status === 'online' ? 'CONECTADO' : 'SEM CONEXÃO'}
                        </span>
                      </div>

                      {/* Telemetria Expressa */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex flex-col justify-between">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Ignição</span>
                          <span className={`text-[10px] font-black uppercase mt-1 ${isIgnitionOn ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {isIgnitionOn ? 'Ligada' : 'Desligada'}
                          </span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex flex-col justify-between">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Velocidade</span>
                          <span className="text-[10px] font-mono font-black text-white mt-1">
                            {speed} km/h
                          </span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex flex-col justify-between">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Bloqueio</span>
                          <span className={`text-[10px] font-black uppercase mt-1 ${
                            blockState === 'blocked' ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {blockState === 'blocked' ? 'Bloqueado' : 'Ativo'}
                          </span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex flex-col justify-between">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Bateria</span>
                          <span className="text-[10px] font-mono font-black text-emerald-400 mt-1">
                            12.8V
                          </span>
                        </div>
                      </div>

                      {/* Endereço aproximado */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-1">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <span className="material-icons-round text-xs text-primary">pin_drop</span>
                          Localização Aproximada
                        </span>
                        <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
                          {pos?.latitude ? `Recife, PE - Coordenadas: ${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}` : 'Coordenadas indisponíveis'}
                        </p>
                      </div>

                      {/* Botões Rápidos */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            if (pos && pos.latitude) {
                              setMapCenter([pos.latitude, pos.longitude]);
                            }
                          }}
                          className="bg-white/5 hover:bg-white/10 text-white rounded-xl py-2 px-3 text-[9px] font-black uppercase tracking-wider border border-white/5 transition-all flex items-center justify-center gap-1"
                        >
                          <span className="material-icons-round text-sm">my_location</span>
                          Localizar
                        </button>
                        <button
                          onClick={() => { setShowRoute(!showRoute); setShowHistory(false); }}
                          className={`rounded-xl py-2 px-3 text-[9px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1 ${
                            showRoute 
                              ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' 
                              : 'bg-white/5 border-white/5 text-white hover:bg-white/10'
                          }`}
                        >
                          <span className="material-icons-round text-sm">route</span>
                          {showRoute ? 'Ocultar Rota' : 'Gerar Rota'}
                        </button>
                        <button
                          onClick={() => { setShowHistory(!showHistory); setShowRoute(false); }}
                          className={`col-span-2 rounded-xl py-2 px-3 text-[9px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1 ${
                            showHistory 
                              ? 'bg-primary/20 border-primary/30 text-primary' 
                              : 'bg-white/5 border-white/5 text-white hover:bg-white/10'
                          }`}
                        >
                          <span className="material-icons-round text-sm">history</span>
                          {showHistory ? 'Ocultar Linha do Tempo' : 'Ver Histórico & Eventos'}
                        </button>
                      </div>

                      {/* Timeline do Histórico de Eventos */}
                      {showHistory && (
                        <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3 space-y-3 animate-fade-in-up">
                          <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 border-b border-white/5 pb-1.5">
                            <span className="material-icons-round text-xs text-primary">analytics</span>
                            Eventos do Veículo (Últimas 24h)
                          </h4>
                          <div className="space-y-3 font-sans relative pl-3 before:absolute before:left-0.5 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-white/5">
                            <div className="relative">
                              <div className="absolute -left-[14px] top-1 h-2 w-2 rounded-full bg-emerald-500"></div>
                              <p className="text-[9px] text-white font-bold leading-none">Ignição Ligada</p>
                              <p className="text-[7px] text-slate-500 mt-1">Hoje às 18:01 &bull; Recife, PE</p>
                            </div>
                            <div className="relative">
                              <div className="absolute -left-[14px] top-1 h-2 w-2 rounded-full bg-slate-600"></div>
                              <p className="text-[9px] text-slate-300 font-bold leading-none">Deslocamento Iniciado</p>
                              <p className="text-[7px] text-slate-500 mt-1">Hoje às 17:45 &bull; Em trânsito a 48 km/h</p>
                            </div>
                            <div className="relative">
                              <div className="absolute -left-[14px] top-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                              <p className="text-[9px] text-red-400 font-bold leading-none">Saída de Cerca Virtual</p>
                              <p className="text-[7px] text-slate-500 mt-1">Hoje às 17:39 &bull; Cerca "Garagem Central"</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bloqueio / Desbloqueio Rápido Integrado (Inline) */}
                      <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <span className="material-icons-round text-xs text-red-500">power_settings_new</span>
                            Controle Remoto de Motor
                          </span>
                          <span className="text-[7px] bg-red-500/10 text-red-400 border border-red-500/20 px-1 py-0.5 rounded font-black uppercase">
                            Admin
                          </span>
                        </div>

                        {inlineCommandSending ? (
                          <div className="py-4 text-center space-y-2">
                            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-[8px] uppercase tracking-wider text-slate-400 font-black">Transmitindo tele-comando...</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              {blockState === 'blocked' ? (
                                <button
                                  onClick={() => {
                                    if (confirm("Deseja reativar a ignição do veículo?")) {
                                      setInlineCommandSending(true);
                                      setTimeout(async () => {
                                        await sendCommand(selectedDevice.id, 'engineResume');
                                        setBlockStates(prev => ({ ...prev, [selectedDevice.id]: 'unblocked' }));
                                        setInlineCommandSending(false);
                                        alert("Restabelecimento do motor concluído!");
                                      }, 1500);
                                    }
                                  }}
                                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2 px-3 text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-md shadow-emerald-600/10"
                                >
                                  Desbloquear Veículo
                                </button>
                              ) : (
                                <div className="w-full space-y-2">
                                  <input
                                    type="password"
                                    value={inlinePassword}
                                    onChange={e => setInlinePassword(e.target.value)}
                                    placeholder="Senha de segurança (ex: 1234)"
                                    className="w-full bg-slate-950 border border-white/5 focus:border-primary rounded-xl py-2 px-3 text-[9px] text-center text-white outline-none transition-all placeholder-slate-600 font-bold"
                                  />
                                  <button
                                    onClick={() => {
                                      if (inlinePassword !== '1234' && inlinePassword !== '4859') {
                                        alert("Senha de segurança incorreta! Use a senha simulada: 1234");
                                        return;
                                      }
                                      setInlineCommandSending(true);
                                      setTimeout(async () => {
                                        await sendCommand(selectedDevice.id, 'engineStop');
                                        setBlockStates(prev => ({ ...prev, [selectedDevice.id]: 'blocked' }));
                                        setInlineCommandSending(false);
                                        setInlinePassword('');
                                        alert("Comando de corte de combustível enviado com sucesso!");
                                      }, 1500);
                                    }}
                                    className="w-full bg-red-600 hover:bg-red-500 text-white rounded-xl py-2 px-3 text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-md shadow-red-600/10"
                                  >
                                    Cortar Combustível (Bloquear)
                                  </button>
                                </div>
                              )}
                            </div>
                            <span className="block text-[7px] text-slate-500 text-center font-bold">Use a senha "1234" para validar os testes</span>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              );
            })()}
            </div>
          )}

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in-up">
              {/* Modo de Operação Banner (Compacto e Elegante) */}
              <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <span className={`material-icons-round text-xl ${isProductionMode ? 'text-emerald-400 animate-pulse' : 'text-yellow-400'}`}>
                    {isProductionMode ? 'verified_user' : 'science'}
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Modo de Operação: {isProductionMode ? 'Produção SaaS' : 'Simulação'}</h3>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">
                      {isProductionMode 
                        ? 'Ambiente real com faturamento e webhooks integrados ao Asaas.' 
                        : 'Métricas simuladas para testes locais.'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const nextMode = !isProductionMode;
                      setIsProductionMode(nextMode);
                      setProductionMode(nextMode);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border active:scale-95 ${
                      isProductionMode
                        ? 'bg-emerald-600/10 border-emerald-500/20 hover:bg-emerald-600/20 text-emerald-400'
                        : 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    Alternar para {isProductionMode ? 'Simulado' : 'Produção'}
                  </button>
                </div>
              </div>

              {/* Grade de KPIs - Exatamente 5 KPIs Minimalistas */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { title: 'Faturamento Caixa', value: formattedFaturamento, icon: 'payments', desc: 'Mensal consolidado' },
                  { title: 'Clientes Ativos', value: `${clientes.filter(c => c.status === 'Ativo').length} Contas`, icon: 'people', desc: 'Rastreados ativos' },
                  { title: 'GPS Conectados', value: `${devices.filter(d => d.status === 'online').length} / ${devices.length}`, icon: 'online_prediction', desc: 'Dispositivos online' },
                  { title: 'Cercas Ativas', value: `${geofences.filter(g => g.active).length} Regiões`, icon: 'layers', desc: 'Cercas de proteção' },
                  { title: 'Alertas Não Lidos', value: `${unreadCount} Pendentes`, icon: 'warning', desc: 'Prioridade operacional' },
                ].map((kpi, idx) => (
                  <div key={idx} className="bg-slate-950/40 border border-white/5 p-4 rounded-xl backdrop-blur-md relative overflow-hidden group flex flex-col justify-between h-28">
                    <div className="flex items-start justify-between">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{kpi.title}</span>
                      <span className="material-icons-round text-slate-600 text-lg leading-none">{kpi.icon}</span>
                    </div>
                    <div>
                      <span className="text-base font-black text-white font-mono block truncate">{kpi.value}</span>
                      <span className="text-[7px] text-slate-500 uppercase font-black block mt-1 tracking-wider">{kpi.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Informações Auxiliares (Simplificado) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico Translúcido */}
                <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 backdrop-blur-md lg:col-span-2 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-wider leading-none">Volumetria de Telemetria</h3>
                      <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1">Sinais recebidos por hora no gateway</p>
                    </div>
                    <span className="text-[8px] font-black border border-white/10 bg-white/5 text-slate-300 px-2 py-0.5 rounded uppercase">Últimas 6 Horas</span>
                  </div>
                  <div className="flex items-end justify-between h-36 gap-3 pt-2 px-2">
                    {[
                      { h: 'h-[45%]', label: '08h' },
                      { h: 'h-[60%]', label: '09h' },
                      { h: 'h-[75%]', label: '10h' },
                      { h: 'h-[95%]', label: '11h' },
                      { h: 'h-[85%]', label: '12h' },
                      { h: 'h-[90%]', label: '13h' },
                    ].map((bar, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                        <div className="w-full bg-white/5 rounded-lg h-28 relative overflow-hidden flex items-end">
                          <div className={`w-full bg-gradient-to-t from-primary/45 to-primary ${bar.h} rounded-b-lg group-hover:opacity-90 transition-all duration-300`} />
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 font-mono">{bar.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feed de Alertas Simplificado */}
                <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-icons-round text-red-400 text-sm">notifications_active</span>
                        Incidentes Recentes
                      </h3>
                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">{unreadCount}</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {alerts.slice(0, 3).map(a => {
                        const meta = alertIconMap[a.type] || alertIconMap['ignition_on'];
                        return (
                          <div key={a.id} className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${meta.bg} ${meta.border} ${!a.read ? 'ring-1 ring-inset ring-white/5' : 'opacity-60'}`}>
                            <span className={`material-icons-round text-base mt-0.5 ${meta.color}`}>{meta.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className={`text-[10px] font-black ${meta.color} leading-none truncate`}>{a.title}</p>
                              <p className="text-[8px] text-slate-400 mt-1 truncate">{a.desc}</p>
                              <p className="text-[8px] text-slate-500 mt-0.5 font-bold font-mono">{a.time}</p>
                            </div>
                          </div>
                        );
                      })}
                      {alerts.length === 0 && (
                        <div className="py-8 text-center text-slate-600">
                          <span className="material-icons-round text-xl">notifications_off</span>
                          <p className="text-[9px] font-black uppercase mt-1">Sem incidentes</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('alertas')}
                    className="w-full py-2.5 bg-primary hover:bg-yellow-500 text-secondary rounded-xl text-[10px] font-black uppercase tracking-wider transition-all mt-4 active:scale-95"
                  >
                    Central de Incidentes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ALERTAS */}
          {activeTab === 'alertas' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Total de Alertas', value: alerts.length, icon: 'notifications', color: 'from-[#0A2540] to-[#124273]', text: 'text-white' },
                  { label: 'Não Lidos', value: unreadCount, icon: 'mark_email_unread', color: unreadCount > 0 ? 'from-red-500 to-rose-600' : 'from-slate-700 to-slate-800', text: 'text-white' },
                  { label: 'Alta Prioridade', value: highPriorityCount, icon: 'warning', color: highPriorityCount > 0 ? 'from-orange-500 to-amber-600' : 'from-slate-700 to-slate-800', text: 'text-white' },
                ].map((stat, idx) => (
                  <div key={idx} className={`bg-gradient-to-br ${stat.color} ${stat.text} p-5 rounded-2xl shadow-md flex items-center justify-between border border-white/5 relative overflow-hidden`}>
                    <div className="absolute right-2 bottom-2 opacity-10">
                      <span className="material-icons-round text-6xl">{stat.icon}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 block">{stat.label}</span>
                      <span className="text-3xl font-black mt-1 block font-mono">{stat.value}</span>
                    </div>
                    <span className="material-icons-round text-3xl opacity-90">{stat.icon}</span>
                  </div>
                ))}
              </div>

              {/* Painel de Alertas Inteligentes */}
              <div className="bg-white/[0.02] border border-white/5 shadow-2xl rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FBBF24]/20 to-transparent"></div>
                <div className="flex flex-col gap-1 mb-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 leading-none">
                    <span className="material-icons-round text-primary text-xs">notifications_active</span>
                    Configurações de Disparos de Alertas
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Defina quais tipos de eventos o sistema deve monitorar e registrar no feed em tempo real.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Switch Ignição */}
                  <div className="flex items-center justify-between p-3 bg-slate-950/20 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="material-icons-round text-emerald-400 text-sm">key</span>
                      <span className="text-[10px] font-bold text-white font-sans">Ignição (Ligada/Desligada)</span>
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
                  <div className="flex items-center justify-between p-3 bg-slate-950/20 rounded-xl border border-white/5">
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
                  <div className="flex items-center justify-between p-3 bg-slate-950/20 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="material-icons-round text-orange-400 text-sm">wifi_off</span>
                      <span className="text-[10px] font-bold text-white font-sans">Perda de GPS (Offline)</span>
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
                  <div className="flex items-center justify-between p-3 bg-slate-950/20 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="material-icons-round text-blue-400 text-sm">gpp_maybe</span>
                      <span className="text-[10px] font-bold text-white font-sans">Cercas Virtuais (Geofence)</span>
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

              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-tight">Feed de Alertas em Tempo Real</h2>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">Sincronizado com o Traccar a cada 15 segundos</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchTraccarData}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all border border-white/5"
                  >
                    <span className="material-icons-round text-sm">sync</span>
                    Atualizar Agora
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all"
                    >
                      <span className="material-icons-round text-sm">done_all</span>
                      Marcar Todos como Lidos
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl shadow-sm overflow-hidden">
                {alerts.length === 0 ? (
                  <div className="py-16 text-center">
                    <span className="material-icons-round text-slate-600 text-5xl">notifications_off</span>
                    <p className="text-sm font-black text-slate-500 uppercase tracking-wider mt-4">Nenhum alerta ativo</p>
                    <p className="text-xs text-slate-600 mt-2">O sistema está monitorando todos os veículos em tempo real.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {alerts.map(a => {
                      const meta = alertIconMap[a.type] || alertIconMap['ignition_on'];
                      return (
                        <div key={a.id} className={`flex items-start gap-4 px-6 py-4 transition-colors hover:bg-white/[0.02] ${!a.read ? 'bg-blue-500/5' : ''}`}>
                          <div className={`mt-0.5 flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center border ${meta.bg} ${meta.border}`}>
                            <span className={`material-icons-round text-lg ${meta.color}`}>{meta.icon}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-xs font-black ${!a.read ? 'text-white' : 'text-slate-300'}`}>{a.title}</p>
                              <span className={`text-[8px] font-black uppercase tracking-wider border px-2 py-0.5 rounded-full ${priorityBadge[a.priority]}`}>
                                {priorityLabel[a.priority]}
                              </span>
                              {!a.read && (
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{a.desc}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
                                <span className="material-icons-round text-[10px]">directions_car</span>
                                {a.deviceName}
                              </span>
                              <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
                                <span className="material-icons-round text-[10px]">schedule</span>
                                {a.time}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!a.read && (
                              <button
                                onClick={() => markRead(a.id)}
                                title="Marcar como lido"
                                className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg active:scale-95 transition-all"
                              >
                                <span className="material-icons-round text-sm leading-none">done</span>
                              </button>
                            )}
                            <button
                              onClick={() => removeAlert(a.id)}
                              title="Remover alerta"
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg active:scale-95 transition-all"
                            >
                              <span className="material-icons-round text-sm leading-none">close</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: GEOFENCES (NEW SYSTEM) */}
          {activeTab === 'geocercas' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up h-[calc(100vh-140px)]">
              {/* Form & List Sidebar */}
              <div className="lg:col-span-1 flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl p-4 overflow-y-auto max-h-[600px] lg:max-h-full">
                {!isDrawing ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black tracking-wider text-white uppercase flex items-center gap-2">
                        <span className="material-icons-round text-primary text-sm">map</span>
                        Cercas Ativas
                      </h3>
                      <button
                        onClick={() => {
                          setIsDrawing(true);
                          setDrawType('circle');
                          setDrawName('');
                          setDrawDeviceId(devices[0]?.id || 0);
                          setDrawCenter(null);
                          setDrawPolygonCoords([]);
                        }}
                        className="bg-primary hover:bg-yellow-500 text-secondary px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all shadow-md"
                      >
                        <span className="material-icons-round text-sm leading-none">add</span>
                        Nova Cerca
                      </button>
                    </div>

                    <div className="space-y-2 mt-2">
                      {geofences.map(fence => (
                        <div key={fence.id} className="p-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl flex items-start justify-between group">
                          <div className="min-w-0 cursor-pointer flex-1" onClick={() => {
                            if (fence.type === 'circle' && fence.center) {
                              setMapCenter([fence.center.lat, fence.center.lng]);
                            } else if (fence.type === 'polygon' && fence.coordinates && fence.coordinates[0]) {
                              setMapCenter([fence.coordinates[0].lat, fence.coordinates[0].lng]);
                            }
                          }}>
                            <p className="text-[11px] font-bold text-white group-hover:text-primary transition-colors truncate">{fence.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded text-slate-400 font-bold border border-white/5 capitalize">
                                {fence.type === 'circle' ? `Círculo (${fence.radius}m)` : 'Polígono'}
                              </span>
                              <span className="text-[8px] text-slate-500 truncate font-semibold">
                                {fence.deviceName}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Toggle Ativo */}
                            <button
                              onClick={() => handleToggleGeofenceActive(fence.id)}
                              className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                                fence.active ? 'bg-primary' : 'bg-slate-700'
                              }`}
                            >
                              <div className={`bg-[#070b13] w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${
                                fence.active ? 'translate-x-3' : 'translate-x-0'
                              }`} />
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteGeofence(fence.id)}
                              className="p-1 text-slate-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-white/5 rounded-lg active:scale-95 transition-all"
                            >
                              <span className="material-icons-round text-xs leading-none">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}

                      {geofences.length === 0 && (
                        <div className="py-8 text-center">
                          <span className="material-icons-round text-slate-600 text-lg">layers_clear</span>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Nenhuma cerca configurada</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black tracking-wider text-white uppercase flex items-center gap-2 border-b border-white/5 pb-2">
                      <span className="material-icons-round text-primary text-sm">edit_road</span>
                      Desenhar Cerca
                    </h3>

                    {/* Inputs */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nome da Cerca</label>
                        <input
                          type="text"
                          value={drawName}
                          onChange={e => setDrawName(e.target.value)}
                          placeholder="Ex: Garagem Principal"
                          className="w-full bg-slate-950/60 border border-white/5 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tipo de Geocerca</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => { setDrawType('circle'); setDrawCenter(null); setDrawPolygonCoords([]); }}
                            className={`py-2 rounded-xl text-[10px] font-bold uppercase border transition-all ${
                              drawType === 'circle'
                                ? 'bg-primary border-primary text-secondary'
                                : 'bg-slate-950/20 border-white/5 text-slate-400 hover:bg-white/5'
                            }`}
                          >
                            Círculo
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDrawType('polygon'); setDrawCenter(null); setDrawPolygonCoords([]); }}
                            className={`py-2 rounded-xl text-[10px] font-bold uppercase border transition-all ${
                              drawType === 'polygon'
                                ? 'bg-primary border-primary text-secondary'
                                : 'bg-slate-950/20 border-white/5 text-slate-400 hover:bg-white/5'
                            }`}
                          >
                            Polígono
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Veículo Monitorado</label>
                        <select
                          value={drawDeviceId}
                          onChange={e => setDrawDeviceId(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-white/5 focus:border-primary rounded-xl py-2 px-3 text-xs text-white outline-none transition-all"
                        >
                          <option value="0">Selecione um veículo...</option>
                          {devices.map((d: any) => (
                            <option key={d.id} value={d.id}>{d.name} ({d.uniqueId})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tipo de Alerta</label>
                        <select
                          value={drawAlertType}
                          onChange={e => setDrawAlertType(e.target.value as any)}
                          className="w-full bg-slate-950 border border-white/5 focus:border-primary rounded-xl py-2 px-3 text-xs text-white outline-none transition-all"
                        >
                          <option value="entry">Apenas Entrada</option>
                          <option value="exit">Apenas Saída</option>
                          <option value="both">Entrada e Saída</option>
                        </select>
                      </div>

                      {drawType === 'circle' && (
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex justify-between">
                            <span>Raio de Ação</span>
                            <span className="text-primary font-mono">{drawRadius}m</span>
                          </label>
                          <input
                            type="range"
                            min="50"
                            max="2000"
                            step="50"
                            value={drawRadius}
                            onChange={e => setDrawRadius(Number(e.target.value))}
                            className="w-full accent-primary bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      )}

                      {/* Instructions */}
                      <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                          <span className="material-icons-round text-primary text-xs">info</span>
                          Instruções de Desenho
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium leading-relaxed">
                          {drawType === 'circle' 
                            ? 'Clique em qualquer lugar no mapa para posicionar o centro do círculo de monitoramento.' 
                            : 'Clique sucessivas vezes no mapa para delimitar os vértices do polígono. Adicione pelo menos 3 pontos.'}
                        </p>
                        {drawType === 'polygon' && drawPolygonCoords.length > 0 && (
                          <div className="mt-2.5 flex items-center justify-between">
                            <span className="text-[9px] font-mono text-primary font-bold">{drawPolygonCoords.length} pontos inseridos</span>
                            <button
                              type="button"
                              onClick={() => setDrawPolygonCoords([])}
                              className="text-[9px] uppercase font-bold text-red-400 hover:underline"
                            >
                              Limpar Pontos
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsDrawing(false)}
                        className="bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider border border-white/5 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveGeofence}
                        className="bg-primary hover:bg-yellow-500 text-secondary py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all"
                      >
                        Salvar Cerca
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Map Area */}
              <div className="lg:col-span-2 bg-[#03060a] border border-white/5 rounded-2xl overflow-hidden relative h-[450px] lg:h-full dark-leaflet">
                <MapContainer
                  key={`admin-geofence-map-${isDrawing}-${drawType}-${geofences.length}`}
                  center={mapCenter}
                  zoom={14}
                  style={{ width: '100%', height: '100%' }}
                  zoomControl={true}
                >
                  <ChangeMapView center={mapCenter} />
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />

                  {/* Draw click handler */}
                  {isDrawing && <MapClickHandler onClick={handleMapClick} />}

                  {/* Existing Fences overlays */}
                  {geofences.map(fence => {
                    const fenceColor = fence.active ? '#3b82f6' : '#64748b';
                    return fence.type === 'circle' && fence.center ? (
                      <Circle
                        key={fence.id}
                        center={[fence.center.lat, fence.center.lng]}
                        radius={fence.radius || 300}
                        pathOptions={{ color: fenceColor, fillColor: fenceColor, fillOpacity: 0.15 }}
                      >
                        <Popup>
                          <div className="text-xs font-bold text-slate-800 p-0.5">
                            <p className="text-sm font-black uppercase text-blue-600">{fence.name}</p>
                            <p className="mt-1">Veículo: {fence.deviceName}</p>
                            <p className="mt-0.5">Tipo: Círculo ({fence.radius}m)</p>
                            <p className="mt-0.5">Status: {fence.active ? 'Ativo' : 'Inativo'}</p>
                          </div>
                        </Popup>
                      </Circle>
                    ) : fence.type === 'polygon' && fence.coordinates ? (
                      <Polygon
                        key={fence.id}
                        positions={fence.coordinates.map(c => [c.lat, c.lng])}
                        pathOptions={{ color: fenceColor, fillColor: fenceColor, fillOpacity: 0.15 }}
                      >
                        <Popup>
                          <div className="text-xs font-bold text-slate-800 p-0.5">
                            <p className="text-sm font-black uppercase text-blue-600">{fence.name}</p>
                            <p className="mt-1">Veículo: {fence.deviceName}</p>
                            <p className="mt-0.5">Tipo: Polígono</p>
                            <p className="mt-0.5">Status: {fence.active ? 'Ativo' : 'Inativo'}</p>
                          </div>
                        </Popup>
                      </Polygon>
                    ) : null;
                  })}

                  {/* Current Drawing previews */}
                  {isDrawing && drawType === 'circle' && drawCenter && (
                    <>
                      <Circle
                        center={[drawCenter.lat, drawCenter.lng]}
                        radius={drawRadius}
                        pathOptions={{ color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 0.25 }}
                      />
                      <Marker position={[drawCenter.lat, drawCenter.lng]} />
                    </>
                  )}

                  {isDrawing && drawType === 'polygon' && drawPolygonCoords.length > 0 && (
                    <>
                      <Polygon
                        positions={drawPolygonCoords.map(c => [c.lat, c.lng])}
                        pathOptions={{ color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 0.25 }}
                      />
                      {drawPolygonCoords.map((coord, idx) => (
                        <Circle
                          key={idx}
                          center={[coord.lat, coord.lng]}
                          radius={10}
                          pathOptions={{ color: '#fbbf24', fillColor: '#070b13', fillOpacity: 1 }}
                        />
                      ))}
                    </>
                  )}

                  {/* Render Markers for Traccar vehicles */}
                  {devices.map(device => {
                    const pos = positions.find(p => p.deviceId === device.id);
                    if (!pos || !pos.latitude || !pos.longitude) return null;
                    const isIgnitionOn = pos.attributes?.ignition === true;
                    const markerColor = isIgnitionOn ? 'emerald' : 'yellow';

                    return (
                      <Marker
                        key={device.id}
                        position={[pos.latitude, pos.longitude]}
                        icon={getCustomCarIcon(markerColor)}
                      >
                        <Popup>
                          <div className="text-xs text-slate-800 font-bold p-1">
                            <p className="text-sm font-black text-emerald-600 uppercase leading-none">{device.name}</p>
                            <p className="mt-1 font-mono text-[9px]">ID: {device.uniqueId}</p>
                            <p className="mt-0.5">Status: {device.status === 'online' ? 'Online' : 'Offline'}</p>
                            <p className="mt-0.5">Velocidade: {Math.round(pos.speed * 1.852)} km/h</p>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>

                {/* Floating Map Help Overlay */}
                {isDrawing && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-[#fbbf24]/30 px-4 py-2 rounded-xl text-center backdrop-blur shadow-lg z-[1000] flex items-center gap-2 animate-bounce">
                    <span className="material-icons-round text-primary text-sm">gesture</span>
                    <span className="text-[10px] font-black uppercase text-white tracking-wider">
                      {drawType === 'circle' 
                        ? 'Clique no mapa para marcar o CENTRO' 
                        : 'Clique para traçar as linhas do Polígono'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: VEICULOS (NEW PREMIUM MODULE WITH LOCK SYSTEM) */}
          {activeTab === 'veiculos' && (
            <div className="space-y-6 animate-fade-in-up">
              {/* Dashboard Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vehicle List */}
                <div className="lg:col-span-2 flex flex-col gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight">Comando de Bloqueio de Motores</h3>
                      <p className="text-[10px] text-slate-500 font-semibold mt-1">Selecione o veículo abaixo para disparar o bloqueio remoto via Traccar</p>
                    </div>
                    <span className="text-[9px] bg-red-500/10 border border-red-500/20 text-red-400 font-black px-2.5 py-1 rounded uppercase tracking-wider flex items-center gap-1 leading-none">
                      <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping"></span>
                      Operação Crítica (Nível Admin)
                    </span>
                  </div>

                  {loadingTraccar ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Buscando rastreadores da frota...</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {devices.map((device: any) => {
                        const pos = positions.find((p: any) => p.deviceId === device.id);
                        const devSpeed = pos ? Math.round((pos.speed || 0) * 1.852) : 0;
                        const devIgnition = pos?.attributes?.ignition;
                        const currentStatus = blockStates[device.id] || 'unblocked';

                        return (
                          <div key={device.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            {/* Device Info */}
                            <div className="flex items-start gap-3">
                              <div className={`h-9 w-9 rounded-xl flex items-center justify-center border ${
                                device.status === 'online' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                              }`}>
                                <span className="material-icons-round text-lg">directions_car</span>
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-white uppercase leading-none">{device.name}</h4>
                                <p className="text-[9px] text-slate-500 font-mono mt-1">ID: {device.uniqueId} | Ign: {devIgnition ? 'ON' : 'OFF'} | Vel: {devSpeed} km/h</p>
                              </div>
                            </div>

                            {/* Status tags & Action buttons */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                              {/* Configurações Avançadas por Veículo */}
                              {(() => {
                                const setting = vehicleSettings[device.id] || {
                                  lockEnabled: true,
                                  allowMovingLock: false,
                                  maxLockSpeed: 20
                                };
                                return (
                                  <div className="bg-slate-900/50 p-2 rounded-xl border border-white/5 space-y-1.5 text-[9px] w-48">
                                    <div className="flex justify-between items-center text-slate-400 font-bold">
                                      <span>Bloqueio Habilitado</span>
                                      <input
                                        type="checkbox"
                                        checked={setting.lockEnabled}
                                        onChange={(e) => {
                                          setVehicleSettings(prev => ({
                                            ...prev,
                                            [device.id]: { ...setting, lockEnabled: e.target.checked }
                                          }));
                                        }}
                                        className="accent-primary"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-slate-400 font-bold">
                                      <span>Permitir Bloqueio em Movimento</span>
                                      <input
                                        type="checkbox"
                                        checked={setting.allowMovingLock}
                                        onChange={(e) => {
                                          setVehicleSettings(prev => ({
                                            ...prev,
                                            [device.id]: { ...setting, allowMovingLock: e.target.checked }
                                          }));
                                        }}
                                        className="accent-primary"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-slate-400 font-bold">
                                      <span>Velocidade Máxima</span>
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          min={0}
                                          max={150}
                                          value={setting.maxLockSpeed}
                                          onChange={(e) => {
                                            setVehicleSettings(prev => ({
                                              ...prev,
                                              [device.id]: { ...setting, maxLockSpeed: Number(e.target.value) }
                                            }));
                                          }}
                                          className="bg-slate-950 border border-white/10 rounded px-1 py-0.5 w-12 text-center text-white outline-none"
                                        />
                                        <span>km/h</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Status Badge */}
                              <div className="flex flex-col items-end shrink-0">
                                <span className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">Status Bloqueio</span>
                                <span className={`text-[9px] font-black uppercase mt-1 px-2.5 py-0.5 rounded-full border ${
                                  currentStatus === 'blocked' && 'bg-red-500/15 border-red-500/30 text-red-400'
                                } ${
                                  currentStatus === 'unblocked' && 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                } ${
                                  currentStatus === 'sending' && 'bg-blue-500/15 border-blue-500/30 text-blue-400 animate-pulse'
                                } ${
                                  currentStatus === 'waiting' && 'bg-orange-500/15 border-orange-500/30 text-orange-400 animate-pulse'
                                }`}>
                                  {currentStatus === 'blocked' && 'BLOQUEADO'}
                                  {currentStatus === 'unblocked' && 'DESBLOQUEADO'}
                                  {currentStatus === 'sending' && 'COMANDO ENVIADO'}
                                  {currentStatus === 'waiting' && 'AGUARDANDO...'}
                                </span>
                              </div>

                              {/* Button triggers */}
                              <div className="flex gap-2">
                                {currentStatus === 'blocked' ? (
                                  <button
                                    onClick={() => handleOpenBlockConfirmation(device, 'engineResume')}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-lg shadow-emerald-500/10"
                                  >
                                    Desbloquear
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleOpenBlockConfirmation(device, 'engineStop')}
                                    disabled={currentStatus === 'sending' || currentStatus === 'waiting'}
                                    className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-red-500/10"
                                  >
                                    Bloquear
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Logs Sidebar */}
                <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col justify-between max-h-[600px] lg:max-h-full">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight border-b border-white/5 pb-4 mb-4">Registro de Comandos</h3>
                    <div className="space-y-4 overflow-y-auto max-h-[400px] pr-1">
                      {commandLogs.map(log => (
                        <div key={log.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-[10px] space-y-1">
                          <div className="flex justify-between items-center text-slate-500 font-bold">
                            <span>{log.time}</span>
                            <span className="text-primary">{log.action}</span>
                          </div>
                          <p className="text-white font-bold">{log.vehicle}</p>
                          <p className="text-slate-400 font-medium">Por: {log.operator}</p>
                          <div className="pt-1.5 border-t border-white/[0.03] flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 bg-yellow-400 rounded-full"></span>
                            <span className="text-slate-300 font-semibold">{log.result}</span>
                          </div>
                        </div>
                      ))}

                      {commandLogs.length === 0 && (
                        <div className="py-8 text-center text-slate-500">
                          <span className="material-icons-round text-slate-600 text-lg">history</span>
                          <p className="text-[10px] font-black uppercase tracking-wider mt-1">Nenhum comando disparado</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicle Personalization Section */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 animate-fade-in-up">
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">Personalização de Veículos</h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">Defina a foto e o ícone de cada veículo. As alterações são exibidas para os clientes em tempo real.</p>
                  </div>
                  <span className="material-icons-round text-primary text-xl">palette</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {devices.map((device: any) => {
                    const photo = vehiclePhotos[device.id];
                    const icon = vehicleIcons[device.id] || 'directions_car';
                    return (
                      <div key={device.id} className="bg-slate-950/50 border border-white/5 rounded-xl overflow-hidden flex flex-col">
                        {/* Photo Preview */}
                        <div className="relative h-28 bg-gradient-to-br from-slate-950/80 to-slate-900 flex items-center justify-center group">
                          {photo ? (
                            <img src={photo} alt={device.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-slate-600">
                              <span className="material-icons-round text-3xl">{icon}</span>
                              <span className="text-[9px] uppercase font-bold tracking-wider">Sem Foto</span>
                            </div>
                          )}
                          {/* Overlay upload */}
                          <label className="absolute bottom-2 right-2 bg-slate-950/80 hover:bg-primary hover:text-secondary text-slate-300 p-1.5 rounded-lg border border-white/10 cursor-pointer active:scale-95 transition-all shadow-lg flex items-center justify-center z-10" title="Fazer upload de foto">
                            <span className="material-icons-round text-sm">photo_camera</span>
                            <input type="file" accept="image/*" onChange={(e) => handleAdminPhotoUpload(device.id, e)} className="hidden" />
                          </label>
                          {photo && (
                            <button
                              onClick={() => {
                                setVehiclePhotos(prev => {
                                  const next = { ...prev };
                                  delete next[device.id];
                                  localStorage.setItem('3a-vehicle-photos', JSON.stringify(next));
                                  return next;
                                });
                              }}
                              className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-1 rounded-lg border border-red-500/30 active:scale-95 transition-all z-10"
                              title="Remover foto"
                            >
                              <span className="material-icons-round text-sm">delete</span>
                            </button>
                          )}
                        </div>

                        {/* Device Name & Edit Button */}
                        <div className="p-3 flex flex-col gap-2 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-black text-white uppercase truncate">{device.name}</p>
                              <p className="text-[8px] text-slate-500 font-mono mt-0.5">{device.uniqueId}</p>
                            </div>
                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase border ${
                              device.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            }`}>{device.status === 'online' ? 'ONLINE' : 'OFFLINE'}</span>
                          </div>

                          {/* Icon Selector */}
                          <div>
                            <p className="text-[8px] uppercase font-black text-slate-500 tracking-wider mb-1.5">Tipo de Veículo</p>
                            <div className="grid grid-cols-3 gap-1.5">
                              {vehicleIconOptions.map(opt => (
                                <button
                                  key={opt.id}
                                  onClick={() => {
                                    setVehicleIcons(prev => {
                                      const next = { ...prev, [device.id]: opt.id };
                                      localStorage.setItem('3a-vehicle-icons', JSON.stringify(next));
                                      return next;
                                    });
                                  }}
                                  className={`p-1.5 rounded-lg border flex flex-col items-center gap-0.5 transition-all active:scale-95 ${
                                    icon === opt.id
                                      ? 'bg-primary/10 border-primary text-primary'
                                      : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-white hover:border-white/10'
                                  }`}
                                >
                                  <span className="material-icons-round text-base">{opt.id}</span>
                                  <span className="text-[6px] uppercase tracking-widest font-bold leading-none">{opt.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {devices.length === 0 && (
                    <div className="col-span-full py-10 text-center text-slate-500">
                      <span className="material-icons-round text-3xl text-slate-700">directions_car</span>
                      <p className="text-[10px] font-black uppercase tracking-wider mt-2">Nenhum veículo encontrado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CLIENTES */}
          {activeTab === 'clientes' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-xl shadow-sm">
                <div className="relative w-full sm:max-w-xs">
                  <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar cliente ou placa..."
                    className="w-full bg-slate-950/60 border border-white/5 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 pl-10 pr-4 text-xs placeholder-slate-500 outline-none transition-all text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="w-full sm:w-auto bg-primary hover:bg-yellow-500 text-secondary px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
                >
                  <span className="material-icons-round text-lg leading-none">person_add</span>
                  Novo Cliente
                </button>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-950/40 border-b border-white/5 text-slate-400 uppercase font-black tracking-wider text-[9px]">
                        <th className="py-4 px-6">Cliente</th>
                        <th className="py-4 px-6">Plano Contratado</th>
                        <th className="py-4 px-6">Placa(s) Monitorada(s)</th>
                        <th className="py-4 px-6">Data Cadastro</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {filteredClientes.length > 0 ? (
                        filteredClientes.map(cliente => (
                          <tr key={cliente.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-4 px-6 font-bold text-white">{cliente.name}</td>
                            <td className="py-4 px-6 text-slate-400">{cliente.plan}</td>
                            <td className="py-4 px-6">
                              <div className="flex flex-wrap gap-1.5">
                                {cliente.plates.map((plate, index) => (
                                  <span key={index} className="font-mono bg-white/5 border border-white/10 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">
                                    {plate}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-slate-500">{cliente.joinDate}</td>
                            <td className="py-4 px-6">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${
                                cliente.status === 'Ativo'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                {cliente.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex flex-col gap-3 items-end">
                                {/* Switches de Permissões */}
                                {(() => {
                                  const perm = customerPermissions[cliente.id] || {
                                    allowLock: true,
                                    allowUnlock: true,
                                    requirePin: false,
                                    allowMovingLock: false
                                  };
                                  return (
                                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 space-y-2 text-[10px] w-64 text-left">
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-400 font-bold">Permitir Bloqueio</span>
                                        <input
                                          type="checkbox"
                                          checked={perm.allowLock}
                                          onChange={(e) => {
                                            setCustomerPermissions(prev => ({
                                              ...prev,
                                              [cliente.id]: { ...perm, allowLock: e.target.checked }
                                            }));
                                          }}
                                          className="accent-primary"
                                        />
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-400 font-bold">Permitir Desbloqueio</span>
                                        <input
                                          type="checkbox"
                                          checked={perm.allowUnlock}
                                          onChange={(e) => {
                                            setCustomerPermissions(prev => ({
                                              ...prev,
                                              [cliente.id]: { ...perm, allowUnlock: e.target.checked }
                                            }));
                                          }}
                                          className="accent-primary"
                                        />
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-400 font-bold font-sans">Exigir PIN de Segurança</span>
                                        <input
                                          type="checkbox"
                                          checked={perm.requirePin}
                                          onChange={(e) => {
                                            setCustomerPermissions(prev => ({
                                              ...prev,
                                              [cliente.id]: { ...perm, requirePin: e.target.checked }
                                            }));
                                          }}
                                          className="accent-primary"
                                        />
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-400 font-bold">Bloqueio em Movimento</span>
                                        <input
                                          type="checkbox"
                                          checked={perm.allowMovingLock}
                                          onChange={(e) => {
                                            setCustomerPermissions(prev => ({
                                              ...prev,
                                              [cliente.id]: { ...perm, allowMovingLock: e.target.checked }
                                            }));
                                          }}
                                          className="accent-primary"
                                        />
                                      </div>
                                      <div className="pt-2 border-t border-white/5 flex gap-2 items-center">
                                        <input
                                          type="password"
                                          maxLength={4}
                                          placeholder="Definir PIN (4 dígitos)"
                                          onKeyDown={async (e) => {
                                            if (e.key === 'Enter') {
                                              const val = (e.target as HTMLInputElement).value;
                                              if (val.length === 4 && /^\d+$/.test(val)) {
                                                const hash = await hashPin(val);
                                                setCustomerPermissions(prev => ({
                                                  ...prev,
                                                  [cliente.id]: { ...perm, pinHash: hash }
                                                }));
                                                alert("PIN de segurança criptografado e salvo!");
                                                (e.target as HTMLInputElement).value = '';
                                              } else {
                                                alert("O PIN deve conter exatamente 4 números.");
                                              }
                                            }
                                          }}
                                          className="bg-slate-950 border border-white/10 rounded px-2 py-1 text-[9px] w-full text-white placeholder-slate-600 outline-none focus:border-primary text-center"
                                        />
                                      </div>
                                      {perm.pinHash && (
                                        <div className="text-[8px] text-emerald-400 font-mono text-center">PIN Cadastrado & Criptografado ✔</div>
                                      )}
                                    </div>
                                  );
                                })()}
                                
                                {/* Ações de Status e Remoção */}
                                <div className="flex gap-2">
                                  <button
                                    onClick={async () => {
                                      const nextStatus = cliente.status === 'Bloqueado' ? 'Ativo' : 'Bloqueado';
                                      await updateCustomerStatus(cliente.id, nextStatus);
                                      setClientes(prev => prev.map(c => c.id === cliente.id ? { ...c, status: nextStatus } : c));
                                    }}
                                    className={`p-2 border rounded-lg active:scale-95 transition-all inline-flex items-center ${
                                      cliente.status === 'Bloqueado'
                                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                                        : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/20'
                                    }`}
                                    title={cliente.status === 'Bloqueado' ? "Desbloquear" : "Bloquear"}
                                  >
                                    <span className="material-icons-round text-sm leading-none">
                                      {cliente.status === 'Bloqueado' ? 'lock_open' : 'block'}
                                    </span>
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Remover cliente ${cliente.name}?`)) {
                                        await removeCustomer(cliente.id);
                                        setClientes(prev => prev.filter(c => c.id !== cliente.id));
                                      }
                                    }}
                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg active:scale-95 transition-all inline-flex items-center"
                                    title="Excluir"
                                  >
                                    <span className="material-icons-round text-md leading-none">delete</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 font-bold uppercase text-[10px]">
                            Nenhum cliente correspondente encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: INTEGRAÇÕES (ASAAS CONFIGS) */}
          {activeTab === 'integracoes' && (
            <div className="space-y-6 animate-fade-in-up max-w-2xl mx-auto">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FBBF24]/30 to-transparent"></div>
                
                <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                  <div className="h-10 w-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary">
                    <span className="material-icons-round text-2xl">extension</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Integração Financeira Asaas</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configuração de Cobranças, Boletos, Webhooks e PIX Automatizados</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-2">Ambiente de Operação</label>
                    <select
                      value={asaasConfig.environment}
                      onChange={e => setAsaasConfig({ ...asaasConfig, environment: e.target.value as any })}
                      className="w-full bg-slate-900 border border-white/5 focus:border-primary rounded-xl py-3 px-4 text-xs text-white outline-none transition-all"
                    >
                      <option value="sandbox">Sandbox (Ambiente de Homologação / Teste)</option>
                      <option value="production">Produção (Ambiente Real / Cobrança)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-2">Token de Acesso / API Key</label>
                    <input
                      type="password"
                      value={asaasConfig.apiKey}
                      onChange={e => setAsaasConfig({ ...asaasConfig, apiKey: e.target.value })}
                      placeholder="Insira a sua API Key do Asaas ($2b$...)"
                      className="w-full bg-slate-900 border border-white/5 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 text-xs text-white placeholder-slate-600 outline-none transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-2">URL de Webhook (Callback)</label>
                    <input
                      type="text"
                      value={asaasConfig.webhookUrl}
                      onChange={e => setAsaasConfig({ ...asaasConfig, webhookUrl: e.target.value })}
                      placeholder="https://sua-url-de-producao.com/api/asaas/webhook"
                      className="w-full bg-slate-900 border border-white/5 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 text-xs text-white placeholder-slate-600 outline-none transition-all font-mono"
                    />
                  </div>

                  <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-1.5">
                      <span className="material-icons-round text-sm">payments</span>
                      Recursos SaaS Estruturados
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      Esta integração ativa a geração automática de boletos bancários e chaves PIX para clientes suspensos por inadimplência. Assim que o webhook do Asaas enviar a confirmação de liquidação, o status do usuário mudará automaticamente para <strong className="text-emerald-400">Ativo</strong> no banco de dados persistente, restabelecendo os comandos de bloqueio de forma autônoma.
                    </p>
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="bg-white/5 hover:bg-white/10 text-slate-300 py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => {
                        const success = await saveAsaasConfig(asaasConfig);
                        if (success) {
                          alert("Integração Asaas configurada e salva com sucesso no banco de dados!");
                        } else {
                          alert("Erro ao salvar configuração.");
                        }
                      }}
                      className="bg-primary hover:bg-yellow-500 text-secondary py-3 px-6 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-yellow-500/10"
                    >
                      Salvar Integração
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-6 animate-fade-in-up">
              {/* Painel de Auditoria de Bloqueios */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">Logs de Auditoria de Bloqueio</h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">Histórico completo de operações de corte, restabelecimento e alterações de permissões</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Deseja realmente limpar todos os logs de auditoria?")) {
                        setAuditLogs([]);
                      }
                    }}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                  >
                    Limpar Auditoria
                  </button>
                </div>

                <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1 space-y-2">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[8px] uppercase font-black text-slate-500 tracking-wider border-b border-white/5 bg-slate-950/40">
                        <th className="py-2.5 px-4">Data/Hora</th>
                        <th className="py-2.5 px-4">Operador</th>
                        <th className="py-2.5 px-4">Veículo</th>
                        <th className="py-2.5 px-4">Ação</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Detalhes / Justificativa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03] text-[10px]">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-2.5 px-4 text-slate-400 font-mono">{log.time}</td>
                          <td className="py-2.5 px-4 font-bold text-white">
                            {log.user} <span className="text-[8px] text-slate-500 font-bold">({log.role.toUpperCase()})</span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-300 font-bold">{log.deviceName}</td>
                          <td className="py-2.5 px-4 font-bold uppercase">
                            <span className={log.action.includes('block') && !log.action.includes('unblock') ? 'text-red-400' : 'text-emerald-400'}>
                              {log.action === 'block' ? 'CORTE (BLOQUEIO)' : log.action === 'unblock' ? 'RESTABELECIMENTO' : log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                              log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {log.status === 'success' ? 'Sucesso' : 'Falhou'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 italic max-w-[250px] truncate" title={log.reason}>{log.reason || '—'}</td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 font-bold uppercase text-[9px]">
                            Nenhum evento registrado na auditoria
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Logs do Traccar Docker original */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <SystemLogs />
              </div>
            </div>
          )}

          {/* OUTRAS ABAS (Placeholder) */}
          {['cobrancas', 'os', 'instaladores', 'relatorios'].includes(activeTab) && (
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 shadow-sm text-center max-w-lg mx-auto mt-12 animate-fade-in-up">
              <span className="material-icons-round text-primary text-6xl animate-pulse">
                {activeTab === 'os'          && 'build'}
                {activeTab === 'instaladores'&& 'engineering'}
                {activeTab === 'relatorios'  && 'description'}
              </span>
              <h3 className="text-md font-black text-white uppercase tracking-tight mt-4">
                {activeTab === 'os'          && 'Agendamento e Emissão de Ordens de Serviço'}
                {activeTab === 'instaladores'&& 'Credenciamento e Rastreio de Técnicos de Campo'}
                {activeTab === 'relatorios'  && 'Geração de Relatórios e Telemetria Histórica'}
              </h3>
              <p className="text-xs text-slate-400 mt-2">
                O módulo está totalmente estruturado no menu lateral da plataforma. Os dados estão preparados para integração real com banco de dados em etapas posteriores.
              </p>
              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={() => alert(`Ação rápida para ${activeTab} disparada!`)}
                  className="bg-primary text-secondary hover:bg-yellow-500 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider active:scale-95 transition-all shadow"
                >
                  Executar Operação Rápida
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="bg-white/5 hover:bg-white/10 text-slate-300 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
                >
                  Voltar ao Início
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Modal Confirmação de Comando de Bloqueio */}
      {showBlockModal && targetBlockDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#0a111b] border border-white/10 rounded-2xl p-6 shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
            <div className="text-center">
              <span className={`material-icons-round text-5xl mb-2 animate-bounce ${
                blockActionType === 'engineStop' ? 'text-red-500' : 'text-emerald-500'
              }`}>
                {blockActionType === 'engineStop' ? 'warning' : 'lock_open'}
              </span>
              <h3 className="text-lg font-black text-white">
                {blockActionType === 'engineStop' ? 'Confirmar Bloqueio?' : 'Confirmar Desbloqueio?'}
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {blockActionType === 'engineStop' 
                  ? `Deseja enviar comando de CORTE DE COMBUSTÍVEL para o veículo ${targetBlockDevice.name}? O motor será desligado imediatamente.`
                  : `Deseja restabelecer o funcionamento do motor para o veículo ${targetBlockDevice.name}?`}
              </p>
            </div>

            <div className="mt-6">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-2">
                Senha de Segurança do Operador
              </label>
              <input
                type="password"
                value={blockPassword}
                onChange={e => setBlockPassword(e.target.value)}
                placeholder="Insira a senha (ex: 1234)"
                className="w-full bg-slate-900/60 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 text-center text-white text-sm outline-none transition-all"
              />
              <span className="block text-[9px] text-slate-500 text-center mt-1.5 font-bold">Senha de simulação: 1234</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockPassword('');
                }}
                className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 py-3 rounded-xl font-bold text-xs uppercase transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendBlockCommand}
                className={`py-3 rounded-xl font-bold text-xs uppercase shadow-lg transition-all ${
                  blockActionType === 'engineStop'
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Cliente */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#0a111b] border border-white/10 rounded-3xl p-8 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent"></div>

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-md font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span className="material-icons-round text-primary text-xl">person_add</span>
                Cadastrar Cliente
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-300 rounded-lg p-1 transition-colors">
                <span className="material-icons-round text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleAddCliente} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full bg-slate-900 border border-white/5 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 text-xs text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Plano Contratado</label>
                <select
                  value={newPlan}
                  onChange={e => setNewPlan(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 focus:border-primary rounded-xl py-3 px-4 text-xs text-white outline-none transition-all"
                >
                  <option value="Plano Ouro 24h">Plano Ouro 24h</option>
                  <option value="Plano Prata Plus">Plano Prata Plus</option>
                  <option value="Plano Frota Premium">Plano Frota Premium</option>
                  <option value="Plano Básico Individual">Plano Básico Individual</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Placa Inicial do Veículo</label>
                <input
                  type="text"
                  required
                  value={newPlate}
                  onChange={e => setNewPlate(e.target.value)}
                  placeholder="Ex: PGX-9D82"
                  className="w-full bg-slate-900 border border-white/5 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 text-xs text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-white/5 hover:bg-white/10 text-slate-300 py-3 rounded-xl font-black text-xs uppercase tracking-wider border border-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-yellow-500 text-secondary py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-yellow-500/10 transition-all"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
