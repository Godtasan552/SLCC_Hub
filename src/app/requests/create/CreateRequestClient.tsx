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

interface CartItem extends StandardItem {
  requestQuantity: number | string;
  sourceHubId?: string;
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

  // Helper to find total stock across all hubs
  const getStockInAllHubs = (itemName: string) => {
    return allSupplies
      .filter(s => s.name === itemName)
      .reduce((sum, s) => sum + s.quantity, 0);
  };

  // Filter standard items based on category, search AND availability
  const filteredCatalog = useMemo(() => {
    return STANDARD_ITEMS.filter(item => {
      const matchCat = activeCategory === 'ทั้งหมด' || item.category === activeCategory;
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const hasStock = getStockInAllHubs(item.name) > 0;
      return matchCat && matchSearch && hasStock;
    });
  }, [activeCategory, searchTerm, allSupplies]);

  const categories = useMemo(() => {
    // Only show categories that have items in stock
    const availableItems = STANDARD_ITEMS.filter(item => getStockInAllHubs(item.name) > 0);
    return ['ทั้งหมด', ...new Set(availableItems.map(s => s.category))];
  }, [allSupplies]);

  const toggleCartItem = (item: StandardItem) => {
    setCart(prev => {
      const exists = prev.find(c => c.name === item.name);
      if (exists) {
        return prev.filter(c => c.name !== item.name);
      } else {
        return [...prev, { ...item, requestQuantity: 1 }];
      }
    });
  };

