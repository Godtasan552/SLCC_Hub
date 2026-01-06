import { useState, useMemo } from 'react';
import axios from 'axios';
import { SupplyCategory } from '@/types/supply';
import { getItemsByCategory } from '@/constants/standardItems';
import { showAlert } from '@/utils/swal-utils';

interface ResourceRequestProps {
  shelterId: string;
  shelterName: string;
  initialItem?: { name: string; category: string; unit: string };
  apiUrl?: string;
  onSuccess?: () => void;
}

export default function ResourceRequest({ 
  shelterId, 
  shelterName, 
  initialItem, 
  apiUrl,
  onSuccess 
}: ResourceRequestProps) {
  const [formData, setFormData] = useState<{
    category: string;
    itemName: string;
    amount: number | string;
    unit: string;
    urgency: string;
  }>({
    category: initialItem?.category || SupplyCategory.MEDICINE,
    itemName: initialItem?.name || '',
    amount: '',
    unit: initialItem?.unit || '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName) {
      showAlert.error('ข้อมูลไม่ครบ', 'โปรดเลือกชื่อสิ่งของ');
      return;
    }

    const amountNum = parseInt(String(formData.amount));
    if (isNaN(amountNum) || amountNum <= 0) {
      showAlert.error('ข้อมูลไม่ถูกต้อง', 'กรุณาระบุจำนวนที่มากกว่า 0');
      return;
    }

    try {
      const url = apiUrl || `/api/shelters/${shelterId}/resources`;
      await axios.post(url, { ...formData, amount: amountNum });
      showAlert.success('สำเร็จ', 'ส่งคำขอสำเร็จ');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error sending resource request:', err);
      showAlert.error('ผิดพลาด', 'เกิดข้อผิดพลาดในการส่งคำขอ');
    }
  };

  return (
    <div className="card shadow-sm border-0 bg-card">
      <div className="card-body p-0">
        <div className="alert alert-info py-2 small mb-3">
          <i className="bi bi-info-circle me-2"></i>สร้างคำขอสำหรับ: <strong>{shelterName}</strong>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-bold small">หมวดหมู่</label>
              <select 
                className="form-select" 
                value={formData.category}
                disabled={!!initialItem}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                {Object.values(SupplyCategory).filter(c => c !== SupplyCategory.ALL).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-bold small">ชื่อสิ่งของ</label>
              <input 
                className="form-control"
                list="resource-items-list"
                value={formData.itemName}
                disabled={!!initialItem}
                onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                placeholder="ชื่อสิ่งของ..."
                required
              />
              <datalist id="resource-items-list">
                {availableItems.map(item => (
                  <option key={item.name} value={item.name} />
                ))}
              </datalist>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-bold small">จำนวน</label>
              <input 
                type="number" 
                className="form-control" 
                placeholder="ระบุจำนวน"
                value={formData.amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setFormData({...formData, amount: ''});
                  } else {
                    const num = parseInt(val);
                    if (!isNaN(num)) {
                      setFormData({...formData, amount: Math.max(0, num)});
                    }
                  }
                }}
              />
            </div>
            
            <div className="col-md-4">
              <label className="form-label fw-bold small">หน่วย</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                placeholder="ชิ้น, แพ็ค..."
              />
            </div>

            <div className="col-md-4">
              <label className="form-label fw-bold small mb-2 d-block">ระดับความด่วน</label>
              <div className="d-flex gap-2 justify-content-between pt-1">
                {['low', 'medium', 'high'].map((level) => (
                  <div key={level} className="form-check form-check-inline m-0">
                    <input 
                      className="form-check-input" 
                      type="radio" 
                      id={`urgency-${level}`}
                      name="urgency" 
                      checked={formData.urgency === level}
                      onChange={() => setFormData({...formData, urgency: level})}
                    />
                    <label className="form-check-label small" htmlFor={`urgency-${level}`}>
                      {level === 'low' ? 'ปกติ' : level === 'medium' ? 'ด่วน' : 'ด่วนมาก'}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-12 mt-4">
              <button type="submit" className="btn btn-warning w-100 fw-bold py-2 shadow-sm">
                <i className="bi bi-send-fill me-2"></i>ส่งคำร้องขอรับบริจาคล่วงหน้า
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
