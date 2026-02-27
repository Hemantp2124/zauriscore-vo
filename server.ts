import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { GoogleGenAI, Type } from "@google/genai";
import { Resend } from 'resend';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const prisma = new PrismaClient();
const PORT = 3000;

// Initialize Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Initialize Gemini on Backend
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Initialize Google OAuth
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

async function startServer() {
  const app = express();
  app.use(cors());

  // Webhook must be defined before express.json() parser
  app.post('/webhook', express.raw({type: 'application/json'}), async (request, response) => {
    const sig = request.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error(`Webhook Signature Verification Failed: ${err.message}`);
      return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const customerEmail = session.customer_details?.email;
      const planType = session.metadata?.plan || 'single';
      const paymentStatus = session.payment_status;

      if (paymentStatus === 'paid' && customerEmail) {
        console.log(`✅ Payment verified for ${customerEmail}. Plan: ${planType}`);
        
        try {
          if (planType === 'lifetime') {
            await prisma.user.update({
              where: { email: customerEmail },
              data: { isPro: true }
            });
          } else {
            await prisma.user.update({
              where: { email: customerEmail },
              data: { credits: { increment: 1 } }
            });
          }
        } catch (dbError) {
          console.error("Database update failed after payment:", dbError);
        }
      }
    }

    response.json({received: true});
  });

  app.use(express.json({ limit: '50mb' })); 

  // ---------------------------------------------------------
  // Auth Routes (Google OAuth)
  // ---------------------------------------------------------

  app.get('/api/auth/google/url', (req, res) => {
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
    const url = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      redirect_uri: redirectUri,
    });
    res.json({ url });
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

    try {
      const { tokens } = await googleClient.getToken({
        code: code as string,
        redirect_uri: redirectUri,
      });
      googleClient.setCredentials(tokens);

      const userInfo = await googleClient.request({
        url: 'https://www.googleapis.com/oauth2/v3/userinfo',
      });

      const { email, name, picture } = userInfo.data as any;

      const user = await prisma.user.upsert({
        where: { email },
        update: { name, avatarUrl: picture },
        create: {
          email,
          name,
          avatarUrl: picture,
          preferences: {
            emailNotifications: true,
            marketingEmails: false,
            theme: 'light'
          }
        },
      });

      // Send success message to parent window and close popup
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  user: ${JSON.stringify(user)} 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Google Auth Error:', error);
      res.status(500).send('Authentication failed');
    }
  });

  // ---------------------------------------------------------
  // Marketing / Waitlist Routes
  // ---------------------------------------------------------

  app.post('/api/waitlist', async (req, res) => {
    const { email, source } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: "Invalid email address." });
    }

    try {
      const entry = await prisma.waitlist.upsert({
        where: { email },
        update: { source }, // Update source if they register again
        create: { email, source }
      });
          // Trigger Resend Email for 24-hour notification
      if (resend) {
          try {
              await resend.emails.send({
                  from: 'ZauriScore Beta <onboarding@resend.dev>', // Change to your verified domain in production
                  to: email,
                  subject: "You're on the list. 🤫 (ZauriScore Beta)",
                  html: `
                      <div style="font-family: sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                          <h2 style="color: #0f172a;">Founder,</h2>
                          <p>Stop building in the dark.</p>
                          <p>You're officially on the waitlist for ZauriScore. Because of high demand and to ensure our AI models maintain top-tier performance, we are currently operating in a strict closed beta.</p>
                          <p>We are rolling out invites in batches. <strong>Expect your private access link to be activated within the next 24 hours.</strong></p>
                          <p>Keep an eye on this inbox. You're almost in.</p>
                          <br/>
                          <p>- The ZauriScore Team</p>
                      </div>
                  `
              });
              console.log(`Sent beta waitlist email to ${email}`);
          } catch (emailErr) {
              console.error("Resend Email failed:", emailErr);
              // Don't fail the request if the email fails
          }
      }

      res.json({ success: true, id: entry.id });
    } catch (error) {
      console.error("Waitlist Error:", error);
      res.status(500).json({ error: "Failed to join waitlist." });
    }
  });

  // ---------------------------------------------------------
  // AI Routes (Secure Server-Side Calls)
  // ---------------------------------------------------------

  app.post('/api/analyze', async (req, res) => {
    const { idea, attachment, email } = req.body;

    try {
      // 1. SECURITY CHECK: Verify Credits if user is logged in
      if (email) {
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (!user) {
          return res.status(404).json({ error: "User account not found." });
        }

        if (!user.isPro && user.credits <= 0) {
          return res.status(403).json({ error: "Insufficient credits. Please upgrade or purchase more." });
        }
      }

      // 2. Perform Analysis
      const systemPrompt = `
        You are an expert startup advisor and product manager. Your goal is to provide honest, clear, and encouraging feedback to founders.
        Do not use hype. Do not use investor jargon. Be direct but kind.
        Analyze the user's startup idea. Return a structured validation report in JSON.
      `;

      const parts: any[] = [];
      if (attachment) {
        parts.push({
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.data
          }
        });
      }
      if (idea) parts.push({ text: idea });

      const modelName = attachment ? 'gemini-2.0-flash-exp' : 'gemini-2.0-flash-thinking-exp-1219';

      const response = await genAI.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summaryVerdict: { type: Type.STRING, enum: ["Promising", "Risky", "Needs Refinement"] },
              oneLineTakeaway: { type: Type.STRING },
              marketReality: { type: Type.STRING },
              pros: { type: Type.ARRAY, items: { type: Type.STRING } },
              cons: { type: Type.ARRAY, items: { type: Type.STRING } },
              competitors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    differentiation: { type: Type.STRING }
                  }
                }
              },
              monetizationStrategies: { type: Type.ARRAY, items: { type: Type.STRING } },
              whyPeoplePay: { type: Type.STRING },
              viabilityScore: { type: Type.INTEGER },
              nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      });

      const analysisResult = JSON.parse(response.text);

      // 3. TRANSACTION: Deduct Credit & Save Report (Server-Side Source of Truth)
      if (email) {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.findUnique({ where: { email } });
          
          if (!user) throw new Error("User not found");

          // Double check credit inside transaction
          if (!user.isPro && user.credits <= 0) {
             throw new Error("Insufficient credits");
          }

          // Deduct credit if not pro
          if (!user.isPro) {
            await tx.user.update({
              where: { email },
              data: { credits: { decrement: 1 } }
            });
          }

          // Save Report automatically
          await tx.report.create({
              data: {
                  userId: user.id,
                  originalIdea: idea || "Attachment Analysis",
                  summaryVerdict: analysisResult.summaryVerdict,
                  viabilityScore: analysisResult.viabilityScore,
                  oneLineTakeaway: analysisResult.oneLineTakeaway,
                  marketReality: analysisResult.marketReality,
                  fullReportData: analysisResult
              }
          });
        });
      }

      res.json(analysisResult);

    } catch (error: any) {
      console.error("Gemini/DB Error:", error);
      if (error.message === "Insufficient credits") {
          res.status(403).json({ error: "Insufficient credits." });
      } else {
          res.status(500).json({ error: error.message || "AI Analysis Failed" });
      }
    }
  });

  app.post('/api/chat', async (req, res) => {
      const { message, context } = req.body;
      
      try {
          const response = await genAI.models.generateContent({
              model: "gemini-2.0-flash-exp",
              contents: [{ parts: [{ text: message }] }],
              config: {
                  systemInstruction: `
                    Context: You are discussing a startup idea.
                    Idea: ${context.originalIdea}
                    Report Summary: ${JSON.stringify(context.report)}
                    Role: Helpful Co-founder.
                  `
              }
          });
          res.json({ text: response.text });
      } catch (error) {
          console.error("Chat Error:", error);
          res.status(500).json({ error: "Chat failed" });
      }
  });

  // ---------------------------------------------------------
  // User Routes
  // ---------------------------------------------------------

  app.post('/api/users/login', async (req, res) => {
    const { email, name } = req.body;
    try {
      const user = await prisma.user.upsert({
        where: { email },
        update: { name },
        create: { 
          email, 
          name,
          preferences: {
            emailNotifications: true,
            marketingEmails: false,
            theme: 'light'
          }
        },
      });
      res.json(user);
    } catch (error) {
      console.error("Login Error:", error);
      res.status(500).json({ error: 'Auth failed' });
    }
  });

  app.put('/api/users/:email', async (req, res) => {
    const { email } = req.params;
    const data = req.body;
    delete data.id;
    delete data.email;
    delete data.createdAt;
    delete data.credits; // Prevent client-side credit updates

    try {
      const user = await prisma.user.update({
        where: { email },
        data: data,
      });
      res.json(user);
    } catch (error) {
      console.error("Update User Error:", error);
      res.status(500).json({ error: 'Update failed' });
    }
  });

  // Admin/System endpoint
  app.post('/api/users/:email/deduct-credit', async (req, res) => {
    const { email } = req.params;
    try {
      const user = await prisma.user.update({
        where: { email },
        data: { credits: { decrement: 1 } },
      });
      res.json({ credits: user.credits });
    } catch (error) {
      res.status(500).json({ error: 'Credit deduction failed' });
    }
  });

  app.delete('/api/users/:email', async (req, res) => {
    const { email } = req.params;
    try {
      await prisma.user.delete({ where: { email } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Delete failed' });
    }
  });

  app.get('/api/reports/:email', async (req, res) => {
    const { email } = req.params;
    try {
      const user = await prisma.user.findUnique({ 
        where: { email },
        include: { 
          reports: { 
            orderBy: { createdAt: 'desc' } 
          } 
        }
      });

      if (!user) return res.status(404).json({ error: 'User not found' });

      const history = user.reports.map(r => ({
        ...(r.fullReportData as any), 
        id: r.id,
        createdAt: new Date(r.createdAt).getTime(),
        originalIdea: r.originalIdea
      }));

      res.json(history);
    } catch (error) {
      console.error("Fetch History Error:", error);
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  app.get('/api/verify-payment', async (req, res) => {
    const { session_id } = req.query;

    if (!session_id || typeof session_id !== 'string') {
      return res.status(400).json({ error: 'Missing session_id' });
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      
      if (session.payment_status === 'paid') {
          const email = session.customer_details?.email;
          const plan = session.metadata?.plan || 'single';
          
          if (email) {
              try {
                  if (plan === 'lifetime') {
                      await prisma.user.update({ where: { email }, data: { isPro: true } });
                  } else {
                      await prisma.user.update({ where: { email }, data: { credits: { increment: 1 } } });
                  }
              } catch (e) {
                  console.log("DB sync in verify endpoint skipped");
              }
          }

          return res.json({ 
              verified: true, 
              plan,
              customer_email: email
          });
      } else {
          return res.json({ verified: false, status: session.payment_status });
      }
    } catch (error: any) {
      console.error("Verify Error:", error.message);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite development middleware integrated.");
    } catch (e) {
      console.error("Failed to load Vite dev server:", e);
    }
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Server failed to start:", err);
  process.exit(1);
});
