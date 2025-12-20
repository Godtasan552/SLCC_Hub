'use client'
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';

interface Shelter {
  _id: string;
  name: string;
  district: string;
  capacity: number;
  currentOccupancy: number;
}

interface ShelterData {
  name: string;
  district: string;
  subdistrict?: string;
  capacity?: number;
  phoneNumbers?: string[];
}

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [manualForm, setManualForm] = useState({
    name: '',
    district: '',
    subdistrict: '',
    capacity: 0,
    currentOccupancy: 0
  });

  const fetchShelters = useCallback(async () => {
    try {
      const res = await axios.get('/api/shelters');
      setShelters(res.data.data);
    } catch (err) {
      console.error('Fetch shelters failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchShelters();
  }, [fetchShelters]);

  // 1. Manual Entry Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/shelters', manualForm);
      setMessage(`บันทึกข้อมูลศูนย์ "${manualForm.name}" เรียบร้อยแล้ว`);
      setManualForm({ name: '', district: '', subdistrict: '', capacity: 0, currentOccupancy: 0 });
      fetchShelters();
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

      await axios.patch('/api/shelters', { data: dataToImport });
      setMessage('นำเข้าและอัปเดตข้อมูลไฟล์สำเร็จ');
      fetchShelters();
    } catch (err) {
      setMessage('เกิดข้อผิดพลาดในการประมวลผลไฟล์');
      console.error(err);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  // 3. Check-in / Check-out Logic
  const handleCheckInOut = async (id: string, action: 'in' | 'out') => {
    const label = action === 'in' ? 'พักพิงเพิ่ม' : 'ออกจากศูนย์';
    const val = prompt(`ระบุจำนวนคนที่ต้องการ ${label}:`, "1");
    if (!val || isNaN(parseInt(val))) return;

    try {
      setLoading(true);
      await axios.put(`/api/shelters/${id}`, { action, amount: parseInt(val) });
      fetchShelters();
      setMessage(`ทำรายการ ${label} สำเร็จ`);
    } catch (err) {
      console.error('Check-in/out update failed:', err);
      setMessage('ไม่สามารถอัปเดตข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const filteredShelters = shelters.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.district.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h2 className="fw-bold mb-0 text-center text-md-start" style={{ color: 'var(--text-primary)' }}>🛠️ ระบบจัดการข้อมูล (Admin Hub)</h2>
        {message && (
          <div className={`alert ${message.includes('สำเร็จ') ? 'alert-success' : 'alert-danger'} mb-0 py-2 small fw-bold flex-grow-1 text-center`} style={{ maxWidth: '400px' }}>
            {message}
          </div>
        )}
      </div>

      {/* ส่วนหลัก: การจัดการเข้า-ออก (Check-in/Out Section) */}
      <div className="card shadow-sm border-0 mb-5 overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="card-header bg-success text-white py-3">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-6">
              <h5 className="mb-0 fw-bold"><i className="bi bi-people-fill me-2"></i> จัดการความเคลื่อนไหว (เข้า-ออกศูนย์)</h5>
            </div>
            <div className="col-12 col-md-6">
              <div className="position-relative">
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary"></i>
                <input 
                  type="text" 
                  className="form-control form-control-sm ps-5 border-0 shadow-sm" 
                  placeholder="ค้นหาชื่อศูนย์..."
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive" style={{ maxHeight: '400px' }}>
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light sticky-top">
                <tr className="small text-secondary">
                  <th className="ps-4">ชื่อศูนย์พักพิง</th>
                  <th className="d-none d-md-table-cell">อำเภอ</th>
                  <th className="text-center">จำนวนคนปัจจุบัน</th>
                  <th className="text-end pe-4">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredShelters.map((s) => (
                  <tr key={s._id}>
                    <td className="ps-4">
                      <div className="fw-bold" style={{ color: 'var(--text-primary)' }}>{s.name}</div>
                      <div className="d-md-none small text-secondary">{s.district}</div>
                    </td>
                    <td className="d-none d-md-table-cell" style={{ color: 'var(--text-secondary)' }}>{s.district}</td>
                    <td className="text-center">
                       <span className={`badge ${s.currentOccupancy >= s.capacity ? 'bg-danger' : 'bg-primary'}`}>
                          {s.currentOccupancy} / {s.capacity}
                       </span>
                    </td>
                    <td className="text-end pe-4">
                      <div className="btn-group btn-group-sm w-100 w-md-auto">
                        <button className="btn btn-success" onClick={() => handleCheckInOut(s._id, 'in')}>
                          <i className="bi bi-person-plus-fill me-1"></i> <span className="d-none d-sm-inline">เข้าพัก</span>
                        </button>
                        <button className="btn btn-outline-danger" onClick={() => handleCheckInOut(s._id, 'out')}>
                          <i className="bi bi-person-dash-fill me-1"></i> <span className="d-none d-sm-inline">ออก</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* คีย์ข้อมูลเอง (Manual Entry) */}
        <div className="col-md-6">
          <div className="card shadow-sm border-0 h-100" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            <div className="card-header bg-primary text-white py-3">
              <h5 className="mb-0 fw-bold"><i className="bi bi-plus-circle me-2"></i> ทะเบียนศูนย์ใหม่</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleManualSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-bold">ชื่อศูนย์พักพิง</label>
                  <input type="text" className="form-control" value={manualForm.name} onChange={(e) => setManualForm({...manualForm, name: e.target.value})} required />
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-bold">อำเภอ</label>
                    <input type="text" className="form-control" value={manualForm.district} onChange={(e) => setManualForm({...manualForm, district: e.target.value})} required />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-bold">ความจุสูงสุด</label>
                    <input type="number" className="form-control" value={manualForm.capacity} onChange={(e) => setManualForm({...manualForm, capacity: Number(e.target.value)})} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-100 fw-bold" disabled={loading}>บันทึกข้อมูล</button>
              </form>
            </div>
          </div>
        </div>

        {/* นำเข้าไฟล์ (Import) */}
        <div className="col-md-6">
          <div className="card shadow-sm border-0 h-100" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            <div className="card-header bg-dark text-white py-3">
              <h5 className="mb-0 fw-bold"><i className="bi bi-file-earmark-spreadsheet me-2"></i> นำเข้าผ่าน Excel/JSON</h5>
            </div>
            <div className="card-body text-center p-5">
              <div className="upload-zone p-4" onClick={() => document.getElementById('fileIn')?.click()}>
                <i className="bi bi-cloud-arrow-up text-primary fs-1"></i>
                <h5 className="mt-3">เลือกไฟล์นำเข้าข้อมูล</h5>
                <input type="file" id="fileIn" className="d-none" accept=".json,.xlsx" onChange={handleFileUpload} />
                <button className="btn btn-outline-primary mt-2">Browse File</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .upload-zone {
          border: 2px dashed var(--border-color);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .upload-zone:hover {
          background: rgba(13, 110, 253, 0.05);
          border-color: #0d6efd;
        }
      `}</style>
    </div>
  );
}