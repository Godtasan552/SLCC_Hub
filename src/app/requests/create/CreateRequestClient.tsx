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

  const selectedShelter = shelters.find(s => s._id === selectedShelterId);

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
                <h4 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>สร้างคำร้องขอทรัพยากร</h4>
                <Link href="/requests" className="btn btn-sm btn-outline-secondary">
                  <i className="bi bi-arrow-left me-1"></i>กลับหน้ารวม
                </Link>
              </div>
              <p className="text-secondary mb-4">เลือกศูนย์พักพิงที่ต้องการส่งคำขอ และกรอกรายละเอียดสิ่งของที่ขาดแคลน</p>
              
              <div className="mb-4">
                <label className="form-label fw-bold">1. เลือกศูนย์พักพิง</label>
                <select 
                  className="form-select form-select-lg"
                  value={selectedShelterId}
                  onChange={(e) => setSelectedShelterId(e.target.value)}
                >
                  <option value="">-- โปรดเลือกศูนย์พักพิง --</option>
                  {shelters.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.district})
                    </option>
                  ))}
                </select>
              </div>

              {selectedShelterId && (
                <div className="animate-fade-in">
                  <hr className="my-4" />
                  <label className="form-label fw-bold mb-3">2. รายละเอียดคำขอ</label>
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
