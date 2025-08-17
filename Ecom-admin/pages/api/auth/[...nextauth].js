import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from 'next-auth';

const adminEmails = ['sammy@gmail.com']; // Add the hardcoded admin email here

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "your-email@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Hardcoded user data for authentication
        const hardcodedUser = {
          id: "1",
          name: "Test User",
          email: "sammy@gmail.com",
          password: "sammy90" // Hardcoded password
        };

        // Check if the provided credentials match the hardcoded user
        if (
          credentials.email === hardcodedUser.email &&
          credentials.password === hardcodedUser.password
        ) {
          // If credentials are correct, return the user object
          return {
            id: hardcodedUser.id,
            name: hardcodedUser.name,
            email: hardcodedUser.email
          };
        } else {
          // If credentials don't match, return null
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/auth/signin', // Redirect to a custom sign-in page if needed
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Persist the user's id to the token right after signin
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Add the user id to the session
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email; // Include email in the session
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET, // Add the secret here
};

export default NextAuth(authOptions);

export async function isAdminRequest(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!adminEmails.includes(session?.user?.email)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}
