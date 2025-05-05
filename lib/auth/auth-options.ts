import type { JwtPayload } from "@/lib/auth/jwt"
import type { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const jwtPayload: JwtPayload = {
          userId: user.id,
          email: user.email,
          role: user.role,
        }
        token = { ...token, ...jwtPayload }
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        id: token.userId as number,
        email: token.email as string,
        role: token.role as string,
      }
      return session
    },
  },
}
