import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { Badge, Card, FilterPills, PageHeader } from '../../shared/components/ui';
import { useAuth } from '../../shared/hooks/useAuth';
import { useInstruments, useMembers } from '../../shared/hooks/useFamilyData';
import { projectPortfolio } from '../../lib/calc/finance';
import { formatCurrency } from '../../lib/format';
import { instrumentLabels, instrumentTypes } from '../../types/catalog';
import { InstrumentType } from '../../types/finance';

export function ProjectionsPage() {
  const { user } = useAuth();
  const { instruments } = useInstruments();
  const { members } = useMembers();
  const [types, setTypes] = useState<InstrumentType[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const result = useMemo(() => projectPortfolio(instruments, { types, memberIds }), [instruments, memberIds, types]);
  const chartData = result.horizons.map((horizon) => ({
    horizon,
    netWorth: result.netWorthByHorizon[horizon],
    ...Object.fromEntries(result.rows.map((row) => [instrumentLabels[row.type], row.values[horizon]]))
  }));

  return (
    <>
      <PageHeader
        title="Projections"
        subtitle="Indicative growth across 3, 6, 12, 24, 36, and 60 month horizons."
      />
      <div className="space-y-5">
        <Card className="space-y-4 p-4">
          <FilterPills values={instrumentTypes} selected={types} onChange={setTypes} labelFor={(value) => instrumentLabels[value]} />
          <FilterPills values={members.map((member) => member.id)} selected={memberIds} onChange={setMemberIds} labelFor={(value) => members.find((member) => member.id === value)?.name ?? value} />
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {result.horizons.map((horizon) => {
            const value = result.netWorthByHorizon[horizon];
            const growth = result.currentNetWorth ? ((value - result.currentNetWorth) / Math.abs(result.currentNetWorth)) * 100 : 0;
            return (
              <Card key={horizon} className="p-4">
                <p className="text-sm font-semibold text-slate-500">+{horizon}</p>
                <p className="mt-2 text-xl font-black text-slate-950">{formatCurrency(value, user?.currency)}</p>
                <p className="mt-1 text-xs font-semibold text-teal-700">{growth.toFixed(1)}% vs today</p>
              </Card>
            );
          })}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-4 font-bold text-slate-950">Grouped Projection</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="horizon" />
                  <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value), user?.currency)} />
                  <Legend />
                  {result.rows.map((row, index) => (
                    <Bar key={row.type} dataKey={instrumentLabels[row.type]} fill={row.type === 'loan' ? '#e11d48' : ['#0f766e', '#4f46e5', '#0891b2', '#db2777'][index % 4]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 font-bold text-slate-950">Net Worth Growth</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="horizon" />
                  <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value), user?.currency)} />
                  <Line type="monotone" dataKey="netWorth" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <h2 className="font-bold text-slate-950">Breakdown Table</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                  {result.horizons.map((horizon) => (
                    <th key={horizon} className="px-4 py-3 text-right font-semibold text-slate-600">
                      +{horizon}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.rows.map((row) => (
                  <tr key={row.type}>
                    <td className="px-4 py-3">
                      <Badge tone={row.type === 'loan' ? 'rose' : 'teal'}>{instrumentLabels[row.type]}</Badge>
                    </td>
                    {result.horizons.map((horizon) => (
                      <td key={horizon} className="px-4 py-3 text-right font-medium text-slate-900">
                        {formatCurrency(row.values[horizon], user?.currency)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Projections are indicative estimates based on current rates and are not financial advice.</p>
        </div>
      </div>
    </>
  );
}
