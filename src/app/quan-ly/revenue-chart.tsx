'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

interface ChartData {
  month: string;
  totalFYP: number;
  totalAFYP: number;
  contractCount: number;
}

export default function RevenueChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a4a3a" />
        <XAxis dataKey="month" stroke="#a7f3d0" tick={{ fill: '#a7f3d0', fontSize: 12 }} />
        <YAxis stroke="#a7f3d0" tick={{ fill: '#a7f3d0', fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000000).toFixed(0)}M`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#064e3b', border: '1px solid #065f46', borderRadius: 8 }}
          labelStyle={{ color: '#a7f3d0' }}
          formatter={(value: number, name: string) => [formatCurrency(value), name === 'totalFYP' ? 'IP' : 'AFYP']}
        />
        <Legend formatter={(value: string) => (value === 'totalFYP' ? 'IP' : 'AFYP')} />
        <Bar dataKey="totalFYP" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="totalAFYP" fill="#34d399" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
