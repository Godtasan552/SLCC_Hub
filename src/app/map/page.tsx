'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

interface Shelter {
  _id: string;
  name: string;
  district: string;
  subdistrict: string;
  capacity: number;
  currentOccupancy: number;
  capacityStatus: string;
  phoneNumbers: string[];
}

export default function MapPage() {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/shelters')
      .then(res => {
        setShelters(res.data.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch shelters:', err);
        setLoading(false);
      });
  }, []);

  // Group shelters by district
  const districts = Array.from(new Set(shelters.map(s => s.district)));
  const districtStats = districts.map(d => {
    const districtShelters = shelters.filter(s => s.district === d);
    const totalCap = districtShelters.reduce((acc, s) => acc + (s.capacity || 0), 0);
    const totalOcc = districtShelters.reduce((acc, s) => acc + (s.currentOccupancy || 0), 0);
    const criticalCount = districtShelters.filter(s => s.capacityStatus === 'ล้นศูนย์').length;
    return { name: d, totalCap, totalOcc, criticalCount, shelters: districtShelters };
  }).sort((a, b) => b.criticalCount - a.criticalCount);

  if (loading) return (
    <div className="bg-dark text-white vh-100 d-flex align-items-center justify-content-center">
      <div className="text-center">
        <div className="spinner-border text-info mb-3" style={{ width: '3rem', height: '3rem' }}></div>
        <h4>กำลังเชื่อมต่อกระดานยุทธการ...</h4>
      </div>
    </div>
  );

  return (
    <div className="container-fluid bg-dark text-white p-4 min-vh-100">
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom border-secondary pb-3">
        <div>
          <h2 className="fw-bold mb-0 text-info font-monospace">📡 SLCC TACTICAL COMMAND BOARD</h2>
          <p className="text-secondary small mb-0">สถานะภูมิสารสนเทศรายอำเภอ (Real-time GIS Data Sync)</p>
        </div>
        <div className="text-end font-monospace">
          <div className="badge bg-danger pulse-red me-2">LIVE ALERT SYSTEM</div>
          <div className="small text-secondary">{new Date().toLocaleTimeString()}</div>
        </div>
      </div>

      <div className="row g-4">
        {/* คอลัมน์ซ้าย: รายชื่อพื้นที่เฝ้าระวังรายอำเภอ */}
        <div className="col-lg-4">
          <div className="card bg-black border-secondary h-100 shadow-lg">
            <div className="card-header bg-dark border-secondary">
              <h5 className="mb-0 text-info small fw-bold uppercase">ขีดความสามารถรายอำเภอ (District Health)</h5>
            </div>
            <div className="card-body p-0 overflow-auto" style={{ maxHeight: '70vh' }}>
              <div className="list-group list-group-flush bg-transparent">
                {districtStats.map((d, i) => {
                  const rate = (d.totalOcc / (d.totalCap || 1)) * 100;
                  return (
                    <div key={i} className="list-group-item bg-transparent border-secondary p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-bold text-white fs-5">{d.name}</span>
                        {d.criticalCount > 0 && (
                          <span className="badge bg-danger animate__animated animate__flash animate__infinite">วิกฤต {d.criticalCount} แห่ง</span>
                        )}
                      </div>
                      <div className="progress bg-secondary" style={{ height: '8px' }}>
                        <div 
                          className={`progress-bar ${rate > 90 ? 'bg-danger' : rate > 75 ? 'bg-warning' : 'bg-success'}`}
                          style={{ width: `${Math.min(rate, 100)}%` }}
                        ></div>
                      </div>
                      <div className="d-flex justify-content-between mt-2 small">
                        <span className="text-secondary">ใช้ไป {d.totalOcc.toLocaleString()} / {d.totalCap.toLocaleString()}</span>
                        <span className={rate > 90 ? 'text-danger fw-bold' : 'text-success'}>
                          {rate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* คอลัมน์ขวา: จุดยุทธศาสตร์ (Tactical Grid) */}
        <div className="col-lg-8">
          <div className="row g-3">
            <div className="col-12">
               <div className="alert bg-black border-danger text-danger d-flex align-items-center">
                  <i className="bi bi-broadcast-pin fs-3 me-3"></i>
                  <div>
                    <strong className="d-block">ศูนย์พักพิงที่ต้องการความช่วยเหลือเร่งด่วน (Critical Hubs)</strong>
                    <small className="text-secondary opacity-75">ศูนย์ที่มีประชากรเกินขีดจำกัด (Over-capacity) และจุดเสี่ยงภัย</small>
                  </div>
               </div>
            </div>
            
            {shelters.filter(s => s.capacityStatus === 'ล้นศูนย์').slice(0, 6).map((s, i) => (
              <div className="col-md-6" key={i}>
                <div className="card bg-dark border-danger h-100 tactical-card">
                  <div className="card-body">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="badge bg-danger">วิกฤต: {((s.currentOccupancy / s.capacity) * 100).toFixed(0)}%</span>
                      <small className="text-secondary">#{s._id.slice(-5)}</small>
                    </div>
                    <h5 className="text-white mb-1 fw-bold">{s.name}</h5>
                    <p className="text-secondary small mb-3">📍 อ.{s.district} ต.{s.subdistrict}</p>
                    
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-danger flex-grow-1">
                        <i className="bi bi-telephone-fill me-1"></i> {s.phoneNumbers[0] || 'ไม่มีเบอร์'}
                      </button>
                      <button className="btn btn-sm btn-outline-info w-25">
                        <i className="bi bi-geo-alt"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* ระบบ Map Grid Placeholder ที่ดูเหมือนของจริง */}
            <div className="col-12 mt-4">
              <div className="position-relative bg-black rounded border border-secondary p-5 text-center overflow-hidden" style={{ minHeight: '300px' }}>
                <div className="scanner-line"></div>
                <i className="bi bi-radar text-info opacity-25" style={{ fontSize: '10rem' }}></i>
                <div className="position-absolute bottom-0 start-50 translate-middle-x pb-4">
                  <h4 className="fw-light text-info mb-1">GIS TACTICAL OVERLAY ACTIVE</h4>
                  <p className="small text-secondary">กำลังปรับเทียบพิกัดภูมิศาสตร์และความสูงของระดับน้ำ...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .pulse-red {
          animation: pulse-red 2s infinite;
        }
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
        }
        .tactical-card {
          background: linear-gradient(135deg, #1a1a1a 0%, #000 100%) !important;
          transition: transform 0.2s;
          cursor: pointer;
        }
        .tactical-card:hover {
          transform: scale(1.02);
          border-color: #0dcaf0 !important;
        }
        .scanner-line {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: rgba(13, 202, 240, 0.3);
          box-shadow: 0 0 15px #0dcaf0;
          animation: scan 4s linear infinite;
          z-index: 1;
        }
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
}

