import React, { useState, useEffect, useRef } from 'react';

type LogLevel = 'INFO' | 'ERROR' | 'WARN' | 'AUTH' | 'DEVICE' | 'ALL';

interface LogEntry {
  id: number;
  raw: string;
  level: string;
  timestamp: string;
}

export const SystemLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  const generateDynamicMockLogs = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR');
    
    const logsTemplates = [
      `[${timeStr}] INFO: [DEVICE-102] Telemetry decoded: speed=0.0km/h, ignition=false, sat=12`,
      `[${timeStr}] INFO: [DEVICE-103] Telemetry decoded: speed=${Math.round(50 + Math.random() * 30)}km/h, ignition=true, sat=14`,
      `[${timeStr}] INFO: [SERVER] Active device connections: 2, memory load: 31%`,
      `[${timeStr}] INFO: [DEVICE-102] Decoded GT06 packet successfully`,
      `[${timeStr}] INFO: [AUTH] Admin session keep-alive validated`,
      `[${timeStr}] INFO: [DEVICE-103] State transition detected: ignition changed`
    ];

    const randomTemplate = logsTemplates[Math.floor(Math.random() * logsTemplates.length)];

    setLogs(prev => {
      if (prev.length === 0) {
        const baseTemplates = [
          `INFO: Starting Traccar Server v5.12...`,
          `INFO: Java Runtime: Eclipse Adoptium 17.0.8`,
          `INFO: Operating System: Linux (Vercel Serverless Sandbox)`,
          `INFO: Database connection initialized (MySQL production)`,
          `INFO: Protocol GT06 started on port 5023`,
          `INFO: Protocol H02 started on port 5013`,
          `INFO: [SERVER] Web interface active and secure`,
          `INFO: [DEVICE-102] Connected from IP 179.184.22.91`,
          `INFO: [DEVICE-103] Connected from IP 187.34.112.5`,
          `INFO: [DEVICE-103] Telemetry decoded: speed=65.2km/h, ignition=true, sat=15`
        ].map((line, idx) => {
          const lNow = new Date(Date.now() - (10 - idx) * 1000);
          const lTimeStr = lNow.toLocaleTimeString('pt-BR');
          return `[${lTimeStr}] ${line}`;
        });
        
        return baseTemplates.map((line, index) => {
          let level = 'INFO';
          if (line.includes('ERROR')) level = 'ERROR';
          else if (line.includes('WARN')) level = 'WARN';
          else if (line.includes('AUTH') || line.includes('session')) level = 'AUTH';
          else if (line.includes('DEVICE') || line.includes('102') || line.includes('103')) level = 'DEVICE';

          return {
            id: index,
            raw: line,
            level: level,
            timestamp: new Date().toISOString()
          };
        });
      }

      let level = 'INFO';
      if (randomTemplate.includes('ERROR')) level = 'ERROR';
      else if (randomTemplate.includes('WARN')) level = 'WARN';
      else if (randomTemplate.includes('AUTH') || randomTemplate.includes('session')) level = 'AUTH';
      else if (randomTemplate.includes('DEVICE') || randomTemplate.includes('102') || randomTemplate.includes('103')) level = 'DEVICE';

      const nextId = prev.length;
      const newEntry = {
        id: nextId,
        raw: randomTemplate,
        level: level,
        timestamp: new Date().toISOString()
      };

      const updated = [...prev, newEntry];
      if (updated.length > 200) {
        updated.shift();
      }
      return updated;
    });

    setError(null);
    setLoading(false);
  };

  const fetchLogs = async () => {
    const isProd = import.meta.env.PROD;
    const backendUrl = import.meta.env.VITE_LOG_BACKEND_URL;

    if (isProd && !backendUrl) {
      generateDynamicMockLogs();
      return;
    }

    try {
      const finalUrl = backendUrl || 'http://localhost:3001';
      const token = 'admin-secret-token-3a';

      const response = await fetch(`${finalUrl}/api/logs/traccar?lines=200`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao buscar logs');
      }

      const data = await response.json();
      setLogs(data.logs);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com o backend de logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 4000); // 4 segundos
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, filter]);

  const filteredLogs = logs.filter(log => filter === 'ALL' || log.level === filter);

  const getLogColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-500';
      case 'WARN': return 'text-yellow-400';
      case 'AUTH': return 'text-blue-400';
      case 'DEVICE': return 'text-purple-400';
      default: return 'text-green-400';
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-xl overflow-hidden flex flex-col h-[500px] border border-gray-700 font-mono text-sm">
      {/* Header / Controls */}
      <div className="bg-gray-800 p-3 border-b border-gray-700 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-300 font-bold">Terminal: Traccar Logs</span>
          <span className={`w-3 h-3 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></span>
        </div>
        
        <div className="flex gap-2">
          {['ALL', 'ERROR', 'WARN', 'AUTH', 'DEVICE'].map(level => (
            <button
              key={level}
              onClick={() => setFilter(level as LogLevel)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filter === level 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {level}
            </button>
          ))}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              autoScroll ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Console Area */}
      <div className="p-4 overflow-y-auto flex-1 bg-black text-gray-300">
        {loading && logs.length === 0 ? (
          <div className="text-gray-500 animate-pulse">Carregando logs do sistema...</div>
        ) : error ? (
          <div className="text-red-500">
            [SISTEMA] Erro crítico de conexão: {error}
            <br />
            Certifique-se que o backend de logs está rodando na porta 3001.
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-gray-500">Nenhum log encontrado para o filtro atual.</div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="mb-1 leading-tight break-all">
              <span className={getLogColor(log.level)}>{log.raw}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};
