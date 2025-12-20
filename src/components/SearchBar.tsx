'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface SearchBarProps {
  districts: string[];
}

function SearchBarContent({ districts }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState(searchParams?.get('status') || 'ทั้งหมด');
  const [district, setDistrict] = useState(searchParams?.get('district') || 'ทั้งหมด');
  const [q, setQ] = useState(searchParams?.get('q') || '');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (status && status !== 'ทั้งหมด') params.set('status', status);
    if (district && district !== 'ทั้งหมด') params.set('district', district);
    if (q) params.set('q', q);
    params.set('page', '1');
    router.push(`/?${params.toString()}`);
  };

  const handleReset = () => {
    setStatus('ทั้งหมด');
    setDistrict('ทั้งหมด');
    setQ('');
    router.push('/');
  };

  return (
    <div className="p-3 rounded border mb-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
      <div className="d-flex flex-wrap gap-2 align-items-center">
        {/* Capacity Status Filter */}
        <div style={{ flex: '1 1 200px' }}>
          <select 
            className="form-select shadow-sm" 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
            style={{ 
              height: '45px',
              borderRadius: '8px'
            }}
          >
            <option value="ทั้งหมด">📊 สถานะความจุทั้งหมด</option>
            <option value="รองรับได้">✅ รองรับได้</option>
            <option value="ใกล้เต็ม">⚠️ ใกล้เต็ม</option>
            <option value="ล้นศูนย์">🚨 ล้นศูนย์</option>
          </select>
        </div>

        {/* District Filter Dropdown */}
        <div style={{ flex: '1 1 200px' }}>
          <select 
            className="form-select shadow-sm" 
            value={district} 
            onChange={(e) => setDistrict(e.target.value)}
            style={{ 
              height: '45px',
              borderRadius: '8px'
            }}
          >
            <option value="ทั้งหมด">📍 อำเภอทั้งหมด</option>
            {districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Name Search */}
        <div style={{ flex: '2 1 300px' }}>
          <div className="input-group shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
            <span className="input-group-text border-end-0" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="ค้นชื่อศูนย์ หรือ ตำบล..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ 
                height: '45px'
              }}
            />
          </div>
        </div>

        {/* Search & Reset Buttons */}
        <div className="d-flex gap-2">
          <button 
            className="btn btn-primary d-flex align-items-center gap-2 px-3 shadow-sm" 
            onClick={handleSearch}
            style={{ height: '45px', borderRadius: '8px', fontWeight: 'bold' }}
          >
            ค้นหา
          </button>
          <button 
            className="btn btn-outline-secondary d-flex align-items-center justify-content-center shadow-sm" 
            onClick={handleReset}
            style={{ 
              height: '45px', 
              width: '45px',
              borderRadius: '8px',
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-card)'
            }}
            title="ล้างการค้นหา"
          >
            <i className="bi bi-arrow-counterclockwise fs-5"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SearchBar(props: SearchBarProps) {
  return (
    <Suspense fallback={<div>Loading Search...</div>}>
      <SearchBarContent {...props} />
    </Suspense>
  );
}
