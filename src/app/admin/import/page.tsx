'use client'
import { useState } from 'react';
import axios from 'axios';

export default function ImportPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // ฟังก์ชันสำหรับอ่านไฟล์ JSON แล้วส่งไป API
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await axios.patch('/api/shelters', { data: json.data });
        setMessage(`สำเร็จ! นำเข้าใหม่ ${res.data.imported} ศูนย์, อัปเดต ${res.data.updated} ศูนย์`);
      } catch (err) {
        setMessage('เกิดข้อผิดพลาดในการอ่านไฟล์');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4" style={{ color: 'var(--text-primary)' }}>จัดการข้อมูลศูนย์พักพิง</h2>

      <div className="row g-4">
        {/* ส่วนที่ 1: คีย์ข้อมูลเอง (Manual) */}
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white">คีย์ข้อมูลศูนย์ใหม่</div>
            <div className="card-body">
              <form onSubmit={(e) => { e.preventDefault(); /* เพิ่ม logic POST ที่นี่ */ }}>
                <div className="mb-3">
                  <label className="form-label">ชื่อศูนย์พักพิง</label>
                  <input type="text" className="form-control" placeholder="เช่น โรงเรียนบ้าน..." required />
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">อำเภอ</label>
                    <input type="text" className="form-control" />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">ความจุ (คน)</label>
                    <input type="number" className="form-control" />
                  </div>
                </div>
                <button type="submit" className="btn btn-success w-100">บันทึกข้อมูล</button>
              </form>
            </div>
          </div>
        </div>

        {/* ส่วนที่ 2: นำเข้าไฟล์มหาศาล (Bulk Import) */}
        <div className="col-md-6">
          <div className="card shadow-sm border-primary">
            <div className="card-header bg-info text-dark">นำเข้าข้อมูลมหาศาล (JSON/Excel)</div>
            <div className="card-body text-center py-5">
              <p style={{ color: 'var(--text-secondary)' }}>อัปโหลดไฟล์ </p>
              <input 
                type="file" 
                id="fileImport" 
                className="d-none" 
                accept=".json" 
                onChange={handleFileUpload} 
              />
              <label htmlFor="fileImport" className={`btn btn-outline-primary btn-lg ${loading ? 'disabled' : ''}`}>
                {loading ? 'กำลังประมวลผล...' : 'เลือกไฟล์ JSON'}
              </label>
              {message && <div className="alert alert-info mt-3">{message}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}