'use client'
import { useState } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';

interface ShelterData {
  name: string;
  district: string;
  subdistrict?: string;
  capacity?: number;
  phoneNumbers?: string[];
}

export default function ImportPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [manualForm, setManualForm] = useState({
    name: '',
    district: '',
    subdistrict: '',
    capacity: 0,
    currentOccupancy: 0
  });

  // 1. Manual Entry Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/shelters', manualForm);
      setMessage(`บันทึกข้อมูลศูนย์ "${manualForm.name}" เรียบร้อยแล้ว`);
      setManualForm({ name: '', district: '', subdistrict: '', capacity: 0, currentOccupancy: 0 });
    } catch (err) {
      const errorMessage = axios.isAxiosError(err) ? err.response?.data?.error : (err as Error).message;
      setMessage(`เกิดข้อผิดพลาด: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // 2. JSON & Excel Bulk Import
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage('กำลังประมวลผลไฟล์...');

    try {
      let dataToImport: ShelterData[] = [];

      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const json = JSON.parse(text);
        dataToImport = json.data || json;
      } 
      else if (file.name.endsWith('.xlsx')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.getWorksheet(1);
        
        if (worksheet) {
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Skip header
              dataToImport.push({
                name: String(row.getCell(1).value || ''),
                district: String(row.getCell(2).value || ''),
                subdistrict: String(row.getCell(3).value || ''),
                capacity: Number(row.getCell(4).value) || 0,
                phoneNumbers: row.getCell(5).value ? [String(row.getCell(5).value)] : []
              });
            }
          });
        }
      }

      const res = await axios.patch('/api/shelters', { data: dataToImport });
      setMessage(`นำเข้าสำเร็จ! เพิ่มใหม่ ${res.data.imported} ศูนย์, อัปเดต ${res.data.updated} ศูนย์`);
    } catch (err) {
      setMessage('เกิดข้อผิดพลาดในการประมวลผลไฟล์ กรุณาตรวจสอบรูปแบบข้อมูล');
      console.error(err);
    } finally {
      setLoading(false);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 style={{ color: 'var(--text-primary)' }}>🛠️ ระบบจัดการและนำเข้าข้อมูล</h2>
        {message && (
          <div className={`alert ${message.includes('สำเร็จ') ? 'alert-success' : 'alert-info'} mb-0 py-2`}>
            {message}
          </div>
        )}
      </div>

      <div className="row g-4">
        {/* ส่วนที่ 1: คีย์ข้อมูลเอง (Manual Entry) */}
        <div className="col-md-5">
          <div className="card shadow-sm border-0 h-100" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            <div className="card-header bg-primary text-white border-0 py-3">
              <h5 className="mb-0"><i className="bi bi-pencil-square me-2"></i> เพิ่มศูนย์ใหม่แบบ Manual</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleManualSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-bold">ชื่อศูนย์พักพิง</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={manualForm.name}
                    onChange={(e) => setManualForm({...manualForm, name: e.target.value})}
                    placeholder="เช่น โรงเรียนบ้านพัฒนา..." 
                    required 
                  />
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-bold">อำเภอ</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={manualForm.district}
                      onChange={(e) => setManualForm({...manualForm, district: e.target.value})}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-bold">ตำบล</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={manualForm.subdistrict}
                      onChange={(e) => setManualForm({...manualForm, subdistrict: e.target.value})}
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-bold">ความจุ (คน)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={manualForm.capacity}
                      onChange={(e) => setManualForm({...manualForm, capacity: Number(e.target.value)})}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-bold">จำนวนปัจจุบัน</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={manualForm.currentOccupancy}
                      onChange={(e) => setManualForm({...manualForm, currentOccupancy: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-100 py-2 mt-2" disabled={loading}>
                  {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลศูนย์พักพิง'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ส่วนที่ 2: นำเข้าไฟล์ (Bulk Import) */}
        <div className="col-md-7">
          <div className="card shadow-sm border-0 h-100" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            <div className="card-header bg-dark text-white border-0 py-3 d-flex justify-content-between">
              <h5 className="mb-0"><i className="bi bi-cloud-upload me-2"></i> นำเข้าข้อมูลจำนวนมาก</h5>
              <span className="badge bg-secondary">JSON / Excel</span>
            </div>
            <div className="card-body d-flex flex-column justify-content-center p-5">
              <div 
                className="upload-zone text-center p-5 mb-3" 
                style={{ 
                  border: '2px dashed var(--border-color)', 
                  borderRadius: '15px',
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  transition: 'all 0.3s'
                }}
              >
                <i className="bi bi-file-earmark-arrow-up text-primary" style={{ fontSize: '4rem' }}></i>
                <h4 className="mt-3">เลือกไฟล์เพื่อนำเข้าข้อมูล</h4>
                <p className="text-secondary small">รองรับไฟล์ .json และ .xlsx จากระบบสำรองข้อมูล</p>
                <input 
                  type="file" 
                  id="fileImport" 
                  className="d-none" 
                  accept=".json,.xlsx" 
                  onChange={handleFileUpload} 
                />
                <label htmlFor="fileImport" className={`btn btn-primary btn-lg px-5 ${loading ? 'disabled' : ''}`}>
                  {loading ? 'กำลังประมวลผล...' : 'คลิกเพื่อเลือกไฟล์'}
                </label>
              </div>
              
              <div className="alert alert-warning small mb-0">
                <i className="bi bi-info-circle me-2"></i>
                <strong>คำแนะนำ:</strong> การนำเข้าจะใช้ <strong>ชื่อศูนย์</strong> และ <strong>อำเภอ</strong> เป็นตัวตรวจสอบ 
                หากข้อมูลตรงกันระบบจะทำการอัปเดตข้อมูลล่าสุดให้โดยอัตโนมัติ (Upsert)
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .upload-zone:hover {
          border-color: #0d6efd !important;
          background-color: rgba(13, 110, 253, 0.05) !important;
        }
      `}</style>
    </div>
  );
}