'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import ResourceRequest from '@/components/ResourceRequest';
import { STANDARD_ITEMS } from '@/constants/standardItems';

interface Hub {
  _id: string;
  name: string;
  location?: string;
}

export default function CreateRequestClient() {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [selectedHubId, setSelectedHubId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<{name: string, category: string, unit: string} | null>(null);

  useEffect(() => {
    const fetchHubs = async () => {
      try {
        const res = await axios.get('/api/hubs');
        setHubs(res.data.data);
      } catch (err) {
        console.error('Failed to fetch hubs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHubs();
  }, []);

  const selectedHub = hubs.find(h => h._id === selectedHubId);

  // Auto-select if only one hub exists
  useEffect(() => {
    if (hubs.length === 1 && !selectedHubId) {
      setSelectedHubId(hubs[0]._id);
    }
  }, [hubs, selectedHubId]);

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
        <div className="col-md-10">
          <div className="card shadow-sm mb-4 border-0">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>📢 เปิดรับบริจาคทรัพยากร (คลังสินค้า)</h4>
                <Link href="/requests" className="btn btn-sm btn-outline-secondary">
                  <i className="bi bi-arrow-left me-1"></i>กลับหน้ารวม
                </Link>
              </div>
              <p className="text-secondary mb-4">เลือกคลังสินค้าและรายการสิ่งของที่ต้องการรับบริจาคเข้าสู่ระบบ</p>
              
              <div className="row g-4">
                {/* 1. Select Hub */}
                <div className="col-md-4">
                  <label className="form-label fw-bold">1. เลือกคลังสินค้า</label>
                  <div className="list-group shadow-sm">
                    {hubs.length === 0 ? (
                      <div className="list-group-item text-center py-4 bg-light">
                        <p className="text-muted mb-2">ยังไม่มีข้อมูลคลังสินค้า</p>
                        <Link href="/admin/centers/create" className="btn btn-primary btn-sm">สร้างคลังใหม่</Link>
                      </div>
                    ) : (
                      hubs.map(h => (
                        <button
                          key={h._id}
                          className={`list-group-item list-group-item-action text-start p-3 ${selectedHubId === h._id ? 'active' : ''}`}
                          onClick={() => setSelectedHubId(h._id)}
                        >
                          <div className="fw-bold">{h.name}</div>
                          <small className={selectedHubId === h._id ? 'text-white-50' : 'text-muted'}>{h.location || 'คลังกลาง'}</small>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. Select Items Gallery */}
                {selectedHubId && (
                  <div className="col-md-8 animate-fade-in">
                    <label className="form-label fw-bold">2. เลือกรายการสิ่งของที่ขาดแคลน</label>
                    <div className="card border-0 bg-light p-3" style={{ height: '500px', overflowY: 'auto' }}>
                      <div className="row g-2">
                        {STANDARD_ITEMS.map((item, idx) => (
                          <div key={idx} className="col-sm-6 col-lg-4">
                            <div 
                              className={`card h-100 border p-2 cursor-pointer shadow-sm hover-scale transition-all ${selectedItem?.name === item.name ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                              onClick={() => setSelectedItem({ name: item.name, category: item.category, unit: item.defaultUnit })}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="small text-muted mb-1" style={{ fontSize: '0.7rem' }}>{item.category}</div>
                              <div className="fw-bold small">{item.name}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Finalize Selection */}
              {selectedHubId && selectedItem && (
                <div className="mt-4 animate-slide-up p-4 border rounded bg-white shadow-sm">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0">📝 รายละเอียดคำขอ: {selectedItem.name}</h5>
                    <button className="btn-close" onClick={() => setSelectedItem(null)}></button>
                  </div>
                  <ResourceRequest 
                    key={selectedItem.name}
                    shelterId={selectedHubId} 
                    shelterName={selectedHub?.name || ''} 
                    initialItem={selectedItem}
                    apiUrl={`/api/hubs/${selectedHubId}/resources`}
                    onSuccess={() => setSelectedItem(null)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-slide-up { animation: slideUp 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .hover-scale:hover { transform: scale(1.02); }
      `}</style>
    </div>
  );
}
