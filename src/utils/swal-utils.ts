import Swal from 'sweetalert2';

/**
 * SweetAlert2 Utility Functions
 * ปรับแต่งสไตล์และค่าเริ่มต้นให้เหมือนกันทั้งระบบ
 */

export const showAlert = {
  // ✅ แจ้งเตือนสำเร็จ (Toast - ปิดเองได้)
  success: (title: string, text?: string) => {
    return Swal.fire({
      icon: 'success',
      title,
      text,
      timer: 2000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
      timerProgressBar: true,
    });
  },

  // ❌ แจ้งเตือนผิดพลาด (Modal - ต้องกดปิด)
  error: (title: string, text?: string) => {
    return Swal.fire({
      icon: 'error',
      title,
      text: text || 'เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง',
      confirmButtonColor: '#3085d6',
    });
  },

  // ⚠️ ยืนยันการลบ (Confirmation)
  confirmDelete: async (title: string = 'คุณแน่ใจหรือไม่?', text: string = 'ข้อมูลนี้จะถูกลบและไม่สามารถกู้คืนได้!') => {
    const result = await Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true
    });
    return result.isConfirmed;
  },

  // ℹ️ แจ้งเตือนข้อมูลทั่วไป
  info: (title: string, text?: string) => {
    return Swal.fire({
      icon: 'info',
      title,
      text,
      confirmButtonColor: '#3085d6',
    });
  }
};
