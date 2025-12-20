'use client';
import { useState } from 'react';
import axios from 'axios';

interface ResourceRequestProps {
  shelterId: string;
  shelterName: string;
}

export default function ResourceRequest({ shelterId, shelterName }: ResourceRequestProps) {
  const [formData, setFormData] = useState({
    category: 'Medical',
    itemName: '',
    amount: 1,
    unit: 'แผง',
    urgency: 'medium'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`/api/shelters/${shelterId}/resources`, formData);
      alert('ส่งคำขอสำเร็จ');
      // ล้างค่าฟอร์มหลังจากส่งสำเร็จ
      setFormData({
        category: 'Medical',
        itemName: '',
        amount: 1,
        unit: 'แผง',
        urgency: 'medium'
      });
    } catch (err) {
      console.error('Error sending resource request:', err);
      alert('เกิดข้อผิดพลาดในการส่งคำขอ');
    }
  };

  return (
    <div className="card shadow-sm border-warning">
      <div className="card-header bg-warning text-dark fw-bold">
        🚨 ร้องขอทรัพยากร: {shelterName}
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">ประเภทสิ่งของ</label>
            <select 
              className="form-select" 
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            >
              <option value="Medical">ยา / เวชภัณฑ์</option>
              <option value="Food">อาหาร / น้ำดื่ม</option>
              <option value="Supplies">ของใช้ทั่วไป (มุ้ง, ผ้าห่ม)</option>
              <option value="Others">อื่นๆ</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">ชื่อสิ่งของ (เช่น พาราเซตามอล, นมผง)</label>
            <input 
              type="text" 
              className="form-control" 
              required 
              value={formData.itemName}
              onChange={(e) => setFormData({...formData, itemName: e.target.value})}
            />
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">จำนวน</label>
              <input 
                type="number" 
                className="form-control" 
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: parseInt(e.target.value) || 1})}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">หน่วย</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="กล่อง/โหล/กิโล"
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label d-block">ระดับความด่วน</label>
            <div className="d-flex gap-3">
              {['low', 'medium', 'high'].map((level) => (
                <div key={level} className="form-check">
                  <input 
                    className="form-check-input" 
                    type="radio" 
                    id={`urgency-${level}`}
                    name="urgency" 
                    checked={formData.urgency === level}
                    onChange={() => setFormData({...formData, urgency: level})}
                  />
                  <label 
                    className="form-check-label text-capitalize" 
                    htmlFor={`urgency-${level}`}
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {level === 'low' ? 'ปกติ' : level === 'medium' ? 'ด่วน' : 'ด่วนมาก'}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-warning w-100 fw-bold">ส่งคำขอด่วน</button>
        </form>
      </div>
    </div>
  );
}
