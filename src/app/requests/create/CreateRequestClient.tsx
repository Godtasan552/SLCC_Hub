'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import ResourceRequest from '@/components/ResourceRequest';

interface Shelter {
  _id: string;
  name: string;
  district: string;
  subdistrict?: string;
}

export default function CreateRequestClient() {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [selectedShelterId, setSelectedShelterId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShelters = async () => {
      try {
        const res = await axios.get('/api/shelters');
        setShelters(res.data.data);
      } catch (err) {
        console.error('Failed to fetch shelters', err);
      } finally {
        setLoading(false);
      }
    };
    fetchShelters();
  }, []);

  const hubShelters = shelters.filter(s => s.name.includes('คลังกลาง'));
  const selectedShelter = shelters.find(s => s._id === selectedShelterId);

  // Auto-select if only one hub exists
  useEffect(() => {
    if (hubShelters.length === 1 && !selectedShelterId) {
      setSelectedShelterId(hubShelters[0]._id);
    }
  }, [hubShelters, selectedShelterId]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-sm mb-4 border-0">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>สร้างรายการขอรับบริจาค (สต็อกกลาง)</h4>
                <Link href="/requests" className="btn btn-sm btn-outline-secondary">
                  <i className="bi bi-arrow-left me-1"></i>กลับหน้ารวม
                </Link>
              </div>
              <p className="text-secondary mb-4">ระบบนี้จำกัดให้เฉพาะ **คลังส่วนกลาง** เป็นผู้ส่งคำขอทรัพยากร เพื่อรวบรวมของบริจาคเข้าสู่ระบบ</p>
              
              <div className="mb-4">
                <label className="form-label fw-bold">เลือกศูนย์คลังกลางที่ต้องการส่งคำขอ</label>
                <select 
                  className="form-select form-select-lg border-primary"
                  value={selectedShelterId}
                  onChange={(e) => setSelectedShelterId(e.target.value)}
                >
                  {hubShelters.length === 0 ? (
                    <option value="">-- ไม่พบข้อมูลคลังกลาง (โปรดสร้างในระบบจัดการ) --</option>
                  ) : hubShelters.length > 1 ? (
                    <>
                      <option value="">-- โปรดเลือกคลังกลาง --</option>
                      {hubShelters.map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </>
                  ) : (
                    hubShelters.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))
                  )}
                </select>
                {hubShelters.length === 0 && (
                  <div className="alert alert-warning mt-2 small py-2">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    ไม่พบศูนย์ที่ชื่อ &quot;คลังกลาง&quot; ในระบบ โปรดเพิ่มศูนย์ชื่อนี้ในเมนูนำเข้าข้อมููลก่อน
                  </div>
                )}
              </div>

              {selectedShelterId && (
                <div className="animate-fade-in">
                  <hr className="my-4" />
                  <label className="form-label fw-bold mb-3">รายละเอียดทรัพยากรที่ต้องการ</label>
                  <ResourceRequest 
                    shelterId={selectedShelterId} 
                    shelterName={selectedShelter?.name || ''} 
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
