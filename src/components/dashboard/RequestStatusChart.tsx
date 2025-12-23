'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface RequestStatusChartProps {
  stats: {
    pending: number;
    approved: number;
    shipped: number;
    received: number;
    rejected: number;
  };
}

const COLORS = {
  pending: '#ffc107',  // Waiting - Warning Yellow
  approved: '#198754', // Approved - Success Green
  shipped: '#0d6efd',  // Shipped - Primary Blue
  received: '#6f42c1', // Received - Purple
  rejected: '#dc3545', // Rejected - Danger Red
};

export default function RequestStatusChart({ stats }: RequestStatusChartProps) {
  // Define all statuses to display even if value is 0
  const data = [
    { name: 'รออนุมัติ', value: stats.pending, color: COLORS.pending },
    { name: 'อนุมัติแล้ว', value: stats.approved, color: COLORS.approved },
    { name: 'กำลังส่ง', value: stats.shipped, color: COLORS.shipped },
    { name: 'ได้รับแล้ว', value: stats.received, color: COLORS.received },
    { name: 'ปฏิเสธ', value: stats.rejected, color: COLORS.rejected },
  ];

  // For chart display, we filter items with value 0 to avoid clutter, 
  // but the legend will show everything if handled differently.
  // Actually, to match "all statuses", let's keep even small ones but only render labels for non-zero.
  const chartData = data.filter(item => item.value > 0);
  const total = stats.pending + stats.approved + stats.shipped + stats.received + stats.rejected;

  interface PieLabelProps {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    value?: number;
    name?: string;
  }

  const renderCustomizedLabel = ({ cx = 0, cy = 0, midAngle = 0, outerRadius = 0, value, name }: PieLabelProps) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="var(--text-primary)" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        style={{ fontSize: '11px', fontWeight: 'bold' }}
      >
        {`${name}: ${value}`}
      </text>
    );
  };

  return (
    <div className="card h-100 shadow-sm border-0 bg-card">
      <div className="card-body d-flex flex-column">
        <h6 className="fw-bold mb-4 text-theme-secondary">สัดส่วนคำร้องขอทรัพยากร (ทุกสถานะ)</h6>
        
        <div className="flex-grow-1" style={{ minHeight: '300px', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                label={renderCustomizedLabel}
                labelLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1 }}
                animationDuration={800}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)'
                }}
              />
              <Legend verticalAlign="bottom" height={40}/>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Central Label */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -100%)', 
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            <div className="small text-secondary fw-medium">คำร้องทั้งหมด</div>
            <div className="h2 fw-bold mb-0 text-theme">{total}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
