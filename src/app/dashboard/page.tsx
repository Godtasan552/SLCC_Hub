'use client';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { Shelter, Stats } from "@/types/shelter";
import StatsGrid from '@/components/dashboard/StatsGrid';
import CapacityOverview from '@/components/dashboard/CapacityOverview';
import ShelterList from '@/components/dashboard/ShelterList';
import CriticalShelters from '@/components/dashboard/CriticalShelters';

export default function UnifiedDashboard() {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [timeRange, setTimeRange] = useState(1); // Default to 1 day (Today)

  const fetchData = useCallback(async () => {
    try {
      const [sheltersRes, statsRes] = await Promise.all([
        axios.get('/api/shelters'),
        axios.get('/api/stats')
      ]);
      setShelters(sheltersRes.data.data);
      setStats(statsRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportToExcel = async () => {
    if (!stats) return;
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const summarySheet = workbook.addWorksheet('สรุปภาพรวม');
      summarySheet.columns = [
        { header: 'หัวข้อ', key: 'title', width: 30 },
        { header: 'จำนวน', key: 'value', width: 20 },
        { header: 'หน่วย', key: 'unit', width: 15 }
      ];
      summarySheet.addRows([
        { title: 'ผู้อพยพรวมทั้งหมด', value: stats.totalOccupancy, unit: 'คน' },
        { title: 'ความจุรวมทั้งหมด', value: stats.totalCapacity, unit: 'คน' },
        { title: 'ความหนาแน่นรวม', value: ((stats.totalOccupancy / (stats.totalCapacity || 1)) * 100).toFixed(2), unit: '%' },
        { title: 'ศูนย์ที่ "ล้น"', value: stats.criticalShelters, unit: 'แห่ง' },
        { title: 'ศูนย์ที่ "ใกล้เต็ม"', value: stats.warningShelters, unit: 'แห่ง' },
      ]);
      summarySheet.getRow(1).font = { bold: true };
      summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };

      const detailSheet = workbook.addWorksheet('รายชื่อศูนย์พักพิง');
      detailSheet.columns = [
        { header: 'ชื่อศูนย์', key: 'name', width: 35 },
        { header: 'อำเภอ', key: 'district', width: 15 },
        { header: 'ความจุ', key: 'capacity', width: 10 },
        { header: 'จำนวนคน', key: 'currentOccupancy', width: 10 },
        { header: 'สถานะ', key: 'capacityStatus', width: 15 },
      ];
      detailSheet.addRows(shelters);
      detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6EFD' } };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `รายงานDashboard_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.xlsx`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('การส่งออกล้มเหลว');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return (
    <div className="container py-5 text-center">
      <div className="spinner-border text-primary" role="status"></div>
      <p className="mt-3 text-secondary">กำลังโหลดข้อมูลรวม...</p>
    </div>
  );

  return (
    <div className="container py-4">
      {/* ส่วนที่ 1: หัวข้อและปุ่ม Export */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4 gap-3">
        <div>
          <h2 className="mb-1" style={{ color: 'var(--text-primary)' }}>📊 แดชบอร์ดความเคลื่อนไหวรายวัน</h2>
          <p className="text-secondary mb-0 small">สรุปสถานะการเข้าพักและจำนวนผู้อพยพเข้า-ออกวันนี้</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm flex-grow-1" onClick={fetchData}>
            <i className="bi bi-arrow-clockwise"></i> รีเฟรช
          </button>
          <button className="btn btn-success btn-sm px-3 flex-grow-1" onClick={exportToExcel} disabled={isExporting}>
            {isExporting ? '...' : <><i className="bi bi-file-earmark-excel me-1"></i> Excel</>}
          </button>
        </div>
      </div>

      {/* ส่วนที่ 2: การ์ดตัวเลขสรุป */}
      {stats && <StatsGrid stats={stats} />}

      {/* ส่วนที่ 2.1: ศูนย์วิกฤต */}
      <CriticalShelters shelters={shelters} />

      {/* ส่วนที่ 3: แถบความหนาแน่นรวม */}
      {stats && <CapacityOverview stats={stats} />}

      {/* ส่วนที่ 4: รายการศูนย์พักพิงแบบตาราง */}
      <ShelterList 
        shelters={shelters}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
    </div>
  );
}
