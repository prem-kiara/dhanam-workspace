import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { createAdminClient } from "@/lib/supabase/server";

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId:     process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId:     process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: "openid profile email offline_access User.Read",
        },
      },
    }),
  ],

  callbacks: {
    // ── Called on every sign-in ───────────────────────────────────────────────
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      // Azure AD puts the user's stable Object ID (a proper UUID) in profile.oid
      // This is different from NextAuth's internal user.id which is NOT a UUID
      const oid = (profile as any)?.oid ?? (profile as any)?.sub;
      if (!oid) {
        console.error("[auth] Could not extract Azure OID from profile", profile);
        return false;
      }

      const supabase = createAdminClient();
      const name     = user.name ?? user.email.split("@")[0];

      const { error } = await supabase.from("profiles").upsert(
        {
          id:         oid,          // Azure Object ID — valid UUID
          name,
          email:      user.email,
          avatar_url: user.image ?? null,
        },
        { onConflict: "email" }
      );

      if (error) {
        console.error("[auth] Profile upsert failed:", error.message);
        // Don't block sign-in — user can still use the app
      }

      return true;
    },

    // ── JWT: store OID in token on first sign-in ──────────────────────────────
    async jwt({ token, user, account, profile }) {
      if (profile) {
        // profile is only available on the FIRST sign-in — store OID in token
        const oid = (profile as any)?.oid ?? (profile as any)?.sub;
        if (oid) token.sub = oid;  // token.sub persists across sessions
      }
      return token;
    },

    // ── Session: expose OID as session.user.id ────────────────────────────────
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;  // This is now the Azure OID (UUID)
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
    error:  "/auth/signin",
  },

  session: { strategy: "jwt" },
  secret:  process.env.NEXTAUTH_SECRET,
};

// ── Extend next-auth types ────────────────────────────────────────────────────
declare module "next-auth" {
  interface Session {
    user: {
      id:     string;
      name?:  string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
