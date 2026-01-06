'use client'
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showAlert } from '@/utils/swal-utils';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn('credentials', {
      username,
      password,
      redirect: false
    });

    if (res?.ok) {
      router.push('/admin/import'); // Login สำเร็จไปหน้าจัดการข้อมูล
    } else {
      showAlert.error('เข้าสู่ระบบไม่สำเร็จ', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <div className="card shadow-sm" style={{ width: '400px', backgroundColor: 'var(--bg-card)' }}>
        <div className="card-body p-5 text-center">
          <h3 className="mb-4" style={{ color: 'var(--text-primary)' }}>เจ้าหน้าที่เข้าสู่ระบบ</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-floating mb-3">
              <input 
                type="text" 
                className="form-control" 
                id="userInput"
                placeholder="Username"
                onChange={(e) => setUsername(e.target.value)}
              />
              <label htmlFor="userInput">Username</label>
            </div>
            <div className="form-floating mb-4">
              <input 
                type="password" 
                className="form-control" 
                id="passInput"
                placeholder="Password"
                onChange={(e) => setPassword(e.target.value)}
              />
              <label htmlFor="passInput">Password</label>
            </div>
            <button className="btn btn-primary w-100 btn-lg shadow-sm" type="submit">Login</button>
          </form>
          <p className="mt-3 text-secondary small">เฉพาะเจ้าหน้าที่ศูนย์พักพิงเท่านั้น</p>
        </div>
      </div>
    </div>
  );
}