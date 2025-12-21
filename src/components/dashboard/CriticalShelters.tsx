'use client';
import { Shelter } from "@/types/shelter";

interface CriticalSheltersProps {
  shelters: Shelter[];
}

export default function CriticalShelters({ shelters }: CriticalSheltersProps) {
  const criticalList = shelters.filter(s => s.capacityStatus === 'ล้นศูนย์');

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '-';
    return phone.split('/')[0].trim();
  };

  return (
    <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px' }}>
      <div className="card-header bg-transparent border-0 pt-4 pb-2 px-4 d-flex align-items-center justify-content-between">
         <div className="d-flex align-items-center gap-3">
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#dc3545',
              borderRadius: '50%',
              boxShadow: '0 0 0 4px rgba(220, 53, 69, 0.2)'
            }}></div>
            <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>
              ศูนย์ที่ต้องช่วยเหลือด่วน ({criticalList.length})
            </h5>
         </div>
      </div>

      <div className="card-body px-2 pt-0 pb-3">
        <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '0 10px' }} className="custom-scrollbar">
            {criticalList.length === 0 ? (
                <div className="text-center py-5">
                    <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
                    <p className="text-secondary mt-3">ไม่มีศูนย์วิกฤตในขณะนี้</p>
                </div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {criticalList.map((s) => {
                        const occupancyRate = (s.currentOccupancy / (s.capacity || 1)) * 100;
                        return (
                            <div key={s._id} className="p-3 border rounded-3 bg-body-tertiary position-relative overflow-hidden" 
                                 style={{ borderLeft: '4px solid #dc3545 !important' }}>
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div>
                                        <h6 className="fw-bold mb-1 text-truncate" style={{ maxWidth: '200px', color: 'var(--text-primary)' }}>{s.name}</h6>
                                        <div className="text-secondary small">
                                            <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                                            {s.district} {s.subdistrict ? `(${s.subdistrict})` : ''}
                                        </div>
                                    </div>
                                    <span className="badge bg-danger rounded-pill">
                                        ล้น {occupancyRate.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="d-flex align-items-center justify-content-between mt-3 pt-2 border-top border-secondary border-opacity-10">
                                   <div className="small fw-semibold text-danger">
                                     <i className="bi bi-people-fill me-1"></i>
                                     {s.currentOccupancy} / {s.capacity} คน
                                   </div>
                                   {s.phoneNumbers?.[0] && (
                                     <a href={`tel:${formatPhoneNumber(s.phoneNumbers[0])}`} className="btn btn-sm btn-outline-danger py-0 px-3 rounded-pill" style={{ fontSize: '0.8rem' }}>
                                        <i className="bi bi-telephone-fill me-1"></i> โทรติดต่อ
                                     </a>
                                   )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
