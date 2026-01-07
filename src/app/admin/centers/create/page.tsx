'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ExcelJS from 'exceljs';
import { showAlert } from '@/utils/swal-utils';

export default function CreateCenterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'Shelter' as 'Shelter' | 'Hub',
    district: '',
    subdistrict: '',
    capacity: '' as string | number,
    phoneNumbers: [''],
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setUploadProgress(1);
    setMessage('กำลังอ่านไฟล์...');

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let dataToImport: any[] = [];
      const isHub = formData.type === 'Hub';
      
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        setUploadProgress(20);
        const json = JSON.parse(text);
        dataToImport = json.data || json;
        setUploadProgress(40);
      } else if (file.name.endsWith('.xlsx')) {
        const arrayBuffer = await file.arrayBuffer();
        setUploadProgress(15);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        setUploadProgress(30);
        const worksheet = workbook.getWorksheet(1);
        if (worksheet) {
          const totalRows = worksheet.rowCount;
          let processedRows = 0;
          
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { 
              if (isHub) {
                dataToImport.push({
                  name: String(row.getCell(1).value || ''),
                  district: String(row.getCell(2).value || ''),
                  subdistrict: String(row.getCell(3).value || ''),
                  phoneNumbers: row.getCell(4).value ? [String(row.getCell(4).value)] : []
                });
              } else {
                dataToImport.push({
                  name: String(row.getCell(1).value || ''),
                  district: String(row.getCell(2).value || ''),
                  subdistrict: String(row.getCell(3).value || ''),
                  capacity: Math.max(0, Number(row.getCell(4).value) || 0),
                  phoneNumbers: row.getCell(5).value ? [String(row.getCell(5).value)] : []
                });
              }
            }
            processedRows++;
            const parseProgress = 30 + Math.round((processedRows / totalRows) * 10);
            setUploadProgress(parseProgress);
          });
        }
      }
      
      setUploadProgress(40);
      const endpoint = isHub ? '/api/hubs' : '/api/shelters';
      setMessage(`กำลังนำเข้า ${dataToImport.length} รายการ ไปยัง ${isHub ? 'คลังกลาง' : 'ศูนย์พักพิง'}...`);
      
      await axios.patch(endpoint, { data: dataToImport }, {
        onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
                const uploadPercent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                const totalProgress = 40 + Math.round(uploadPercent * 0.5);
                setUploadProgress(totalProgress);
            }
        }
      });
      
      setUploadProgress(100);
      setMessage('นำเข้าสำเร็จ!');
      showAlert.success('สำเร็จ', `นำเข้าข้อมูล ${isHub ? 'คลังกลาง' : 'ศูนย์พักพิง'} เรียบร้อยแล้ว`);
      router.push(isHub ? '/admin/hubs' : '/admin/import');

    } catch (err) {
      showAlert.error('ผิดพลาด', 'ไฟล์ไม่ถูกต้อง หรือเกิดข้อผิดพลาดในการนำเข้า');
      console.error(err);
      setLoading(false);
      setUploadProgress(0);
      setMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cap = Number(formData.capacity);
    if (isNaN(cap) || cap < 0) {
      showAlert.error('ข้อมูลไม่ถูกต้อง', 'ความจุต้องเป็นตัวเลขที่เท่ากับหรือมากกว่า 0');
      return;
    }

    setLoading(true);
    try {
      // Clean up empty phone numbers
      const cleanedData = {
        ...formData,
        capacity: cap,
        phoneNumbers: formData.phoneNumbers.filter(p => p.trim() !== '')
      };

      const endpoint = formData.type === 'Hub' ? '/api/hubs' : '/api/shelters';
      const res = await axios.post(endpoint, cleanedData);
      
      if (res.data.success) {
        showAlert.success('สร้างสำเร็จ', `สร้าง${formData.type === 'Hub' ? 'คลังกลาง' : 'ศูนย์พักพิง'}เรียบร้อยแล้ว`);
        router.push(formData.type === 'Hub' ? '/admin/hubs' : '/admin/import');
      }
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.error : (error as Error).message;
      showAlert.error('เกิดข้อผิดพลาด', message || 'เกิดข้อผิดพลาดในการสร้างศูนย์');
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
    <div className="container-fluid px-4 py-4" style={{ maxWidth: '1400px' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">🏗️ การลงทะเบียนใหม่</h3>
          <p className="text-secondary small mb-0">เลือกวิธีเพิ่มข้อมูลศูนย์พักพิงหรือคลังสินค้าเข้าสู่ระบบ</p>
        </div>
        <Link href="/admin/import" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-2"></i>กลับหน้าจัดการ
        </Link>
      </div>

      <div className="row g-4">
        {/* Left Column: Manual Form */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent py-3 border-bottom">
              <h6 className="mb-0 fw-bold text-primary">
                <i className="bi bi-pencil-square me-2"></i>กรอกข้อมูลด้วยตนเอง
              </h6>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-bold small text-secondary">ประเภทการลงทะเบียน</label>
                    <div className="d-flex gap-2">
                      <div 
                        className={`flex-grow-1 p-3 border rounded cursor-pointer text-center transition-all ${formData.type === 'Hub' ? 'border-primary bg-primary bg-opacity-10 text-primary shadow-sm' : 'border-secondary border-opacity-25 text-secondary'}`}
                        onClick={() => setFormData({ ...formData, type: 'Hub' })}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="bi bi-box-seam fs-4 d-block mb-1"></i>
                        <span className="small fw-bold">คลังกลาง (Hub)</span>
                      </div>
                      <div 
                        className={`flex-grow-1 p-3 border rounded cursor-pointer text-center transition-all ${formData.type === 'Shelter' ? 'border-success bg-success bg-opacity-10 text-success shadow-sm' : 'border-secondary border-opacity-25 text-secondary'}`}
                        onClick={() => setFormData({ ...formData, type: 'Shelter' })}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="bi bi-house-door fs-4 d-block mb-1"></i>
                        <span className="small fw-bold">ศูนย์พักพิง (Shelter)</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-bold small text-secondary">ชื่อศูนย์ / ชื่อคลัง</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="เช่น คลังกลางเชียงใหม่..."
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label fw-bold small text-secondary">อำเภอ</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label fw-bold small text-secondary">ตำบล (ถ้ามี)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.subdistrict}
                      onChange={(e) => setFormData({ ...formData, subdistrict: e.target.value })}
                    />
                  </div>

                  {formData.type === 'Shelter' && (
                    <div className="col-12">
                      <label className="form-label fw-bold small text-secondary">ความจุ (จำนวนคน)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        min="0"
                        placeholder="ระบุความจุ..."
                        value={formData.capacity}
                        onKeyDown={(e) => {
                          if (
                            ['-', '+', 'e', 'E', '.'].includes(e.key) || 
                            (e.key.length === 1 && !/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey)
                          ) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="col-12">
                    <label className="form-label fw-bold small text-secondary d-flex justify-content-between">
                      เบอร์โทรศัพท์ติดต่อ
                      <button type="button" className="btn btn-sm btn-link p-0 text-decoration-none small" onClick={addPhone}>+ เพิ่มเบอร์</button>
                    </label>
                    {formData.phoneNumbers.map((phone, idx) => (
                      <div key={idx} className="input-group mb-2">
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder={`เบอร์ที่ ${idx + 1}`}
                          value={phone}
                          onChange={(e) => handlePhoneChange(idx, e.target.value)}
                        />
                        {formData.phoneNumbers.length > 1 && (
                            <button className="btn btn-outline-danger" type="button" onClick={() => {
                                const newPhones = formData.phoneNumbers.filter((_, i) => i !== idx);
                                setFormData({...formData, phoneNumbers: newPhones});
                            }}><i className="bi bi-x"></i></button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="col-12 mt-3">
                    <button 
                      type="submit" 
                      className={`btn w-100 fw-bold py-2 shadow-sm ${formData.type === 'Hub' ? 'btn-primary' : 'btn-success'}`}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          กำลังบันทึก...
                        </>
                      ) : (
                        <><i className="bi bi-save me-2"></i>บันทึกข้อมูล</>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Bulk Import */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent py-3 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold text-success">
                <i className="bi bi-file-earmark-excel me-2"></i>นำเข้าข้อมูลแบบกลุ่ม
              </h6>
              <span className="badge bg-secondary text-primary border border-primary opacity-75">{formData.type} Only</span>
            </div>
            <div className="card-body p-4 text-center d-flex flex-column justify-content-center">
              <div className="upload-box p-5 rounded-4 border-2 border-dashed mb-4 cursor-pointer transition-all" 
                   onClick={() => !loading && document.getElementById('bulkFileIn')?.click()}>
                {loading && uploadProgress > 0 ? (
                  <div className="py-3">
                    <h5 className="mb-3 text-success fw-bold">🚀 {message || 'กำลังดำเนินการ...'} {uploadProgress}%</h5>
                    <div className="progress rounded-pill shadow-sm mx-auto" style={{ height: '20px', width: '80%', backgroundColor: '#e9ecef' }}>
                      <div 
                        className="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                        role="progressbar" 
                        style={{ width: `${uploadProgress}%`, transition: 'width 0.3s ease-in-out' }} 
                        aria-valuenow={uploadProgress} 
                        aria-valuemin={0} 
                        aria-valuemax={100}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <i className="bi bi-cloud-arrow-up-fill text-success mb-3" style={{ fontSize: '3.5rem', opacity: 0.8 }}></i>
                    <h5 className="fw-bold">ลากไฟล์มาวาง หรือ คลิกเพื่อเลือกไฟล์</h5>
                    <p className="text-secondary small">รองรับ .xlsx และ .json สำหรับ{formData.type === 'Hub' ? 'คลังกลาง' : 'ศูนย์พักพิง'}</p>
                    <button className="btn btn-outline-success btn-sm rounded-pill px-4 mt-2" disabled={loading}>
                      Browse Files
                    </button>
                  </>
                )}
                <input type="file" id="bulkFileIn" className="d-none" accept=".json,.xlsx" onChange={handleFileUpload} disabled={loading} />
              </div>

              <div className="text-start">
                <label className="small fw-bold text-secondary mb-2"><i className="bi bi-info-circle me-1"></i>โครงสร้างไฟล์ Excel (หัวตารางเริ่มบรรทัด 2):</label>
                <div className="table-responsive rounded-3 border">
                  <table className="table table-sm table-bordered mb-0 x-small-text text-nowrap">
                    <thead className="bg-secondary bg-opacity-10">
                      <tr className="text-center">
                        <th className="bg-transparent text-secondary">A (1)</th>
                        <th className="bg-transparent text-secondary">B (2)</th>
                        <th className="bg-transparent text-secondary">C (3)</th>
                        <th className="bg-transparent text-secondary">D (4)</th>
                        {formData.type === 'Shelter' && <th className="bg-transparent text-secondary">E (5)</th>}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-center" style={{ color: 'var(--text-primary)' }}>
                        <td className="bg-transparent">ชื่อ</td>
                        <td className="bg-transparent">อำเภอ</td>
                        <td className="bg-transparent">ตำบล</td>
                        {formData.type === 'Hub' ? (
                          <td className="bg-transparent">เบอร์โทร</td>
                        ) : (
                          <>
                            <td className="bg-transparent">ความจุ</td>
                            <td className="bg-transparent">เบอร์โทร</td>
                          </>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="alert alert-warning border-0 small mt-3 py-2 px-3 mb-0">
                   <i className="bi bi-exclamation-triangle-fill me-2"></i>
                   ระบบจะนำเข้าข้อมูลตาม <strong>ประเภทศูนย์</strong> ที่คุณเลือกไว้ในฝั่งซ้าย
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .upload-box {
          border: 2px dashed var(--border-color);
          background-color: var(--bg-secondary);
        }
        .upload-box:hover {
          border-color: #198754;
          background-color: var(--bg-overlay-hover);
          transform: translateY(-2px);
          box-shadow: 0 .25rem .75rem rgba(0,0,0,.05);
        }
        .cursor-pointer { cursor: pointer; }
        .transition-all { transition: all 0.2s ease-in-out; }
        .x-small-text { font-size: 0.75rem; }
      `}</style>
    </div>
  );
}
