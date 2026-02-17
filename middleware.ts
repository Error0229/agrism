import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/login",
  },
});

export const config = {
  matcher: [
    "/",
    "/calendar/:path*",
    "/crops/:path*",
    "/farm-management/:path*",
    "/field-planner/:path*",
    "/ai-assistant/:path*",
    "/api/planner/:path*",
  ],
};

