// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import GitHubProvider from "next-auth/providers/github"
import { getAllUsers, getUserByEmail } from "@/lib/fakeDB"

// Temporary in-memory users array (server-side)

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        getAllUsers();
        console.log("All users:", getAllUsers());
        
        if (!credentials) return null
        console.log("Credentials received:", credentials);
        // Check users in-memory
        const user = getUserByEmail(credentials.email)
        if (!user) throw new Error("No user found")
        if (user.password !== credentials.password) throw new Error("Invalid password")
        
        return { id: user.email, email: user.email }
      }
    }

),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!
    })
  ],
  session: { strategy: "jwt" as const },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" }
}

const handler = NextAuth(authOptions)

// App Router requires named exports for HTTP methods
export { handler as GET, handler as POST }
