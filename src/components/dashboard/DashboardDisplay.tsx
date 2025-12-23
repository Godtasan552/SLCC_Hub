'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import useSWR from 'swr';
import StatsGrid from './StatsGrid';
import CapacityOverview from './CapacityOverview';
import CriticalShelters from './CriticalShelters';
import OccupancyTrends from './OccupancyTrends';
import MovementTrends from './MovementTrends';
import RequestStatusChart from './RequestStatusChart';
import { Stats, Shelter as ShelterType } from '@/types/shelter';

const fetcher = (url: string) => axios.get(url).then(res => res.data.data);

interface DashboardData extends Stats {
  criticalList: ShelterType[];
  trendData: { date: string; occupancy: number }[];
  movementData: { date: string; checkIn: number; checkOut: number }[];
  requestStats: {
    pending: number;
    approved: number;
    received: number;
    rejected: number;
  };
}

interface DashboardDisplayProps {
  initialData: DashboardData;
}

export default function DashboardDisplay({ initialData }: DashboardDisplayProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const { data: dashboardData } = useSWR<DashboardData>('/api/dashboard/stats', fetcher, {
    fallbackData: initialData,
    refreshInterval: 15000, // Refresh dashboard every 15 seconds
    revalidateOnFocus: true
  });

  const displayData = dashboardData || initialData;

  const stats: Stats = {
    totalShelters: displayData.totalShelters,
    totalCapacity: displayData.totalCapacity,
    totalOccupancy: displayData.totalOccupancy,
    criticalShelters: displayData.criticalShelters,
    warningShelters: displayData.warningShelters,
    totalResourceRequests: displayData.totalResourceRequests,
    totalSupplies: displayData.totalSupplies,
    lowStockSupplies: displayData.lowStockSupplies,
    outOfStockSupplies: displayData.outOfStockSupplies
  };

  return (
    <div className="animate-fade-in">
      {/* Dashboard Section */}
      <section className="mb-5">
         <div className="d-flex align-items-center justify-content-between mb-4">
            <div>
              <h2 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>แดชบอร์ดภาพรวม</h2>
              <p className="text-secondary mb-0">ติดตามสถานะศูนย์พักพิงและทรัพยากรแบบเรียลไทม์ (SWR Enabled)</p>
            </div>
            <div className="text-end text-secondary small">
              อัปเดตล่าสุด: {mounted ? new Date().toLocaleTimeString('th-TH') : '--:--:--'}
            </div>
         </div>

         <StatsGrid stats={stats} />

         <div className="row g-4 mb-4">
            <div className="col-12 col-lg-8">
              <CapacityOverview stats={stats} />
            </div>
            <div className="col-12 col-lg-4">
              <CriticalShelters shelters={displayData.criticalList as unknown as ShelterType[]} />
            </div>
         </div>

         {/* New Row for Request Status Donut Chart */}
         <div className="row g-4 mb-4">
            <div className="col-12 col-lg-4">
              <RequestStatusChart stats={displayData.requestStats} />
            </div>
            <div className="col-12 col-lg-8">
              <div className="card h-100 shadow-sm border-0 bg-card d-flex align-items-center justify-content-center p-4">
                 <div className="text-center">
                    <i className="bi bi-info-circle text-primary h1 mb-3"></i>
                    <h5 className="fw-bold">ข้อมูลการบริหารจัดการทรัพยากร</h5>
                    <p className="text-secondary small">ระบบติดตามสถานะคำร้องขอสิ่งของและเสบียงแยกตามสถานะการดำเนินการ (รออนุมัติ, อนุมัติแล้ว, และปฏิเสธ)</p>
                 </div>
              </div>
            </div>
         </div>

         {/* Growth Graph */}
         <div className="mb-4">
            <OccupancyTrends data={displayData.trendData} />
         </div>

         {/* Movement Graph */}
         <div className="mb-4">
            <MovementTrends data={displayData.movementData} />
         </div>
      </section>
    </div>
  );
}
