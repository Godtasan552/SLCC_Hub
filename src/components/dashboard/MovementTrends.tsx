'use client';

import { useMemo, useState, useEffect } from 'react';

interface MovementData {
  date: string;
  checkIn: number;
  checkOut: number;
}

interface MovementTrendsProps {
  data: MovementData[];
}

type FilterRange = '1D' | '3D' | '7D' | '14D' | '30D' | '60D' | '90D';

export default function MovementTrends({ data }: MovementTrendsProps) {
  const [range, setRange] = useState<FilterRange>('7D');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Delay setting mounted to avoid synchronous state update warning during hydration
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const sortedFullData = useMemo(() => {
    return [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  const filteredData = useMemo(() => {
    let days = 7;
    switch (range) {
        case '1D': days = 1; break;
        case '3D': days = 3; break;
        case '7D': days = 7; break;
        case '14D': days = 14; break;
        case '30D': days = 30; break;
        case '60D': days = 60; break;
        case '90D': days = 90; break;
    }
    return sortedFullData.slice(-days);
  }, [range, sortedFullData]);

  if (data.length === 0) {
    return null;
  }

  // Chart Dimensions
  const height = 300;
  const padding = 40;
  const minWidth = 600;
  
  // Dynamic width calculation
  const barWidthRaw = filteredData.length > 30 ? 6 : filteredData.length > 14 ? 12 : 24;
  const gap = filteredData.length > 30 ? 2 : filteredData.length > 14 ? 6 : 12;
  const groupWidth = (barWidthRaw * 2) + gap; // 2 bars per group
  
  const graphWidth = Math.max(minWidth, filteredData.length * groupWidth + (padding * 2));

  // Max Value for Y Axis
  const maxValue = Math.max(
      ...filteredData.map(d => Math.max(d.checkIn, d.checkOut)),
      10 // Minimum scale
  ) * 1.2;

  const getX = (index: number) => {
      const drawableWidth = graphWidth - (padding * 2);
      const step = drawableWidth / (filteredData.length || 1);
      return padding + (index * step) + (step / 2);
  };

  const getY = (val: number) => height - padding - (val / maxValue) * (height - 2 * padding);
  const getBarHeight = (val: number) => (val / maxValue) * (height - 2 * padding);

  const filters: { label: string; value: FilterRange }[] = [
      { label: 'วันนี้', value: '1D' },
      { label: '3 วัน', value: '3D' },
      { label: '7 วัน', value: '7D' },
      { label: '14 วัน', value: '14D' },
      { label: '30 วัน', value: '30D' },
      { label: '60 วัน', value: '60D' },
      { label: '90 วัน', value: '90D' },
  ];

  return (
    <div className="card border-0 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px' }}>
      <div className="card-header bg-transparent border-0 pt-4 px-4">
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div>
                <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>
                    <i className="bi bi-arrow-left-right me-2 text-info"></i>สถิติการเข้า-ออก (In/Out)
                </h5>
                <p className="text-secondary small mb-0 opacity-75">เปรียบเทียบจำนวนผู้ลงทะเบียนใหม่และผู้ที่ออกจากศูนย์</p>
            </div>
            
            <div className="d-flex flex-wrap gap-2">
                {filters.map(f => (
                    <button
                        key={f.value}
                        onClick={() => setRange(f.value)}
                        className={`btn btn-sm rounded-pill px-3 ${range === f.value ? 'btn-info text-white' : 'btn-outline-secondary'}`}
                        style={{ fontSize: '0.8rem' }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>
        </div>
      </div>
      
      <div className="card-body px-0 pb-4 overflow-hidden">
         {/* Legends */}
         <div className="d-flex align-items-center justify-content-center gap-4 mb-3">
            <div className="d-flex align-items-center small">
                <span className="d-inline-block rounded-circle me-2" style={{ width: 10, height: 10, backgroundColor: '#198754' }}></span>
                เข้าพักใหม่ ({filteredData.reduce((acc, c) => acc + c.checkIn, 0).toLocaleString()})
            </div>
            <div className="d-flex align-items-center small">
                <span className="d-inline-block rounded-circle me-2" style={{ width: 10, height: 10, backgroundColor: '#dc3545' }}></span>
                ออกจากศูนย์ ({filteredData.reduce((acc, c) => acc + c.checkOut, 0).toLocaleString()})
            </div>
         </div>

        <div className="table-responsive custom-scrollbar px-4" style={{ overflowX: 'auto' }}>
            {!mounted ? (
                <div className="d-flex align-items-center justify-content-center" style={{ height: '300px' }}>
                   <div className="spinner-border text-secondary opacity-25" role="status"></div>
                </div>
            ) : (
                <svg width={graphWidth} height={height} style={{ minWidth: '100%', overflow: 'visible' }}>
                    {/* Grid */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y = padding + ratio * (height - 2 * padding);
                        const val = Math.round(maxValue - ratio * maxValue);
                        return (
                            <g key={ratio}>
                                <line x1={padding} y1={y} x2={graphWidth - padding} y2={y} stroke="var(--text-secondary)" strokeOpacity="0.1" strokeDasharray="4" />
                                <text x={padding - 10} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-secondary)">{val}</text>
                            </g>
                        );
                    })}

                    {filteredData.map((d, i) => {
                        const cx = getX(i);
                        const hIn = getBarHeight(d.checkIn);
                        const hOut = getBarHeight(d.checkOut);
                        
                        // Center the group of bars around cx
                        // [BarIn] [gap] [BarOut]
                        const xIn = cx - barWidthRaw - 1;
                        const xOut = cx + 1;

                        return (
                            <g key={i}>
                                {/* Check In Bar */}
                                {d.checkIn > 0 && (
                                    <rect x={xIn} y={getY(d.checkIn)} width={barWidthRaw} height={hIn} fill="#198754" rx="2" opacity="0.9">
                                        <title>เข้า: {d.checkIn}</title>
                                    </rect>
                                )}

                                {/* Check Out Bar */}
                                {d.checkOut > 0 && (
                                    <rect x={xOut} y={getY(d.checkOut)} width={barWidthRaw} height={hOut} fill="#dc3545" rx="2" opacity="0.9">
                                        <title>ออก: {d.checkOut}</title>
                                    </rect>
                                )}
                                
                                {/* Date Label (Optimized for density) */}
                                {((filteredData.length < 15) || i === filteredData.length - 1 || i % Math.ceil(filteredData.length / 8) === 0) && (
                                    <text x={cx} y={height - padding + 20} textAnchor="middle" fontSize="10" fill="var(--text-primary)" opacity="0.8">
                                        {new Date(d.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            )}
        </div>
      </div>
    </div>
  );
}
