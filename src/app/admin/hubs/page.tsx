'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';

interface Resource {
  _id: string;
  category: string;
  itemName: string;
  amount: number;
  unit: string;
  status: string;
}

interface Hub {
  _id: string;
  name: string;
  district: string;
  resources: Resource[];
}

export default function HubsOverviewPage() {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [supplies, setSupplies] = useState<{ shelterId: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hubsRes, suppliesRes] = await Promise.all([
          axios.get('/api/hubs'),
          axios.get('/api/supplies')
        ]);
        setHubs(hubsRes.data.data);
        setSupplies(suppliesRes.data.data);
      } catch (err) {
        console.error('Failed to fetch hub data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getHubStockCount = (hubId: string) => {
    return supplies.filter(s => s.shelterId === hubId).length;
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-0 text-primary">🏗️ ศูนย์บริหารจัดการคลังกลาง (Hubs Management)</h3>
          <p className="text-secondary mt-1">รายชื่อและสถานะของคลังสินค้าหลักทั้งหมดในระบบ</p>
        </div>
        <Link href="/admin/centers/create" className="btn btn-primary fw-bold">
          <i className="bi bi-plus-circle me-2"></i>เพิ่มคลังใหม่
        </Link>
      </div>

      <div className="row g-4">
        {hubs.map((hub) => (
          <div key={hub._id} className="col-md-6 col-lg-4">
            <div className="card h-100 border-0 shadow-sm hover-shadow transition-all">
              <div className="card-header bg-white border-bottom p-4">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h5 className="fw-bold mb-1">{hub.name}</h5>
                    <span className="badge bg-light text-primary border border-primary px-3 rounded-pill">
                      📍 อ.{hub.district || 'ไม่ระบุ'}
                    </span>
                  </div>
                  <div className="text-end">
                    <span className="d-block small text-muted">ID: {hub._id.slice(-6)}</span>
                  </div>
                </div>
              </div>
              <div className="card-body p-4">
                <div className="row g-3 mb-4">
                  <div className="col-6">
                    <div className="p-3 bg-primary bg-opacity-10 rounded-3 text-center">
                      <h4 className="fw-bold text-primary mb-0">{getHubStockCount(hub._id)}</h4>
                      <small className="text-secondary">รายการสินค้า</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 bg-warning bg-opacity-10 rounded-3 text-center">
                      <h4 className="fw-bold text-warning mb-0">{hub.resources?.filter(r => r.status === 'Pending').length || 0}</h4>
                      <small className="text-secondary">คำขอรับบริจาค</small>
                    </div>
                  </div>
                </div>

                <div className="border-top pt-3">
                  <h6 className="fw-bold small text-secondary mb-3">คำขอรับบริจาคด่วน (ล่าสุด)</h6>
                  {hub.resources?.filter(r => r.status === 'Pending').slice(0, 2).map((r, idx) => (
                    <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
                      <span className="small fw-bold">{r.itemName}</span>
                      <span className="badge bg-white text-dark border small">{r.amount} {r.unit}</span>
                    </div>
                  ))}
                  {(!hub.resources || hub.resources.filter(r => r.status === 'Pending').length === 0) && (
                    <div className="text-center py-2 text-muted small italic">ไม่มีคำขอค้างอยู่</div>
                  )}
                </div>
              </div>
              <div className="card-footer bg-light border-0 p-3">
                <div className="row g-2">
                  <div className="col-6">
                    <Link href={`/admin/supplies?hub=${hub._id}`} className="btn btn-sm btn-outline-primary w-100">
                      📦 ดูสต็อก
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link href={`/requests/create?hub=${hub._id}`} className="btn btn-sm btn-primary w-100">
                      📢 ขอรับของ
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {hubs.length === 0 && (
          <div className="col-12 text-center py-5">
            <i className="bi bi-inbox fs-1 opacity-25 d-block mb-3"></i>
            <h5 className="text-muted">ไม่พบข้อมูลคลังกลางในระบบ</h5>
            <Link href="/admin/centers/create" className="btn btn-primary mt-3">สร้างคลังกลางแห่งแรก</Link>
          </div>
        )}
      </div>

      <style jsx>{`
        .hover-shadow:hover {
          transform: translateY(-5px);
          box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important;
        }
      `}</style>
    </div>
  );
}
