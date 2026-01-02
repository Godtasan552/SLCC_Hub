'use client';
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Supply } from '@/types/supply';
import { showAlert } from '@/utils/swal-utils';

interface Location {
  _id: string;
  name: string;
  district?: string;
  type?: string;
}

interface CartItem extends Partial<Supply> {
  requestQuantity: number;
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

  // Filter supplies based on selected Hub
  const hubSupplies = useMemo(() => {
    if (!selectedHubId) return [];
    return allSupplies.filter(s => s.shelterId === selectedHubId && s.quantity > 0);
  }, [selectedHubId, allSupplies]);

  const categories = useMemo(() => {
    return ['ทั้งหมด', ...new Set(hubSupplies.map(s => s.category))];
  }, [hubSupplies]);

  const filteredSupplies = useMemo(() => {
    return hubSupplies.filter(s => {
      const matchCat = activeCategory === 'ทั้งหมด' || s.category === activeCategory;
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [hubSupplies, activeCategory, searchTerm]);

  const toggleCartItem = (supply: Supply) => {
    setCart(prev => {
      const exists = prev.find(item => item._id === supply._id);
      if (exists) {
        return prev.filter(item => item._id !== supply._id);
      } else {
        return [...prev, { ...supply, requestQuantity: 1 }];
      }
    });
  };

  const updateCartQuantity = (id: string, qty: number) => {
    setCart(prev => prev.map(item => {
      if (item._id === id) {
        const maxAvailable = item.quantity || 0;
        // ปรับจำนวนไม่ให้ต่ำกว่า 1 และไม่ให้เกินจำนวนที่มีในสต็อก
        const safeQty = Math.max(1, Math.min(qty, maxAvailable));
        return { ...item, requestQuantity: safeQty };
      }
      return item;
    }));
  };

  const handleSubmit = async () => {
    if (!selectedShelterId || cart.length === 0) return;
    setLoading(true);
    try {
      // Create a request for each item in the cart for the target shelter
      // In this system, a Shelter Request records what the shelter needs.
      // We will match the items with the ones from the Hub.
      const requests = cart.map(item => ({
        itemName: item.name,
        category: item.category,
        amount: item.requestQuantity,
        unit: item.unit,
        urgency: 'low',
        status: 'Pending',
        requestedAt: new Date()
      }));

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
                  {s === 1 ? 'เลือกคลังต้นทาง' : s === 2 ? 'เลือกสิ่งของ' : s === 3 ? 'เลือกศูนย์ปลายทาง' : 'ยืนยัน'}
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
                <div className="col-lg-8 p-4 bg-white">
                  
                  {/* STEP 1: SELECT HUB */}
                  {step === 1 && (
                    <div className="animate-fade-in">
                      <h4 className="fw-bold mb-4">📍 ขั้นตอนที่ 1: เลือกคลังต้นทาง (Source Hub)</h4>
                      <p className="text-secondary mb-4">ระบุคลังกลางที่คุณต้องการตรวจสอบสต็อกและเบิกจ่ายสินค้าไปช่วยศูนย์พักพิง</p>
                      
                      <div className="row g-3">
                        {hubs.map(hub => (
                          <div key={hub._id} className="col-md-6">
                            <div 
                              className={`card h-100 cursor-pointer border-2 transition-all hover-shadow ${selectedHubId === hub._id ? 'border-primary bg-primary bg-opacity-10' : 'border-light'}`}
                              onClick={() => { setSelectedHubId(hub._id); setStep(2); }}
                            >
                              <div className="card-body p-4 text-center">
                                <i className="bi bi-building-fill text-primary mb-2 fs-1"></i>
                                <h5 className="fw-bold mb-0">{hub.name}</h5>
                                <small className="text-secondary">อ.{hub.district}</small>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STEP 2: SELECT ITEMS */}
                  {step === 2 && (
                    <div className="animate-fade-in">
                      <div className="d-flex justify-content-between align-items-end mb-4">
                        <div>
                          <h4 className="fw-bold mb-1">📦 ขั้นตอนที่ 2: เลือกสิ่งของที่ต้องการ</h4>
                          <small className="text-primary fw-bold">คลัง: {hubs.find(h => h._id === selectedHubId)?.name}</small>
                        </div>
                        <div className="d-flex gap-2">
                           <button className="btn btn-outline-secondary btn-sm rounded-pill" onClick={() => setStep(1)}><i className="bi bi-arrow-left"></i> ย้อนกลับ</button>
                        </div>
                      </div>

                      {/* Filter Bar */}
                      <div className="row g-2 mb-4">
                        <div className="col-md-5">
                          <div className="input-group">
                            <span className="input-group-text bg-white border-theme"><i className="bi bi-search"></i></span>
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
                           <div className="d-flex gap-1 overflow-auto no-scrollbar pb-1">
                              {categories.map(cat => (
                                <button 
                                  key={cat} 
                                  className={`btn btn-sm rounded-pill whitespace-nowrap px-3 ${activeCategory === cat ? 'btn-primary' : 'btn-light'}`}
                                  onClick={() => setActiveCategory(cat)}
                                >
                                  {cat}
                                </button>
                              ))}
                           </div>
                        </div>
                      </div>

                      {/* Items Grid */}
                      <div className="row g-3 overflow-auto pr-2" style={{ maxHeight: '500px' }}>
                        {filteredSupplies.map(supply => {
                          const isSelected = cart.find(c => c._id === supply._id);
                          return (
                            <div key={supply._id} className="col-md-4">
                              <div 
                                className={`card h-100 cursor-pointer border-2 transition-all p-3 text-center position-relative ${isSelected ? 'border-primary shadow-sm bg-primary bg-opacity-10' : 'border-light bg-light bg-opacity-50'}`}
                                onClick={() => toggleCartItem(supply)}
                              >
                                {isSelected && <div className="position-absolute top-0 end-0 p-2"><i className="bi bi-check-circle-fill text-primary fs-5"></i></div>}
                                <div className="small text-muted mb-1" style={{ fontSize: '0.65rem' }}>{supply.category}</div>
                                <div className="fw-bold small mb-2">{supply.name}</div>
                                <div className="mt-auto pt-2 border-top mt-2">
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span className="small text-muted">คงเหลือ:</span>
                                    <span className={`fw-bold ${supply.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                                      {supply.quantity} {supply.unit}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {filteredSupplies.length === 0 && (
                          <div className="col-12 text-center py-5 text-muted">
                             <i className="bi bi-inbox fs-1 d-block opacity-25"></i>
                             ไม่มีสินค้าในคลังนี้ หรือไม่ตรงกับการค้นหา
                          </div>
                        )}
                      </div>
                      
                      {cart.length > 0 && (
                        <div className="mt-4 text-end">
                            <button className="btn btn-primary px-5 rounded-pill fw-bold" onClick={() => setStep(3)}>ถัดไป: เลือกศูนย์ปลายทาง <i className="bi bi-arrow-right"></i></button>
                        </div>
                      )}
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
                                className={`card h-100 cursor-pointer border-2 transition-all p-3 d-flex flex-row align-items-center ${selectedShelterId === shelter._id ? 'border-success bg-success bg-opacity-10 shadow-sm' : 'border-light'}`}
                                onClick={() => setSelectedShelterId(shelter._id)}
                              >
                                 <div className={`p-2 rounded-circle me-3 ${selectedShelterId === shelter._id ? 'bg-success text-white' : 'bg-light text-secondary'}`}>
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

                        <div className="card border-0 bg-light p-4 rounded-4 mb-4">
                            <div className="row text-center">
                                <div className="col-5">
                                    <div className="small text-muted">หุบต้นทาง</div>
                                    <div className="fw-bold fs-5 text-primary">{hubs.find(h => h._id === selectedHubId)?.name}</div>
                                </div>
                                <div className="col-2 d-flex align-items-center justify-content-center">
                                    <i className="bi bi-arrow-right-circle-fill text-secondary fs-3"></i>
                                </div>
                                <div className="col-5">
                                    <div className="small text-muted">ศูนย์ปลายทาง</div>
                                    <div className="fw-bold fs-5 text-success">{shelters.find(s => s._id === selectedShelterId)?.name}</div>
                                </div>
                            </div>
                        </div>

                        <div className="table-responsive mb-5">
                            <table className="table table-sm align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th className="ps-3 py-2">รายการ</th>
                                        <th className="text-center">จำนวนที่ขอ</th>
                                        <th className="text-end pe-3">หน่วย</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map(item => (
                                        <tr key={item._id}>
                                            <td className="ps-3 fw-bold">{item.name}</td>
                                            <td className="text-center">{item.requestQuantity}</td>
                                            <td className="text-end pe-3 text-muted">{item.unit}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="d-flex gap-3 mt-4">
                            <button className="btn btn-outline-secondary flex-grow-1 py-3 rounded-pill fw-bold" onClick={() => setStep(3)}>แก้ไขข้อมูล</button>
                            <button className="btn btn-primary flex-grow-2 py-3 px-5 rounded-pill fw-bold shadow-lg" onClick={handleSubmit} disabled={loading}>
                                {loading ? 'กำลังส่งข้อมูล...' : 'ยืนยันและส่งคำขอ'}
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
                        {cart.map(item => (
                            <div key={item._id} className="card border-light shadow-sm mb-3">
                                <div className="card-body p-3">
                                    <div className="d-flex justify-content-between mb-2">
                                        <div className="fw-bold small">{item.name}</div>
                                        <button className="btn-close" style={{ transform: 'scale(0.7)' }} onClick={() => toggleCartItem(item as Supply)}></button>
                                    </div>
                                    <div className="d-flex align-items-center">
                                        <div className="input-group input-group-sm w-75">
                                            <button className="btn btn-outline-secondary" onClick={() => updateCartQuantity(item._id!, item.requestQuantity - 1)}>-</button>
                                            <input 
                                              type="number" 
                                              className="form-control text-center fw-bold" 
                                              value={item.requestQuantity} 
                                              max={item.quantity}
                                              onChange={(e) => updateCartQuantity(item._id!, parseInt(e.target.value) || 1)} 
                                            />
                                            <button 
                                              className="btn btn-outline-secondary" 
                                              onClick={() => updateCartQuantity(item._id!, item.requestQuantity + 1)}
                                              disabled={item.requestQuantity >= (item.quantity || 0)}
                                            >
                                              +
                                            </button>
                                        </div>
                                        <span className="ms-auto small text-muted text-end" style={{ minWidth: '40px' }}>{item.unit}</span>
                                    </div>
                                    {item.requestQuantity >= (item.quantity || 0) && (
                                      <div className="text-danger" style={{ fontSize: '0.65rem', marginTop: '4px' }}>
                                        <i className="bi bi-exclamation-circle me-1"></i>
                                        ถึงขีดจำกัดจำนวนที่มีในคลังแล้ว
                                      </div>
                                    )}
                                </div>
                            </div>
                        ))}
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
