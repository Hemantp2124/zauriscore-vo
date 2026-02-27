import 'dotenv/config';
import { OAuth2Client } from 'google-auth-library';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.VERCEL_URL || 'http://localhost:3000'}/auth/google/callback`
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    // Exchange code for tokens
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // Get user info
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { googleId },
      update: {
        email,
        name,
        avatarUrl: picture,
      },
      create: {
        googleId,
        email,
        name,
        avatarUrl: picture,
      },
    });

    // Generate session token (simplified - in production use JWT)
    const sessionToken = Buffer.from(JSON.stringify({
      userId: user.id,
      email: user.email,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    })).toString('base64');

    // Redirect to frontend with token
    const redirectUrl = `${process.env.FRONTEND_URL || 'https://zauriscore.vercel.app'}?token=${sessionToken}`;
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      details: error.message
    });
  }
}
