// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token, // ถ้ามี Token คือเข้าได้
  },
});

// ระบุหน้าที่ต้อง Login เท่านั้นถึงจะเข้าได้
export const config = { 
  matcher: ["/admin/:path*", "/api/shelters/import"] 
};