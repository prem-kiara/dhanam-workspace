import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api/auth (NextAuth routes)
     * - _next (Next.js internals)
     * - static files (fonts, icons, images, manifest, favicon)
     * - auth/signin (login page itself)
     */
    "/((?!api/auth|_next/static|_next/image|fonts|icons|images|manifest|favicon|auth/signin).*)",
  ],
};
