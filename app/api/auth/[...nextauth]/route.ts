import NextAuth from "next-auth";
// import CredentialsProvider from "next-auth/providers/credentials";
// import GoogleProvider from "next-auth/providers/google";
// import FacebookProvider from "next-auth/providers/facebook";
// import GitHubProvider from "next-auth/providers/github";
// import bcrypt from "bcryptjs";
// import { adminDb } from "@/lib/firebaseAdmin"; // ✅ using Admin SDK
import { authOptions } from "@/lib/authOptions";

// export const authOptions = {
//   providers: [
//     CredentialsProvider({
//       name: "Credentials",
//       credentials: {
//         email: { label: "Email", type: "text" },
//         password: { label: "Password", type: "password" },
//       },
//       async authorize(credentials) {
//         if (!credentials?.email || !credentials?.password) return null;

//         const email = credentials.email.toLowerCase();

//         // ✅ Fetch user from Firestore via Admin SDK
//         const userRef = adminDb.collection("users").doc(email);
//         const userSnap = await userRef.get();

//         if (!userSnap.exists) throw new Error("No user found");

//         const userData = userSnap.data();
//         const isValid = await bcrypt.compare(
//           credentials.password,
//           userData?.password
//         );

//         if (!isValid) throw new Error("Invalid password");

//         return { id: email, email };
//       },
//     }),

//     GoogleProvider({
//       clientId: process.env.GOOGLE_CLIENT_ID!,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//     }),
//     FacebookProvider({
//       clientId: process.env.FACEBOOK_CLIENT_ID!,
//       clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
//     }),
//     GitHubProvider({
//       clientId: process.env.GITHUB_CLIENT_ID!,
//       clientSecret: process.env.GITHUB_CLIENT_SECRET!,
//     }),
//   ],

//   session: { strategy: "jwt" as const },
//   secret: process.env.NEXTAUTH_SECRET,
//   pages: { signIn: "/login" },

//   callbacks: {
//     async signIn({
//       user,
//       account,
//     }: {
//       user: User;
//       account: Account | null;
//       profile?: Profile;
//     }) {
//       try {
//         if (!user.email) return false;

//         const emailLower = user.email.toLowerCase();
//         const userRef = adminDb.collection("users").doc(emailLower);
//         const userSnap = await userRef.get();

//         // ✅ Create new user doc if not found (for OAuth)
//         if (!userSnap.exists) {
//           await userRef.set({
//             email: emailLower,
//             name: user.name || "",
//             image: user.image || "",
//             provider: account?.provider || "unknown",
//             createdAt: new Date(),
//           });
//         }

//         return true;
//       } catch (error) {
//         console.error("Error storing OAuth user:", error);
//         return false;
//       }
//     },
//   },
// };

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
