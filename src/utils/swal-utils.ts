import Swal from 'sweetalert2';

/**
 * SweetAlert2 Utility Functions
 * ปรับแต่งสไตล์และค่าเริ่มต้นให้เหมือนกันทั้งระบบ
 */

const themeConfig = {
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  confirmButtonColor: '#0d6efd', // Bootstrap Primary
  cancelButtonColor: '#6c757d',  // Bootstrap Secondary
};

export const showAlert = {
  // ✅ แจ้งเตือนสำเร็จ (Toast - ปิดเองได้)
  success: (title: string, text?: string) => {
    return Swal.fire({
      ...themeConfig,
      icon: 'success',
      title,
      text,
      timer: 2000,
      showConfirmButton: false,
      toast: true,
      position: 'top',
      timerProgressBar: true,
    });
  },

  // ❌ แจ้งเตือนผิดพลาด (Modal - ต้องกดปิด)
  error: (title: string, text?: string) => {
    return Swal.fire({
      ...themeConfig,
      icon: 'error',
      title,
      text: text || 'เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง',
      confirmButtonColor: '#dc3545',
      position: 'top',
    });
  },

  // ⚠️ ยืนยันการลบ (Confirmation)
  confirmDelete: async (title: string = 'คุณแน่ใจหรือไม่?', text: string = 'ข้อมูลนี้จะถูกลบและไม่สามารถกู้คืนได้!') => {
    const result = await Swal.fire({
      ...themeConfig,
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545', // Use danger for delete
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
      position: 'top',
    });
    return result.isConfirmed;
  },

  // ℹ️ แจ้งเตือนข้อมูลทั่วไป
  info: (title: string, text?: string) => {
    return Swal.fire({
      ...themeConfig,
      icon: 'info',
      title,
      text,
      confirmButtonColor: '#0dcaf0',
      position: 'top',
    });
  },

  // ⌨️ รับค่าจากผู้ใช้ (Prompt)
  prompt: async (title: string, inputLabel: string, defaultValue: string = '') => {
    const { value } = await Swal.fire({
      ...themeConfig,
      title,
      input: 'text',
      inputLabel,
      inputValue: defaultValue,
      showCancelButton: true,
      confirmButtonText: 'ตกลง',
      cancelButtonText: 'ยกเลิก',
      position: 'top',
      inputValidator: (value) => {
        if (!value) {
          return 'กรุณาระบุข้อมูล!';
        }
      }
    });
    return value;
  },

  // 🔢 รับค่าตัวเลขจากผู้ใช้ (Number Prompt)
  numberPrompt: async (title: string, inputLabel: string, defaultValue: number | string = 0) => {
    const { value } = await Swal.fire({
      ...themeConfig,
      title,
      input: 'number',
      inputLabel,
      inputValue: defaultValue,
      showCancelButton: true,
      confirmButtonText: 'ตกลง',
      cancelButtonText: 'ยกเลิก',
      position: 'top',
      inputAttributes: {
        min: '0',
        step: '1'
      },
      didOpen: () => {
        const input = Swal.getInput();
        if (input) {
          input.onkeydown = (e) => {
            if (
              ['-', '+', 'e', 'E', '.'].includes(e.key) || 
              (e.key.length === 1 && !/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey)
            ) {
              e.preventDefault();
            }
          };
        }
      },
      inputValidator: (value) => {
        if (!value) {
          return 'กรุณาระบุจำนวน!';
        }
        if (parseFloat(value) < 0) {
          return 'จำนวนต้องไม่ติดลบ!';
        }
      }
    });
    return value;
  }
};
