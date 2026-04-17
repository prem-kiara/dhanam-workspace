import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { createAdminClient } from "@/lib/supabase/server";

// ── Claim any pending workspace memberships when user signs in ────────────────
async function claimPendingMemberships(userId: string, email: string) {
  const supabase = createAdminClient();
  const { data: pending } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("email", email)
    .eq("pending", true);

  if (pending && pending.length > 0) {
    await supabase
      .from("workspace_members")
      .update({ user_id: userId, pending: false })
      .eq("email", email)
      .eq("pending", true);
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId:     process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId:     process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          // Request User.Read so we can call MS Graph for org people search
          scope: "openid profile email offline_access User.Read",
        },
      },
    }),
  ],

  callbacks: {
    // ── Called on every sign-in ───────────────────────────────────────────────
    async signIn({ user, profile }) {
      if (!user.email) return false;

      // Azure AD puts the user's stable Object ID (a proper UUID) in profile.oid
      const oid = (profile as any)?.oid ?? (profile as any)?.sub;
      if (!oid) {
        console.error("[auth] Could not extract Azure OID from profile", profile);
        return false;
      }

      const supabase = createAdminClient();
      const name = user.name ?? user.email.split("@")[0];

      const { error } = await supabase.from("profiles").upsert(
        {
          id:         oid,
          name,
          email:      user.email,
          avatar_url: user.image ?? null,
        },
        { onConflict: "email" }
      );

      if (error) {
        console.error("[auth] Profile upsert failed:", error.message);
      }

      // Claim any pending workspace memberships
      await claimPendingMemberships(oid, user.email);

      return true;
    },

    // ── JWT: store OID + MS Graph access token ────────────────────────────────
    async jwt({ token, account, profile }) {
      // profile + account are only available on the FIRST sign-in
      if (profile) {
        const oid = (profile as any)?.oid ?? (profile as any)?.sub;
        if (oid) token.sub = oid;  // token.sub persists across sessions
      }
      if (account) {
        token.accessToken  = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt    = account.expires_at;
      }
      return token;
    },

    // ── Session: expose OID as session.user.id + accessToken ─────────────────
    async session({ session, token }) {
      if (session.user) {
        if (token.sub)         session.user.id          = token.sub;
        if (token.accessToken) session.accessToken       = token.accessToken as string;
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
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?:  string;
    refreshToken?: string;
    expiresAt?:    number;
  }
}