  const updateCartQuantity = (name: string, qty: number | string) => {
    setCart(prev => prev.map(item => {
      if (item.name === name) {
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
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="d-flex flex-column align-items-center" style={{ zIndex: 2 }}>
                <div className={`rounded-circle d-flex align-items-center justify-content-center border-3 ${step >= s ? 'bg-primary text-white border-primary' : 'border-theme'}`} style={{ width: '40px', height: '40px', fontWeight: 'bold', backgroundColor: step >= s ? '' : 'var(--bg-secondary)', color: step >= s ? '' : 'var(--text-secondary)' }}>
                  {s}
                </div>
                <span className={`small mt-2 fw-bold ${step >= s ? 'text-primary' : 'text-theme-secondary'}`}>
                  {s === 1 ? 'เลือกสิ่งของ' : s === 2 ? 'ระบุจำนวนและคลัง' : s === 3 ? 'เลือกศูนย์ปลายทาง' : 'ยืนยัน'}
                </span>
              </div>
            ))}
            <div className="position-absolute top-50 start-0 translate-middle-y w-100" style={{ height: '4px', zIndex: 1, backgroundColor: 'var(--border-color)' }}>
              <div className="bg-primary h-100 transition-all" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
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
                      <div className="row g-2 overflow-auto pr-2" style={{ maxHeight: '600px' }}>
                        {filteredCatalog.map(item => {
                          const isSelected = cart.find(c => c.name === item.name);
                          return (
                            <div key={item.name} className="col-6 col-sm-4 col-md-3 col-lg-2 px-1 mb-2">
                              <div 
                                className={`card h-100 cursor-pointer border transition-all p-1 text-center position-relative ${isSelected ? 'border-primary shadow-sm bg-primary bg-opacity-5' : 'border-light bg-light bg-opacity-10'}`}
                                style={{ borderRadius: '10px' }}
                                onClick={() => toggleCartItem(item)}
                              >
                                {isSelected && <div className="position-absolute top-0 end-0 p-1"><i className="bi bi-check-circle-fill text-primary" style={{ fontSize: '0.7rem' }}></i></div>}
                                <div className="d-flex flex-column align-items-center mb-1">
                                   <div className={`p-1 rounded-circle mb-1 ${isSelected ? 'bg-primary text-white' : 'bg-white text-primary border'}`} style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <i className={`bi ${item.icon} fs-6`}></i>
                                   </div>
                                   <div className="text-muted" style={{ fontSize: '0.55rem', letterSpacing: '-0.2px' }}>{item.category}</div>
                                   <div className="fw-bold px-1" style={{ fontSize: '0.65rem', lineHeight: '1.2', height: '1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.name}</div>
                                </div>
                                <div className="mt-auto pt-1 border-top" style={{ fontSize: '0.55rem' }}>
                                   <span className="text-muted">{item.defaultUnit}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {filteredCatalog.length === 0 && (
                          <div className="col-12 text-center py-5 text-muted">
                            <i className="bi bi-search fs-1 d-block mb-3 opacity-25"></i>
                            พบรายการสิ่งของ หรือไม่มีของในคลังตอนนี้
                          </div>
                        )}
                      </div>
                      
                      {cart.length > 0 && (
                        <div className="mt-4 text-end">
                            <button className="btn btn-primary px-5 py-2 rounded-pill fw-bold shadow-sm" onClick={() => setStep(2)}>
                                ถัดไป: ระบุจำนวนและคลัง <i className="bi bi-arrow-right ms-2"></i>
                            </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 2: SPECIFY QUANTITY AND SOURCE HUB */}
                  {step === 2 && (
                    <div className="animate-fade-in">
                       <div className="d-flex justify-content-between align-items-center mb-4">
                          <h4 className="fw-bold mb-0">📦 ขั้นตอนที่ 2: ระบุจำนวนและคลังต้นทาง</h4>
                          <button className="btn btn-outline-secondary btn-sm rounded-pill" onClick={() => setStep(1)}><i className="bi bi-arrow-left"></i> ย้อนกลับ</button>
                       </div>

                       <div className="overflow-auto pr-2" style={{ maxHeight: '550px' }}>
                          {cart.map(item => (
                             <div key={item.name} className="card border-theme mb-3 shadow-sm overflow-hidden">
                                <div className="card-body p-3">
                                   <div className="row align-items-center">
                                      <div className="col-md-4">
                                         <div className="d-flex align-items-center">
                                            <div className="p-2 bg-secondary rounded-3 me-3"><i className={`bi ${item.icon} text-primary`}></i></div>
                                            <div>
                                               <div className="fw-bold small">{item.name}</div>
                                               <div className="text-muted" style={{ fontSize: '0.7rem' }}>{item.category}</div>
                                            </div>
                                         </div>
                                      </div>
                                      <div className="col-md-3">
                                         <div className="input-group input-group-sm">
                                            <button className="btn btn-outline-secondary" onClick={() => updateCartQuantity(item.name, (parseInt(String(item.requestQuantity)) || 0) - 1)}>-</button>
                                            <input 
                                              type="number" 
                                              className="form-control text-center fw-bold" 
                                              value={item.requestQuantity} 
                                              onChange={(e) => updateCartQuantity(item.name, e.target.value)} 
                                            />
                                            <button className="btn btn-outline-secondary" onClick={() => updateCartQuantity(item.name, (parseInt(String(item.requestQuantity)) || 0) + 1)}>+</button>
                                            <span className="input-group-text bg-transparent border-0 small text-muted">{item.defaultUnit}</span>
                                         </div>
                                      </div>
                                      <div className="col-md-5">
                                         <select 
                                           className="form-select form-select-sm border-theme shadow-none" 
                                           value={item.sourceHubId || ''} 
                                           onChange={(e) => updateCartHub(item.name, e.target.value)}
                                         >
                                            <option value="">-- เลือกคลังต้นทาง --</option>
                                            {hubs.map(hub => {
                                               const stock = getStockInHub(item.name, hub._id);
                                               return (
                                                  <option key={hub._id} value={hub._id} disabled={stock <= 0}>
                                                     {hub.name} (มี {stock} {item.defaultUnit})
                                                  </option>
                                               );
                                            })}
                                         </select>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>

                       <div className="mt-4 d-flex justify-content-between">
                          <div className="text-muted small d-flex align-items-center">
                             <i className="bi bi-info-circle me-2"></i> กรุณาเลือกคลังที่มีสินค้าเพียงพอ
                          </div>
                          <button 
                            className="btn btn-primary px-5 py-2 rounded-pill fw-bold" 
                            onClick={() => setStep(3)}
                            disabled={cart.some(c => !c.sourceHubId || !c.requestQuantity)}
                          >
                             ถัดไป: เลือกศูนย์ปลายทาง <i className="bi bi-arrow-right ms-2"></i>
                          </button>
                       </div>
                    </div>
                  )}

                  {/* STEP 3: SELECT DESTINATION */}
                  {step === 3 && (
                    <div className="animate-fade-in">
                       <h4 className="fw-bold mb-4">🏠 ขั้นตอนที่ 3: เลือกศูนย์พักพิงปลายทาง (Target Shelter)</h4>
                       <p className="text-secondary mb-4">ระบุว่าสิ่งของเหล่านี้จะถูกส่งไปที่ศูนย์พักพิงใด</p>
                       
                       <div className="row g-3 mb-5 overflow-auto" style={{ maxHeight: '450px' }}>
                         {shelters.map(shelter => (
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
                       </div>

                       <div className="d-flex justify-content-between mt-auto">
                          <button className="btn btn-outline-secondary px-4 rounded-pill fw-bold" onClick={() => setStep(2)}>ย้อนกลับ</button>
                          {selectedShelterId && (
                            <button className="btn btn-primary px-5 rounded-pill fw-bold shadow" onClick={() => setStep(4)}>ถัดไป: ตรวจสอบความถูกต้อง <i className="bi bi-arrow-right"></i></button>
                          )}
                       </div>
                    </div>
                  )}

                  {/* STEP 4: CONFIRMATION */}
                  {step === 4 && (
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
                                        <tr key={item.name}>
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
                            <button className="btn btn-outline-secondary flex-grow-1 py-3 rounded-pill fw-bold" onClick={() => setStep(3)}>แก้ไขข้อมูล</button>
                            <button className="btn btn-primary flex-grow-2 py-3 px-5 rounded-pill fw-bold shadow-lg" onClick={handleSubmit} disabled={loading}>
                                {loading ? 'กำลังส่งข้อมูล...' : 'ยืนยันและสร้างคำร้องขอ'}
                            </button>
                        </div>
                    </div>
                  )}

                </div>

                {/* Right Summary Pane (Shopping Cart style) */}
                <div className="col-lg-4 p-4 border-start bg-light bg-opacity-50">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                       <h6 className="fw-bold mb-0">รายการที่เลือก ({cart.length})</h6>
                       <button className="btn btn-link btn-sm text-danger p-0 text-decoration-none" onClick={() => setCart([])}>ล้างรายการ</button>
                    </div>

                    <div className="cart-container overflow-auto pe-2" style={{ maxHeight: '600px' }}>
                        {cart.map(item => {
                            const stock = item.sourceHubId ? getStockInHub(item.name, item.sourceHubId) : 0;
                            return (
                                <div key={item.name} className="card border-light shadow-sm mb-3">
                                    <div className="card-body p-3">
                                        <div className="d-flex justify-content-between mb-2">
                                            <div className="fw-bold small">{item.name}</div>
                                            <button className="btn-close" style={{ transform: 'scale(0.7)' }} onClick={() => toggleCartItem(item)}></button>
                                        </div>
                                        <div className="d-flex align-items-center mb-1">
                                            <div className="input-group input-group-sm w-75">
                                                <button className="btn btn-outline-secondary" onClick={() => updateCartQuantity(item.name, (parseInt(String(item.requestQuantity)) || 0) - 1)}>-</button>
                                                <input 
                                                  type="number" 
                                                  className="form-control text-center fw-bold" 
                                                  value={item.requestQuantity} 
                                                  placeholder="0"
                                                  onChange={(e) => updateCartQuantity(item.name, e.target.value)} 
                                                />
                                                <button 
                                                  className="btn btn-outline-secondary" 
                                                  onClick={() => updateCartQuantity(item.name, (parseInt(String(item.requestQuantity)) || 0) + 1)}
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
