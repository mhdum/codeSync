import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { adminDb } from "@/lib/firebaseAdmin";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase();
        const userRef = adminDb.collection("users").doc(email);
        const userSnap = await userRef.get();

        if (!userSnap.exists) throw new Error("No user found");

        const userData = userSnap.data();
        const isValid = await bcrypt.compare(
          credentials.password,
          userData?.password
        );

        if (!isValid) throw new Error("Invalid password");

        return { id: email, email };
      },
    }),

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

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },

  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      const emailLower = user.email.toLowerCase();
      const userRef = adminDb.collection("users").doc(emailLower);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        await userRef.set({
          email: emailLower,
          name: user.name || "",
          image: user.image || "",
          provider: account?.provider || "unknown",
          createdAt: new Date(),
        });
      }

      return true;
    },
  },
};
