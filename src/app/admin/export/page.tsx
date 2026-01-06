'use client'
import { useState } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { Supply } from '@/types/supply';
import { Shelter } from '@/types/shelter';

export default function ExportPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const showToast = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const exportSupplies = async (format: 'excel' | 'json') => {
    setLoading(true);
    try {
      const res = await axios.get('/api/supplies');
      const allData: Supply[] = res.data.data;

      // Separate Stock from Disbursements
      const stockItems = allData.filter(item => 
        !item.description?.toLowerCase().includes('disbursement') && 
        !item.description?.includes('เบิกจ่าย')
      );
      const disbursementItems = allData.filter(item => 
        item.description?.toLowerCase().includes('disbursement') || 
        item.description?.includes('เบิกจ่าย')
      );

      if (format === 'json') {
        const payload = {
          inventory: stockItems,
          disbursements: disbursementItems
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `supplies_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      } else {
        const workbook = new ExcelJS.Workbook();
        
        // Sheet 1: Active Stock
        const stockSheet = workbook.addWorksheet('สต็อกคงเหลือ (Stock)');
        stockSheet.columns = [
          { header: 'ชื่อสิ่งของ', key: 'name', width: 25 },
          { header: 'หมวดหมู่', key: 'category', width: 20 },
          { header: 'จำนวน', key: 'quantity', width: 10 },
          { header: 'หน่วย', key: 'unit', width: 10 },
          { header: 'รายละเอียด', key: 'description', width: 30 },
          { header: 'ชื่อคลัง/ศูนย์', key: 'shelterName', width: 25 },
          { header: 'ผู้บริจาค', key: 'supplier', width: 20 }
        ];
        stockItems.forEach(item => stockSheet.addRow(item));

        // Sheet 2: Disbursement History
        const disburseSheet = workbook.addWorksheet('ประวัติการเบิกจ่าย (Disbursements)');
        disburseSheet.columns = [
          { header: 'ชื่อสิ่งของ', key: 'name', width: 25 },
          { header: 'หมวดหมู่', key: 'category', width: 20 },
          { header: 'จำนวนที่ส่ง', key: 'quantity', width: 12 },
          { header: 'หน่วย', key: 'unit', width: 10 },
          { header: 'รายละเอียดการส่ง', key: 'description', width: 35 },
          { header: 'ส่งไปที่ศูนย์', key: 'shelterName', width: 25 }
        ];
        disbursementItems.forEach(item => disburseSheet.addRow(item));

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `supplies_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
      }
      showToast('ส่งออกข้อมูลพัสดุสำเร็จ (แยกสต็อกและเบิกจ่าย)');
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const exportShelters = async (format: 'excel' | 'json') => {
    setLoading(true);
    try {
      const [shelterRes, hubRes] = await Promise.all([
        axios.get('/api/shelters'),
        axios.get('/api/hubs')
      ]);
      
      const shelters: Shelter[] = shelterRes.data.data;
      const hubs: Shelter[] = hubRes.data.data;

      if (format === 'json') {
        const payload = { hubs, shelters };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `centers_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      } else {
        const workbook = new ExcelJS.Workbook();
        
        // Helper to add sheet
        const addCenterSheet = (name: string, data: Shelter[]) => {
          const sheet = workbook.addWorksheet(name);
          sheet.columns = [
            { header: 'ชื่อสถานที่', key: 'name', width: 25 },
            { header: 'อำเภอ', key: 'district', width: 20 },
            { header: 'ตำบล', key: 'subdistrict', width: 20 },
            { header: 'ความจุ (คน)', key: 'capacity', width: 12 },
            { header: 'จำนวนพักจริง (คน)', key: 'currentOccupancy', width: 15 },
            { header: 'อัตราการเข้าพัก', key: 'rate', width: 15 },
            { header: 'เบอร์โทรศัพท์', key: 'phoneNumbers', width: 30 }
          ];

          data.forEach(item => {
            const currentOcc = item.currentOccupancy ?? 0;
            const cap = item.capacity ?? 0;
            const rate = cap > 0 ? ((currentOcc / cap) * 100).toFixed(1) + '%' : '0%';
            sheet.addRow({
              name: item.name,
              district: item.district,
              subdistrict: item.subdistrict,
              capacity: cap,
              currentOccupancy: currentOcc,
              rate: rate,
              phoneNumbers: item.phoneNumbers?.join(', ') || ''
            });
          });
        };

        addCenterSheet('คลังกลาง (Central Hubs)', hubs);
        addCenterSheet('ศูนย์พักพิง (Shelters)', shelters);

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `centers_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
      }
      showToast('ส่งออกข้อมูลสำเร็จ (แยกคลังกลางและศูนย์พักพิง)');
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid px-4 py-4" style={{ maxWidth: '1200px', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <div className="mb-4">
        <div className="d-flex align-items-center mb-2">
            <span className="badge bg-primary rounded-circle p-2 me-2">
                <i className="bi bi-cloud-download fs-5 text-white"></i>
            </span>
            <h4 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>ส่งออกข้อมูล (Export Data)</h4>
        </div>
        <p className="text-secondary small mb-0 ps-1">เลือกประเภทข้อมูลที่ต้องการส่งออกเพื่อไปใช้งานต่อ หรือสำรองข้อมูล</p>
      </div>

       {message && (
         <div className="position-fixed top-0 start-50 translate-middle-x mt-4" style={{ zIndex: 1050 }}>
            <div className={`alert ${message.includes('ปกติ') ? 'alert-danger' : 'alert-success'} shadow-lg d-flex align-items-center py-2 px-4 rounded-pill border-0`}>
             <i className={`bi ${message.includes('ปกติ') ? 'bi-x-circle-fill' : 'bi-check-circle-fill'} me-2 fs-5`}></i>
             <span className="fw-bold">{message}</span>
           </div>
         </div>
      )}

      <div className="row g-4 animate-fade-in">
        <div className="col-md-6">
            <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div className="card-body p-4 text-center">
                    <div className="mb-4">
                        <i className="bi bi-box-seam text-primary" style={{ fontSize: '3.5rem' }}></i>
                    </div>
                    <h5 className="fw-bold mb-2">ข้อมูลพัสดุและสิ่งของ</h5>
                    <p className="text-secondary small mb-4">ส่งออกรายการสิ่งของคงคลังทั้งหมดจากคลังกลางและศูนย์พักพิง</p>
                    <div className="d-flex flex-column gap-2">
                        <button 
                            className="btn btn-primary d-flex align-items-center justify-content-center py-2 fw-bold" 
                            onClick={() => exportSupplies('excel')}
                            disabled={loading}
                        >
                            <i className="bi bi-file-earmark-excel me-2"></i>Export to Excel (.xlsx)
                        </button>
                        <button 
                            className="btn btn-outline-primary d-flex align-items-center justify-content-center py-2 fw-bold" 
                            onClick={() => exportSupplies('json')}
                            disabled={loading}
                        >
                            <i className="bi bi-filetype-json me-2"></i>Export to JSON (.json)
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="col-md-6">
            <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div className="card-body p-4 text-center">
                    <div className="mb-4">
                        <i className="bi bi-building-fill text-success" style={{ fontSize: '3.5rem' }}></i>
                    </div>
                    <h5 className="fw-bold mb-2">ข้อมูลศูนย์พักพิงและคลังกลาง</h5>
                    <p className="text-secondary small mb-4">ส่งออกรายชื่อศูนย์พักพิง อำเภอ ตำบล ความจุ และเบอร์ติดต่อ</p>
                    <div className="d-flex flex-column gap-2">
                        <button 
                            className="btn btn-success d-flex align-items-center justify-content-center py-2 fw-bold text-white" 
                            onClick={() => exportShelters('excel')}
                            disabled={loading}
                        >
                            <i className="bi bi-file-earmark-excel me-2"></i>Export to Excel (.xlsx)
                        </button>
                        <button 
                            className="btn btn-outline-success d-flex align-items-center justify-content-center py-2 fw-bold" 
                            onClick={() => exportShelters('json')}
                            disabled={loading}
                        >
                            <i className="bi bi-filetype-json me-2"></i>Export to JSON (.json)
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>

       <div className="mt-5 p-4 rounded-4 bg-secondary border text-center">
            <i className="bi bi-info-circle text-primary fs-4 mb-2 d-block"></i>
            <h6 className="fw-bold">ข้อมูลที่คุณดาวน์โหลดไป สามารถนำไปแก้ไขและ Upload กลับเข้าระบบได้ทันที</h6>
            <p className="text-secondary small mb-0">ระบบรองรับการอัปเดตข้อมูลเดิมตามชื่อรายการ (Name) และการเพิ่มข้อมูลใหม่โดยอัตโนมัติ</p>
       </div>

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
