import { useState, useMemo } from 'react';
import axios from 'axios';
import { SupplyCategory } from '@/types/supply';
import { getItemsByCategory } from '@/constants/standardItems';

interface ResourceRequestProps {
  shelterId: string;
  shelterName: string;
}

export default function ResourceRequest({ shelterId, shelterName }: ResourceRequestProps) {
  const [formData, setFormData] = useState({
    category: SupplyCategory.MEDICINE as string,
    itemName: '',
    amount: 1,
    unit: '',
    urgency: 'medium'
  });

  const availableItems = useMemo(() => 
    getItemsByCategory(formData.category as SupplyCategory),
    [formData.category]
  );

  const handleCategoryChange = (category: string) => {
    setFormData({
      ...formData,
      category,
      itemName: '',
      unit: ''
    });
  };

  // handleItemChange is no longer needed but we can keep it if we want to auto-fill unit from datalist selection
  // However, simple manual typing is safer as requested.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName) {
      alert('โปรดเลือกชื่อสิ่งของ');
      return;
    }
    try {
      await axios.post(`/api/shelters/${shelterId}/resources`, formData);
      alert('ส่งคำขอสำเร็จ');
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
            <label className="form-label fw-bold">ประเภทสิ่งของ</label>
            <select 
              className="form-select" 
              value={formData.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              {Object.values(SupplyCategory).filter(c => c !== SupplyCategory.ALL).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold">ชื่อสิ่งของ (พิมพ์เองหรือเลือกตามคำแนะนำ)</label>
            <input 
              className="form-control"
              list="resource-items-list"
              value={formData.itemName}
              onChange={(e) => setFormData({...formData, itemName: e.target.value})}
              placeholder="พิมพ์ชื่อสิ่งของ เช่น ข้าวสาร, ยาพารา..."
              required
            />
            <datalist id="resource-items-list">
              {availableItems.map(item => (
                <option key={item.name} value={item.name} />
              ))}
            </datalist>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">จำนวน</label>
              <input 
                type="number" 
                className="form-control" 
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: parseInt(e.target.value) || 1})}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">หน่วย</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                placeholder="เช่น ชื้น, ถุง, กล่อง"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label d-block fw-bold">ระดับความด่วน</label>
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
                    className="form-check-label" 
                    htmlFor={`urgency-${level}`}
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {level === 'low' ? 'ปกติ' : level === 'medium' ? 'ด่วน' : 'ด่วนมาก'}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-warning w-100 fw-bold py-2">
            <i className="bi bi-send-fill me-2"></i>ส่งคำร้องขอ
          </button>
        </form>
      </div>
    </div>
  );
}
