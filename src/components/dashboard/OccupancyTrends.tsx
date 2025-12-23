'use client';

import { useMemo, useState } from 'react';

interface TrendData {
  date: string;
  occupancy: number;
}

interface OccupancyTrendsProps {
  data: TrendData[];
}

type FilterRange = '1D' | '3D' | '7D' | '14D' | '30D' | '60D' | '90D';

export default function OccupancyTrends({ data }: OccupancyTrendsProps) {
  const [range, setRange] = useState<FilterRange>('7D');

  // Sort data by date just in case
  const sortedFullData = useMemo(() => {
    return [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  const filteredData = useMemo(() => {
    let days = 7;
    switch (range) {
        case '1D': days = 1; break; // Will just show today (and maybe yesterday for context if needed, but strict 1D is 1 point)
        case '3D': days = 3; break;
        case '7D': days = 7; break;
        case '14D': days = 14; break;
        case '30D': days = 30; break;
        case '60D': days = 60; break;
        case '90D': days = 90; break;
    }
    // Slice from the end
    return sortedFullData.slice(-days);
  }, [range, sortedFullData]);

  if (data.length === 0) {
    return (
      <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px' }}>
         <div className="card-body d-flex align-items-center justify-content-center text-secondary">
            ไม่มีข้อมูลประวัติความเคลื่อนไหว
         </div>
      </div>
    );
  }

  // Chart Dimensions
  const height = 300;
  const padding = 40;
  // Dynamic width per point based on data length to fit container better
  const minWidthPerPoint = 30; 
  const computedWidthPerPoint = Math.max(minWidthPerPoint, 800 / (filteredData.length || 1));
  
  const widthPerPoint = filteredData.length > 30 ? 20 : filteredData.length > 14 ? 40 : 80;
  const minWidth = 600; // Force scroll on small screens
  // Ensure the graph fills the space if few points
  const graphWidth = Math.max(minWidth, filteredData.length * widthPerPoint); 

  // Scales
  const maxOccupancy = Math.max(...filteredData.map(d => d.occupancy), 10) * 1.2;
  const minOccupancy = 0;

  const getX = (index: number) => {
      // spread points across the width
      if (filteredData.length <= 1) return padding + (graphWidth - 2 * padding) / 2;
      return padding + index * ((graphWidth - 2 * padding) / (filteredData.length - 1));
  };
  
  const getY = (val: number) => height - padding - ((val - minOccupancy) / (maxOccupancy - minOccupancy)) * (height - 2 * padding);

  // Path Generation
  const points = filteredData.map((d, i) => `${getX(i)},${getY(d.occupancy)}`).join(' ');
  const areaPath = filteredData.length > 1 
      ? `${points} L${getX(filteredData.length - 1)},${height - padding} L${padding},${height - padding} Z`
      : ''; // No area if 1 point

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
                    <i className="bi bi-graph-up-arrow me-2 text-primary"></i>แนวโน้มยอดผู้พักพิง
                </h5>
                <p className="text-secondary small mb-0 opacity-75">แสดงการเปลี่ยนแปลงจำนวนผู้พักพิงรวม</p>
            </div>
            
            <div className="d-flex flex-wrap gap-2">
                {filters.map(f => (
                    <button
                        key={f.value}
                        onClick={() => setRange(f.value)}
                        className={`btn btn-sm rounded-pill px-3 ${range === f.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                        style={{ fontSize: '0.8rem' }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>
        </div>
      </div>
      
      <div className="card-body px-0 pb-4 overflow-hidden">
        <div className="table-responsive custom-scrollbar px-4" style={{ overflowX: 'auto' }}>
            <svg width={graphWidth} height={height} style={{ minWidth: '100%', overflow: 'visible' }}>
                <defs>
                    <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--bs-primary)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="var(--bs-primary)" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Grid */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = padding + ratio * (height - 2 * padding);
                    const val = Math.round(maxOccupancy - ratio * maxOccupancy);
                    return (
                        <g key={ratio}>
                             <line x1={padding} y1={y} x2={graphWidth - padding} y2={y} stroke="var(--text-secondary)" strokeOpacity="0.1" strokeDasharray="4" />
                             <text x={padding - 10} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-secondary)">{val}</text>
                        </g>
                    );
                })}

                {filteredData.length > 1 ? (
                    <>
                        <path d={areaPath} fill="url(#gradientArea)" />
                        <path d={`M${points}`} fill="none" stroke="var(--bs-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
                              style={{ filter: 'drop-shadow(0 4px 6px rgba(13, 110, 253, 0.2))' }}/>
                    </>
                ) : filteredData.length === 1 ? (
                     // Single point representation (Today)
                     <g>
                        <line x1={padding} y1={getY(filteredData[0].occupancy)} x2={graphWidth - padding} y2={getY(filteredData[0].occupancy)} 
                              stroke="var(--bs-primary)" strokeWidth="1" strokeDasharray="4" opacity="0.5" />
                     </g>
                ) : null}

                {/* Points */}
                {filteredData.map((d, i) => (
                    <g key={i} className="point-group">
                        <circle cx={getX(i)} cy={getY(d.occupancy)} r={range === '90D' || range === '60D' ? 3 : 5} 
                                fill="var(--bg-card)" stroke="var(--bs-primary)" strokeWidth="3" 
                                style={{ transition: 'all 0.3s ease' }} />
                        
                        {/* Tooltip (Only show periodic data or last point if high density) */}
                         {((filteredData.length < 15) || i === filteredData.length - 1 || i % Math.ceil(filteredData.length / 10) === 0) && (
                            <g transform={`translate(${getX(i)}, ${getY(d.occupancy) - 15})`}>
                                <rect x="-20" y="-22" width="40" height="20" rx="4" fill="var(--bs-primary)" opacity="0.9" />
                                <text x="0" y="-8" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{d.occupancy}</text>
                            </g>
                         )}

                        {/* X Axis Labels */}
                        {((filteredData.length < 15) || i === filteredData.length - 1 || i % Math.ceil(filteredData.length / 8) === 0) && (
                            <text x={getX(i)} y={height - padding + 20} textAnchor="middle" fontSize="10" fill="var(--text-primary)" opacity="0.8">
                                {new Date(d.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </div>
      </div>
    </div>
  );
}
