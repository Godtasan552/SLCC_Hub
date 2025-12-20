'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

interface Shelter {
  _id: string;
  name: string;
  district: string;
  capacityStatus: string;
}

export default function MapPage() {
  const [shelters, setShelters] = useState<Shelter[]>([]);

  useEffect(() => {
    axios.get('/api/shelters')
      .then(res => {
        setShelters(res.data.data);
      })
      .catch(err => {
        console.error('Failed to fetch shelters:', err);
      });
  }, []);

  return (
    <div className="container-fluid p-0 h-100 position-relative">
      <div className="p-4 position-absolute top-0 start-0 z-3" style={{ pointerEvents: 'none' }}>
        <div className="bg-dark text-white p-3 rounded shadow-lg" style={{ pointerEvents: 'auto', opacity: 0.9 }}>
          <h4 className="mb-1">📍 แผนที่ศูนย์พักพิงภาพรวม</h4>
          <p className="small mb-0 text-white-50">แสดงที่ตั้งและสถานะความหนาแน่นรายศูนย์</p>
        </div>
      </div>

      <div className="map-placeholder d-flex flex-column align-items-center justify-content-center bg-dark text-white" style={{ height: 'calc(100vh - 60px)' }}>
        <i className="bi bi-map-fill mb-3" style={{ fontSize: '5rem', opacity: 0.2 }}></i>
        <h3 className="fw-light">ระบบแผนที่ภูมิสารสนเทศ (GIS)</h3>
        <p className="text-secondary">กำลังเชื่อมต่อกับฐานข้อมูลพิกัดดาวเทียม...</p>
        
        <div className="mt-4 row g-3 w-50">
          <div className="col-md-4">
             <div className="card bg-danger border-0 h-100 text-center p-3">
                <h2 className="mb-0 text-white">{shelters.filter(s => s.capacityStatus === 'ล้นศูนย์').length}</h2>
                <small className="text-white-50">วิกฤต (ล้น)</small>
             </div>
          </div>
          <div className="col-md-4">
             <div className="card bg-warning border-0 h-100 text-center p-3">
                <h2 className="mb-0 text-dark">{shelters.filter(s => s.capacityStatus === 'ใกล้เต็ม').length}</h2>
                <small className="text-black-50">เฝ้าระวัง (ใกล้เต็ม)</small>
             </div>
          </div>
          <div className="col-md-4">
             <div className="card bg-success border-0 h-100 text-center p-3">
                <h2 className="mb-0 text-white">{shelters.filter(s => s.capacityStatus === 'รองรับได้').length}</h2>
                <small className="text-white-50">ปกติ (ว่าง)</small>
             </div>
          </div>
        </div>

        <button className="btn btn-outline-primary mt-5 px-4" onClick={() => window.location.href = '/'}>
          <i className="bi bi-arrow-left me-2"></i> กลับไปหน้าหลัก
        </button>
      </div>

      <style jsx>{`
        .map-placeholder {
          background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0);
          background-size: 40px 40px;
        }
      `}</style>
    </div>
  );
}
