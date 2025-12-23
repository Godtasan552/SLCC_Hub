'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateCenterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Shelter',
    district: '',
    subdistrict: '',
    capacity: 0,
    phoneNumbers: [''],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Clean up empty phone numbers
      const cleanedData = {
        ...formData,
        phoneNumbers: formData.phoneNumbers.filter(p => p.trim() !== '')
      };

      const endpoint = formData.type === 'Hub' ? '/api/hubs' : '/api/shelters';
      const res = await axios.post(endpoint, cleanedData);
      
      if (res.data.success) {
        alert(`สร้าง${formData.type === 'Hub' ? 'คลังกลาง' : 'ศูนย์พักพิง'}เรียบร้อยแล้ว`);
        router.push(formData.type === 'Hub' ? '/admin/hubs' : '/admin/import');
      }
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.error : (error as Error).message;
      alert(message || 'เกิดข้อผิดพลาดในการสร้างศูนย์');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...formData.phoneNumbers];
    newPhones[index] = value;
    setFormData({ ...formData, phoneNumbers: newPhones });
  };

  const addPhone = () => {
    setFormData({ ...formData, phoneNumbers: [...formData.phoneNumbers, ''] });
  };

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold mb-0">🏗️ เพิ่มศูนย์ / คลังสินค้าใหม่</h3>
                <Link href="/admin/import" className="btn btn-outline-secondary btn-sm">
                  กลับหน้าจัดการ
                </Link>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-bold">ประเภทศูนย์</label>
                    <div className="d-flex gap-3">
                      <div 
                        className={`flex-grow-1 p-3 border rounded cursor-pointer text-center ${formData.type === 'Hub' ? 'border-primary bg-primary bg-opacity-10 text-primary' : ''}`}
                        onClick={() => setFormData({ ...formData, type: 'Hub' })}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="bi bi-box-seam fs-3 d-block mb-1"></i>
                        <strong>คลังกลาง (Hub)</strong>
                        <small className="d-block text-muted">สำหรับเก็บและกระจายของ</small>
                      </div>
                      <div 
                        className={`flex-grow-1 p-3 border rounded cursor-pointer text-center ${formData.type === 'Shelter' ? 'border-success bg-success bg-opacity-10 text-success' : ''}`}
                        onClick={() => setFormData({ ...formData, type: 'Shelter' })}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="bi bi-house-door fs-3 d-block mb-1"></i>
                        <strong>ศูนย์พักพิง (Shelter)</strong>
                        <small className="d-block text-muted">สำหรับรองรับผู้ประสบภัย</small>
                      </div>
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-bold">ชื่อศูนย์ / ชื่อคลัง (ต้องไม่ซ้ำ)</label>
                    <input 
                      type="text" 
                      className="form-control form-control-lg" 
                      placeholder="เช่น คลังกลางเชียงใหม่ หรือ ศูนย์พักพิงวัดศรีบุญเรือง"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label fw-bold">อำเภอ</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label fw-bold">ตำบล (ถ้ามี)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.subdistrict}
                      onChange={(e) => setFormData({ ...formData, subdistrict: e.target.value })}
                    />
                  </div>

                  {formData.type === 'Shelter' && (
                    <div className="col-12">
                      <label className="form-label fw-bold">ความจุ (จำนวนคน)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  )}

                  <div className="col-12">
                    <label className="form-label fw-bold d-flex justify-content-between">
                      เบอร์โทรศัพท์ติดต่อ
                      <button type="button" className="btn btn-sm btn-link p-0 text-decoration-none" onClick={addPhone}>+ เพิ่มเบอร์</button>
                    </label>
                    {formData.phoneNumbers.map((phone, idx) => (
                      <input 
                        key={idx}
                        type="text" 
                        className="form-control mb-2" 
                        placeholder={`เบอร์ที่ ${idx + 1}`}
                        value={phone}
                        onChange={(e) => handlePhoneChange(idx, e.target.value)}
                      />
                    ))}
                  </div>

                  <div className="col-12 mt-4">
                    <button 
                      type="submit" 
                      className={`btn btn-lg w-100 fw-bold ${formData.type === 'Hub' ? 'btn-primary' : 'btn-success'}`}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          กำลังบันทึก...
                        </>
                      ) : (
                        `ยืนยันสร้าง ${formData.type === 'Hub' ? 'คลังกลาง' : 'ศูนย์พักพิง'}`
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
