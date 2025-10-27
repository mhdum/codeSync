// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebaseConfig";
import { getAuth } from "firebase-admin/auth";

// Extend NextAuth types for custom fields
declare module "next-auth" {
  interface Session {
    user?: {
      email?: string | null;
      role?: string;
      firebaseToken?: string;
    } | null;
  }

  interface User {
    email?: string | null;
    role?: string;
    firebaseToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    email: string;
    role?: string;
    firebaseToken?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // ---------- CREDENTIALS PROVIDER ----------
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "name@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const email = credentials.email.toLowerCase();
        const userRef = doc(db, "users", email);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          throw new Error("No user found with this email");
        }

        const userData = userSnap.data();

        const isValid = await bcrypt.compare(credentials.password, userData.password);
        if (!isValid) {
          throw new Error("Invalid password");
        }

        // ✅ Create a Firebase custom token (server-side signed)
        const customToken = await getAuth().createCustomToken(email, {
          role: userData.role || "user",
        });

        return {
          id: email,
          email,
          role: userData.role || "user",
          firebaseToken: customToken,
        };
      },
    }),

    // ---------- OAUTH PROVIDERS ----------
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/login",
  },

  callbacks: {
    // --- Add firebase token + role to JWT ---
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email ?? "";
        token.role = user.role;
        token.firebaseToken = user.firebaseToken;
      }
      return token;
    },

    // --- Add fields to session object ---
    async session({ session, token }) {
      if (token && session.user) {
        session.user.email = token.email;
        session.user.role = token.role;
        session.user.firebaseToken = token.firebaseToken;
      }
      return session;
    },

    // --- Handle OAuth sign-in ---
    async signIn({ user, account }) {
      try {
        if (!user.email) return false;

        const emailLower = user.email.toLowerCase();
        const userDocRef = doc(db, "users", emailLower);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
            email: emailLower,
            name: user.name || "",
            image: user.image || "",
            provider: account?.provider || "unknown",
            createdAt: new Date(),
          });
        }

        return true;
      } catch (error) {
        console.error("Error saving OAuth user:", error);
        return false;
      }
    },
  },
};

// ✅ Create NextAuth handler
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
