'use client';
import { Stats } from "@/types/shelter";

interface CapacityOverviewProps {
  stats: Stats;
}

export default function CapacityOverview({ stats }: CapacityOverviewProps) {
  const occupancyRate = (stats.totalOccupancy / (stats.totalCapacity || 1)) * 100;

  return (
    <div className="card shadow-sm border-theme mb-4">
      <div className="card-body py-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>ระดับความหนาแน่นผู้อพยพภาพรวมทั้งจังหวัด</h6>
          <span className="badge bg-light text-dark">
            {stats.totalOccupancy.toLocaleString()} / {stats.totalCapacity.toLocaleString()} คน ({occupancyRate.toFixed(1)}%)
          </span>
        </div>
        <div className="progress" style={{ height: '12px', borderRadius: '6px' }}>
          <div 
            className={`progress-bar progress-bar-striped progress-bar-animated ${occupancyRate > 90 ? 'bg-danger' : occupancyRate > 75 ? 'bg-warning' : 'bg-success'}`}
            style={{ width: `${Math.min(occupancyRate, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
