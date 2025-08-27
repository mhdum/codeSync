import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user?: {
      email?: string | null
    } & DefaultSession["user"]
  }
}
