'use client'
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface Shelter {
  _id: string;
  name: string;
  district: string;
  subdistrict?: string;
  capacity: number;
  currentOccupancy: number;
  capacityStatus?: string;
}

export default function Dashboard() {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const refetchShelters = useCallback(async () => {
    const res = await axios.get('/api/shelters');
    setShelters(res.data.data);
  }, []);

  useEffect(() => {
    // Initial data fetch on component mount - this is a legitimate use case
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetchShelters();
  }, [refetchShelters]);

  const handleUpdateOccupancy = async (id: string, current: number) => {
    const newValue = prompt("ระบุจำนวนผู้อพยพปัจจุบัน:", current.toString());
    if (newValue !== null) {
      await axios.put(`/api/shelters/${id}`, { currentOccupancy: parseInt(newValue) });
      refetchShelters(); // รีโหลดข้อมูล
    }
  };

  const filteredShelters = shelters.filter(s => 
    s.name.includes(searchTerm) || s.district.includes(searchTerm)
  );

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 style={{ color: 'var(--text-primary)' }}>สถานะความหนาแน่นศูนย์พักพิง</h2>
        <input 
          type="text" 
          className="form-control w-25" 
          placeholder="ค้นหาชื่อศูนย์/อำเภอ..." 
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            backgroundColor: 'var(--bg-card)', 
            color: 'var(--text-primary)',
            borderColor: 'var(--border-color)'
          }}
        />
      </div>

      <div className="row">
        {filteredShelters.map((shelter) => {
          const percent = (shelter.currentOccupancy / (shelter.capacity || 1)) * 100;
          let progressColor = "bg-success";
          if (percent >= 100) progressColor = "bg-danger";
          else if (percent >= 80) progressColor = "bg-warning";

          return (
            <div className="col-md-4 mb-3" key={shelter._id}>
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title text-truncate" style={{ color: 'var(--text-primary)' }}>{shelter.name}</h5>
                  <p className="mb-2 small" style={{ color: 'var(--text-secondary)' }}>{shelter.district} - {shelter.subdistrict}</p>
                  
                  <div className="d-flex justify-content-between mb-1 small" style={{ color: 'var(--text-primary)' }}>
                    <span>ความหนาแน่น: {percent.toFixed(0)}%</span>
                    <span>{shelter.currentOccupancy} / {shelter.capacity} คน</span>
                  </div>
                  <div className="progress mb-3" style={{ height: '10px' }}>
                    <div 
                      className={`progress-bar ${progressColor}`} 
                      role="progressbar" 
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    ></div>
                  </div>

                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-sm btn-outline-primary flex-grow-1"
                      onClick={() => handleUpdateOccupancy(shelter._id, shelter.currentOccupancy)}
                    >
                      อัปเดตจำนวนคน
                    </button>
                    <button className="btn btn-sm btn-info">รายละเอียด</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
