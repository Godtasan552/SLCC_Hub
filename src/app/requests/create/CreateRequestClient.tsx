'use client';
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Supply } from '@/types/supply';
import { showAlert } from '@/utils/swal-utils';
import { STANDARD_ITEMS, StandardItem } from '@/constants/standardItems';

interface Location {
  _id: string;
  name: string;
  district?: string;
  type?: string;
}

interface CartItem {
  name: string;
  category: string;
  defaultUnit: string;
  icon: string;
  requestQuantity: number | string;
  sourceHubId?: string;
  sourceHubName?: string;
  totalStockAvailable?: number;
}

export default function CreateRequestClient() {
  const [step, setStep] = useState(1);
  const [hubs, setHubs] = useState<Location[]>([]);
  const [shelters, setShelters] = useState<Location[]>([]);
  const [allSupplies, setAllSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection States
  const [selectedHubId, setSelectedHubId] = useState<string>('');
  const [selectedShelterId, setSelectedShelterId] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ทั้งหมด');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 18;
  
  // Shelter Filter States
  const [shelterSearch, setShelterSearch] = useState('');
  const [shelterDistrict, setShelterDistrict] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hubsRes, sheltersRes, suppliesRes] = await Promise.all([
          axios.get('/api/hubs'),
          axios.get('/api/shelters'),
          axios.get('/api/supplies')
        ]);
        setHubs(hubsRes.data.data);
        setShelters(sheltersRes.data.data);
        setAllSupplies(suppliesRes.data.data);
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Transform allSupplies into unique catalog items (NO GROUPING)
  const catalogItems = useMemo(() => {
    return allSupplies
      .filter(s => s.quantity > 0 && s.shelterId && hubs.some(h => h._id === s.shelterId))
      .map(s => {
        const standard = STANDARD_ITEMS.find(si => si.name === s.name);
        const hub = hubs.find(h => h._id === s.shelterId);
        return {
          _id: s._id, // Keep unique ID
          name: s.name,
          category: s.category || 'อื่นๆ',
          defaultUnit: s.unit || 'ชิ้น',
          icon: standard?.icon || 'bi-box-seam',
          totalStock: s.quantity,
          sourceHubId: s.shelterId,
          sourceHubName: hub?.name || 'ไม่ระบุคลัง'
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allSupplies, hubs]);

  // Filter based on category and search
  const filteredCatalog = useMemo(() => {
    const filtered = catalogItems.filter(item => {
      const matchCat = activeCategory === 'ทั้งหมด' || item.category === activeCategory;
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
    return filtered;
  }, [activeCategory, searchTerm, catalogItems]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCatalog.length / itemsPerPage);
  const paginatedCatalog = useMemo(() => {
    return filteredCatalog.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredCatalog, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchTerm]);

  const categories = useMemo(() => {
    return ['ทั้งหมด', ...new Set(catalogItems.map(s => s.category))];
  }, [catalogItems]);

  // Filtered Shelters Logic
  const uniqueDistricts = useMemo(() => {
    return Array.from(new Set(shelters.map(s => s.district).filter(Boolean))) as string[];
  }, [shelters]);

  const filteredShelters = useMemo(() => {
    return shelters.filter(s => {
        const matchName = s.name.toLowerCase().includes(shelterSearch.toLowerCase());
        const matchDistrict = shelterDistrict === 'All' || s.district === shelterDistrict;
        return matchName && matchDistrict;
    });
  }, [shelters, shelterSearch, shelterDistrict]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toggleCartItem = (item: any) => {
    setCart(prev => {
      // Check if this SPECIFIC item from this SPECIFIC hub is already in cart
      const exists = prev.find(c => c.sourceHubId === item.sourceHubId && c.name === item.name);
      
      if (exists) {
        return prev.filter(c => !(c.sourceHubId === item.sourceHubId && c.name === item.name));
      } else {
        return [...prev, { 
          name: item.name, 
          category: item.category, 
          defaultUnit: item.defaultUnit, 
          icon: item.icon, 
          requestQuantity: 1,
          totalStockAvailable: item.totalStock,
          sourceHubId: item.sourceHubId,
          sourceHubName: item.sourceHubName
        }];
      }
    });
  };

  const updateCartQuantity = (name: string, hubId: string | undefined, qty: number | string) => {
    setCart(prev => prev.map(item => {
      if (item.name === name && item.sourceHubId === hubId) {
        if (qty === '') return { ...item, requestQuantity: '' };
        const numQty = Math.max(0, parseInt(String(qty)) || 0);
        return { ...item, requestQuantity: numQty };
      }
      return item;
    }));
  };

  const updateCartHub = (name: string, hubId: string) => {
    setCart(prev => prev.map(item => {
      if (item.name === name) return { ...item, sourceHubId: hubId };
      return item;
    }));
  };

  // Helper to find stock in a specific hub for a given item name
  const getStockInHub = (itemName: string, hubId: string) => {
    return allSupplies.find(s => s.name === itemName && s.shelterId === hubId)?.quantity || 0;
  };

  const handleSubmit = async () => {
    if (!selectedShelterId || cart.length === 0) return;
    setLoading(true);
    try {
      const requests = cart
        .map(item => {
          const amountNum = parseInt(String(item.requestQuantity));
          if (isNaN(amountNum) || amountNum <= 0) return null;
          
          return {
            itemName: item.name,
            category: item.category,
            amount: amountNum,
            unit: item.defaultUnit,
            sourceHubId: item.sourceHubId,
            sourceHubName: hubs.find(h => h._id === item.sourceHubId)?.name || 'Unknown',
            urgency: 'low',
            status: 'Pending',
            requestedAt: new Date()
          };
        })
        .filter(item => item !== null);

      if (requests.length === 0) {
        showAlert.error('ข้อมูลไม่ถูกต้อง', 'กรุณาระบุจำนวนที่มากกว่า 0 สำหรับรายการที่เลือก');
        setLoading(false);
        return;
      }

      await axios.post(`/api/shelters/${selectedShelterId}/resources`, { resources: requests });
      showAlert.success('สำเร็จ', 'สร้างคำร้องขอเรียบร้อยแล้ว');
      window.location.href = '/requests';
    } catch (err) {
      console.error(err);
      showAlert.error('ผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  if (loading && step === 1 && hubs.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* ProgressBar */}
      <div className="row justify-content-center mb-5">
        <div className="col-md-10">
          <div className="d-flex justify-content-between position-relative">
            {[1, 2, 3].map((s) => (
              <div key={s} className="d-flex flex-column align-items-center" style={{ zIndex: 2 }}>
                <div className={`rounded-circle d-flex align-items-center justify-content-center border-3 ${step >= s ? 'bg-primary text-white border-primary' : 'border-theme'}`} style={{ width: '40px', height: '40px', fontWeight: 'bold', backgroundColor: step >= s ? '' : 'var(--bg-secondary)', color: step >= s ? '' : 'var(--text-secondary)' }}>
                  {s}
                </div>
                <span className={`small mt-2 fw-bold ${step >= s ? 'text-primary' : 'text-theme-secondary'}`}>
                  {s === 1 ? 'เลือกสิ่งของ' : s === 2 ? 'เลือกศูนย์ปลายทาง' : 'ยืนยัน'}
                </span>
              </div>
            ))}
            <div className="position-absolute top-50 start-0 translate-middle-y w-100" style={{ height: '4px', zIndex: 1, backgroundColor: 'var(--border-color)' }}>
              <div className="bg-primary h-100 transition-all" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="row justify-content-center">
        <div className="col-md-11">
          <div className="card shadow-lg border-0 rounded-4 overflow-hidden">
            <div className="card-body p-0">
              <div className="row g-0">
                {/* Main Content Pane */}
                <div className="col-lg-8 p-4 bg-card">
                  
                  {/* STEP 1: SELECT ITEMS (CATALOG) */}
                  {step === 1 && (
                    <div className="animate-fade-in">
                      <h4 className="fw-bold mb-4">🛒 ขั้นตอนที่ 1: เลือกสิ่งของที่ต้องการ (Catalog)</h4>
                      
                      {/* Filter Bar */}
                      <div className="row g-2 mb-4">
                        <div className="col-md-5">
                          <div className="input-group">
                            <span className="input-group-text bg-card border-theme"><i className="bi bi-search"></i></span>
                            <input 
                              type="text" 
                              className="form-control border-theme shadow-none" 
                              placeholder="ค้นหาสิ่งของ..." 
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-md-7">
                           <div className="d-flex flex-wrap gap-2">
                              {categories.map(cat => (
                                <button 
                                  key={cat} 
                                  className={`btn btn-sm rounded-pill px-3 py-1 ${activeCategory === cat ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                                  style={{ fontSize: '0.75rem' }}
                                  onClick={() => setActiveCategory(cat)}
                                >
                                  {cat}
                                </button>
                              ))}
                           </div>
                        </div>
                      </div>

                      {/* Items Grid */}
                      <div className="row g-2 overflow-auto pr-2" style={{ maxHeight: '550px', minHeight: '300px' }}>
                        {paginatedCatalog.map(item => {
                          const isSelected = cart.find(c => c.name === item.name && c.sourceHubId === item.sourceHubId);
                          return (
                            <div key={item._id} className="col-6 col-sm-4 col-md-3 col-lg-2 px-1 mb-2">
                              <div 
                                className={`card cursor-pointer border transition-all p-2 text-center position-relative ${isSelected ? 'border-primary shadow-sm bg-primary bg-opacity-10' : 'border-theme bg-card'}`}
                                style={{ 
                                  borderRadius: '12px', 
                                  aspectRatio: '4 / 5',
                                  borderWidth: '2px',
                                  display: 'flex',
                                  flexDirection: 'column'
                                }}
                                onClick={() => toggleCartItem(item)}
                              >
                                {isSelected && <div className="position-absolute top-0 end-0 p-2"><i className="bi bi-check-circle-fill text-primary" style={{ fontSize: '0.9rem' }}></i></div>}
                                <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 p-1">
                                   <div className={`p-2 rounded-circle mb-2 ${isSelected ? 'bg-primary text-white' : 'bg-body text-primary border border-2'}`} style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <i className={`bi ${item.icon} fs-5`}></i>
                                   </div>
                                   <div className="text-theme-secondary mb-1 text-truncate w-100" style={{ fontSize: '0.6rem', letterSpacing: '-0.1px' }}>{item.category}</div>
                                   <div className="fw-bold px-1 text-center w-100 text-theme" style={{ fontSize: '0.75rem', lineHeight: '1.2', maxHeight: '2.4em', overflow: 'hidden' }}>{item.name}</div>
                                   <div className="text-theme-secondary small mt-1 text-truncate w-100" style={{ fontSize: '0.6rem' }}>
                                      <i className="bi bi-building me-1"></i>{item.sourceHubName}
                                   </div>
                                </div>
                                <div className="mt-auto pt-2 border-top border-2 d-flex justify-content-between px-1" style={{ fontSize: '0.7rem' }}>
                                   <span className="text-success fw-bold">เหลือ: {item.totalStock}</span>
                                   <span className="text-muted">{item.defaultUnit}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {paginatedCatalog.length === 0 && (
                          <div className="col-12 text-center py-5 text-muted">
                            <i className="bi bi-search fs-1 d-block mb-3 opacity-25"></i>
                            ไม่พบรายการสิ่งของ หรือไม่มีของในคลังตอนนี้
                          </div>
                        )}
                      </div>

                      {/* Pagination UI */}
                      {totalPages > 1 && (
                        <div className="d-flex justify-content-center align-items-center gap-2 mt-3 pb-2 border-bottom">
                            <button 
                                className="btn btn-sm btn-outline-secondary rounded-pill px-3" 
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                            >
                                <i className="bi bi-chevron-left"></i>
                            </button>
                            <span className="small fw-bold mx-2">หน้า {currentPage} จาก {totalPages}</span>
                            <button 
                                className="btn btn-sm btn-outline-secondary rounded-pill px-3" 
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                            >
                                <i className="bi bi-chevron-right"></i>
                            </button>
                        </div>
                      )}
                      
                      {cart.length > 0 && (
                        <div className="mt-4 text-end">
                            <button 
                                className="btn btn-primary px-5 py-2 rounded-pill fw-bold shadow-sm" 
                                onClick={() => setStep(2)}
                                disabled={cart.some(c => !c.requestQuantity || parseInt(String(c.requestQuantity)) <= 0 || parseInt(String(c.requestQuantity)) > (c.totalStockAvailable || 0))}
                            >
                                ถัดไป: เลือกศูนย์ปลายทาง <i className="bi bi-arrow-right ms-2"></i>
                            </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 2: SELECT DESTINATION */}
                  {step === 2 && (
                    <div className="animate-fade-in">
                       <h4 className="fw-bold mb-4">🏠 ขั้นตอนที่ 2: เลือกศูนย์พักพิงปลายทาง (Target Shelter)</h4>
                       <p className="text-secondary mb-4">ระบุว่าสิ่งของเหล่านี้จะถูกส่งไปที่ศูนย์พักพิงใด</p>
                       
                       {/* Search & Filter Bar */}
                       <div className="row g-2 mb-4">
                         <div className="col-md-8">
                            <div className="input-group">
                               <span className="input-group-text bg-card border-theme"><i className="bi bi-search"></i></span>
                               <input 
                                 type="text" 
                                 className="form-control border-theme shadow-none" 
                                 placeholder="ค้นหาชื่อศูนย์พักพิง..." 
                                 value={shelterSearch}
                                 onChange={(e) => setShelterSearch(e.target.value)}
                               />
                            </div>
                         </div>
                         <div className="col-md-4">
                            <select 
                                className="form-select border-theme shadow-none"
                                value={shelterDistrict}
                                onChange={(e) => setShelterDistrict(e.target.value)}
                            >
                                <option value="All">ทุกเขต/อำเภอ</option>
                                {uniqueDistricts.map(d => (
                                    <option key={d} value={d}>อ. {d}</option>
                                ))}
                            </select>
                         </div>
                       </div>

                       <div className="row g-3 mb-5 overflow-auto" style={{ maxHeight: '450px' }}>
                         {filteredShelters.map(shelter => (
                           <div key={shelter._id} className="col-md-6">
                              <div 
                                className={`card h-100 cursor-pointer border-2 transition-all p-3 d-flex flex-row align-items-center ${selectedShelterId === shelter._id ? 'border-success bg-success bg-opacity-10 shadow-sm' : 'border-theme'}`}
                                onClick={() => setSelectedShelterId(shelter._id)}
                              >
                                 <div className={`p-2 rounded-circle me-3 ${selectedShelterId === shelter._id ? 'bg-success text-white' : 'bg-secondary text-secondary'}`}>
                                    <i className="bi bi-house-fill fs-4"></i>
                                 </div>
                                 <div className="flex-grow-1">
                                    <h6 className="fw-bold mb-0">{shelter.name}</h6>
                                    <small className="text-muted">อ.{shelter.district}</small>
                                 </div>
                                 {selectedShelterId === shelter._id && <i className="bi bi-check-circle-fill text-success fs-5"></i>}
                              </div>
                           </div>
                         ))}
                         {filteredShelters.length === 0 && (
                            <div className="col-12 text-center text-muted py-5">
                                <i className="bi bi-geo-alt fs-1 opacity-25 d-block mb-3"></i>
                                ไม่พบศูนย์พักพิงที่ค้นหา
                            </div>
                         )}
                       </div>

                       <div className="d-flex justify-content-between mt-auto">
                          <button className="btn btn-outline-secondary px-4 rounded-pill fw-bold" onClick={() => setStep(1)}>ย้อนกลับ</button>
                          {selectedShelterId && (
                            <button className="btn btn-primary px-5 rounded-pill fw-bold shadow" onClick={() => setStep(3)}>ถัดไป: ตรวจสอบความถูกต้อง <i className="bi bi-arrow-right"></i></button>
                          )}
                       </div>
                    </div>
                  )}

                  {/* STEP 3: CONFIRMATION */}
                  {step === 3 && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-5">
                            <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                                <i className="bi bi-clipboard-check fs-1"></i>
                            </div>
                            <h3 className="fw-bold">ตรวจสอบก่อนยืนยัน</h3>
                            <p className="text-secondary">สรุปรายการเบิกจ่ายทรัพยากรฉุกเฉิน</p>
                        </div>

                        <div className="card border-0 bg-secondary p-4 rounded-4 mb-4">
                            <div className="row text-center">
                                <div className="col-12">
                                    <div className="small text-muted mb-1">ศูนย์รับของปลายทาง</div>
                                    <div className="fw-bold fs-4 text-success"><i className="bi bi-house-door-fill me-2"></i>{shelters.find(s => s._id === selectedShelterId)?.name}</div>
                                    <div className="small text-muted mt-1">อ. {shelters.find(s => s._id === selectedShelterId)?.district}</div>
                                </div>
                            </div>
                        </div>

                        <div className="table-responsive mb-5">
                            <table className="table table-sm align-middle">
                                <thead className="bg-secondary">
                                    <tr>
                                        <th className="ps-3 py-2">รายการ</th>
                                        <th className="text-center">จำนวนที่ขอ</th>
                                        <th className="text-center">คลังต้นทาง</th>
                                        <th className="text-end pe-3">หน่วย</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map(item => (
                                        <tr key={`${item.name}-${item.sourceHubId}`}>
                                            <td className="ps-3 fw-bold">{item.name}</td>
                                            <td className="text-center">{item.requestQuantity}</td>
                                            <td className="text-center small">
                                               {hubs.find(h => h._id === item.sourceHubId)?.name || 'ไม่ระบุ'}
                                            </td>
                                            <td className="text-end pe-3 text-muted">{item.defaultUnit}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="d-flex gap-3 mt-4">
                            <button className="btn btn-outline-secondary flex-grow-1 py-3 rounded-pill fw-bold" onClick={() => setStep(2)}>แก้ไขข้อมูล</button>
                            <button className="btn btn-primary flex-grow-2 py-3 px-5 rounded-pill fw-bold shadow-lg" onClick={handleSubmit} disabled={loading}>
                                {loading ? 'กำลังส่งข้อมูล...' : 'ยืนยันและสร้างคำร้องขอ'}
                            </button>
                        </div>
                    </div>
                  )}

                </div>

                {/* Right Summary Pane (Shopping Cart style) */}
                <div className="col-lg-4 p-4 border-start bg-secondary bg-opacity-10">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                       <h6 className="fw-bold mb-0">รายการที่เลือก ({cart.length})</h6>
                       <button className="btn btn-link btn-sm text-danger p-0 text-decoration-none" onClick={() => setCart([])}>ล้างรายการ</button>
                    </div>

                    <div className="cart-container overflow-auto pe-2" style={{ maxHeight: '600px' }}>
                        {cart.map(item => {
                            const stock = item.totalStockAvailable || 0;
                            const qty = parseInt(String(item.requestQuantity)) || 0;
                            const isOverStock = qty > stock;
                            return (
                                <div key={`${item.name}-${item.sourceHubId}`} className={`card shadow-sm mb-3 ${isOverStock ? 'border-danger' : 'border-light'}`} style={{ backgroundColor: 'var(--bg-card)' }}>
                                    <div className="card-body p-3">
                                        <div className="d-flex justify-content-between mb-2">
                                            <div>
                                                <div className={`fw-bold small ${isOverStock ? 'text-danger' : 'text-theme'}`}>{item.name}</div>
                                                <div className="text-secondary" style={{ fontSize: '0.65rem' }}>
                                                    <i className="bi bi-building me-1"></i>{item.sourceHubName}
                                                </div>
                                            </div>
                                            <button className="btn-close" style={{ transform: 'scale(0.7)' }} onClick={() => toggleCartItem(item)}></button>
                                        </div>
                                        <div className="d-flex align-items-center mb-1">
                                            <div className="input-group input-group-sm w-75">
                                                <button className="btn btn-outline-secondary" onClick={() => updateCartQuantity(item.name, item.sourceHubId, (parseInt(String(item.requestQuantity)) || 0) - 1)}>-</button>
                                                <input 
                                                  type="number" 
                                                  className={`form-control text-center fw-bold ${parseInt(String(item.requestQuantity)) > stock ? 'is-invalid text-danger border-danger' : ''}`}
                                                  value={item.requestQuantity} 
                                                  placeholder="0"
                                                  onKeyDown={(e) => {
                                                      if (
                                                        ['-', '+', 'e', 'E', '.'].includes(e.key) || 
                                                        (e.key.length === 1 && !/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey)
                                                      ) {
                                                          e.preventDefault();
                                                      }
                                                   }}
                                                  onChange={(e) => updateCartQuantity(item.name, item.sourceHubId, e.target.value)} 
                                                />
                                                <button 
                                                  className="btn btn-outline-secondary" 
                                                  onClick={() => updateCartQuantity(item.name, item.sourceHubId, (parseInt(String(item.requestQuantity)) || 0) + 1)}
                                                >
                                                  +
                                                </button>
                                            </div>
                                            <span className="ms-auto small text-muted text-end" style={{ minWidth: '40px' }}>{item.defaultUnit}</span>
                                        </div>
                                        {item.sourceHubId && (
                                          <div className={`x-small ${Number(item.requestQuantity) > stock ? 'text-danger' : 'text-success'}`}>
                                            <i className="bi bi-info-circle me-1"></i>
                                            สต็อก: {stock} {item.defaultUnit}
                                          </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {cart.length === 0 && (
                            <div className="text-center py-5 text-muted opacity-50">
                                <i className="bi bi-cart-x fs-1 d-block mb-2"></i>
                                ยังไม่มีรายการที่เลือก
                            </div>
                        )}
                    </div>

                    <div className="mt-4 pt-3 border-top">
                        <div className="alert alert-info border-0 small py-2 d-flex gap-2">
                            <i className="bi bi-info-circle-fill"></i>
                            <div>รายการทั้งหมดจะถูกนำไปสร้างเป็น <b>คำร้องขอ</b> ติดตามได้ในระบบเบิกจ่าย</div>
                        </div>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .hover-shadow:hover { box-shadow: 0 .5rem 1rem rgba(0,0,0,.1)!important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .flex-grow-2 { flex-grow: 2; }
        .white-space-nowrap { white-space: nowrap; }
      `}</style>
    </div>
  );
}
