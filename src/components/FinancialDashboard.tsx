import React, { useEffect, useState } from 'react';
import { getCustomers, getInvoices, checkOverduePayments, AsaasCustomer, AsaasPayment } from '../services/asaasApi';

// Helper to format currency
const formatBRL = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const FinancialDashboard: React.FC = () => {
  const [customers, setCustomers] = useState<AsaasCustomer[]>([]);
  const [invoices, setInvoices] = useState<AsaasPayment[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      const cs = await getCustomers();
      const invs = await getInvoices();
      setCustomers(cs);
      setInvoices(invs);

      // Calculate overdue
      const overdue = invs.filter(i => i.status === 'OVERDUE').length;
      setOverdueCount(overdue);

      // Calculate revenue for current month (received payments)
      const now = new Date();
      const month = now.getMonth();
      const year = now.getFullYear();
      const revenue = invs.reduce((sum, inv) => {
        if (inv.status === 'RECEIVED') {
          const payDate = new Date(inv.paymentDate ?? '');
          if (payDate.getFullYear() === year && payDate.getMonth() === month) {
            return sum + inv.value;
          }
        }
        return sum;
      }, 0);
      setMonthlyRevenue(revenue);
    };
    loadData();
  }, []);

  // Synchronize overdue status on mount (simulates automation)
  useEffect(() => {
    const { suspendedClientIds, unsuspendedClientIds } = checkOverduePayments();
    if (suspendedClientIds.length || unsuspendedClientIds.length) {
      // Refresh after status change
      getCustomers().then(setCustomers);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0a111b] border border-white/10 rounded-2xl p-4 shadow-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase">Clientes Ativos</h3>
          <p className="mt-2 text-xl font-black text-white">{customers.filter(c => c.status === 'Ativo').length}</p>
        </div>
        <div className="bg-[#0a111b] border border-white/10 rounded-2xl p-4 shadow-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase">Faturas Emitidas</h3>
          <p className="mt-2 text-xl font-black text-white">{invoices.length}</p>
        </div>
        <div className="bg-[#0a111b] border border-white/10 rounded-2xl p-4 shadow-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase">Atrasos</h3>
          <p className="mt-2 text-xl font-black text-red-500">{overdueCount}</p>
        </div>
        <div className="bg-[#0a111b] border border-white/10 rounded-2xl p-4 shadow-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase">Faturamento Mensal</h3>
          <p className="mt-2 text-xl font-black text-emerald-400">{formatBRL(monthlyRevenue)}</p>
        </div>
      </div>

      {/* Clientes Table */}
      <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#0a111b]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#0a111b]/50 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Plano</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Próximo Vencimento</th>
              <th className="px-4 py-2">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {customers.map(c => {
              const nextInvoice = invoices
                .filter(i => i.customerId === c.id && i.status !== 'RECEIVED')
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
              return (
                <tr key={c.id} className="hover:bg-white/5">
                  <td className="px-4 py-2 text-white">{c.name}</td>
                  <td className="px-4 py-2 text-white">{c.plan}</td>
                  <td className={`px-4 py-2 ${c.status === 'Bloqueado' ? 'text-red-500' : c.status === 'Inativo' ? 'text-yellow-500' : 'text-emerald-500'}`}>{c.status}</td>
                  <td className="px-4 py-2 text-white">{nextInvoice ? nextInvoice.dueDate : '-'} </td>
                  <td className="px-4 py-2 text-white">{nextInvoice ? formatBRL(nextInvoice.value) : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
