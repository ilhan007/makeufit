import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const db = getDb();
      const existing = await db.select().from(users).where(eq(users.email, user.email)).limit(1);
      if (existing.length === 0) {
        await db.insert(users).values({
          id: user.id ?? crypto.randomUUID(),
          name: user.name,
          email: user.email,
          image: user.image,
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const db = getDb();
        const [dbUser] = await db.select().from(users).where(eq(users.email, user.email)).limit(1);
        if (dbUser) token.id = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
