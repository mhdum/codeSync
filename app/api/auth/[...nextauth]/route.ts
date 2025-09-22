// app/api/auth/[...nextauth]/route.ts
import NextAuth, { Account, Profile, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig"; // make sure the path is correct

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      const email = credentials.email.toLowerCase(); // normalize
      const userDocRef = doc(db, "users", email);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) throw new Error("No user found");

      const userData = userDocSnap.data();

      const isValid = await bcrypt.compare(credentials.password, userData.password);
      if (!isValid) throw new Error("Invalid password");

      return { id: email, email };
    }

  }),

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
  pages: { signIn: "/login" },
callbacks: {
    async signIn({
      user,
      account,
      profile,
      email,
      credentials,
    }: {
      user: User;
      account: Account | null;
      profile?: Profile;
      email?: { verificationRequest?: boolean } | null;
      credentials?: Record<string, any> | undefined;
    }) {
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
        console.error("Error storing OAuth user:", error);
        return false;
      }
    },
  },
};

const handler = NextAuth(authOptions);

// App Router requires named exports for HTTP methods
export { handler as GET, handler as POST };
