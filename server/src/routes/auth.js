const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { Resend } = require('resend');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const userSelect = { id: true, email: true, phone: true, name: true, avatar: true, role: true, plan: true, trialEndsAt: true, planExpiresAt: true, createdAt: true };

function generateToken(userId) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, process.env.REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

// Register (email or phone)
router.post('/register', async (req, res) => {
  try {
    const { email, phone, password, name } = req.body;
    if (!password || !name) {
      return res.status(400).json({ error: 'Name and password are required' });
    }
    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone number is required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (phone && !/^(\+92|0)?3[0-9]{9}$/.test(phone.replace(/[\s-]/g, ''))) {
      return res.status(400).json({ error: 'Invalid Pakistani phone number (e.g. 03001234567)' });
    }

    // Check duplicates
    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (existingEmail) return res.status(400).json({ error: 'Email already registered' });
    }
    if (phone) {
      const cleanPhone = phone.replace(/[\s-]/g, '');
      const existingPhone = await prisma.user.findUnique({ where: { phone: cleanPhone } });
      if (existingPhone) return res.status(400).json({ error: 'Phone number already registered' });
    }

    // First user becomes admin
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'USER';

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email ? email.toLowerCase().trim() : null,
        phone: phone ? phone.replace(/[\s-]/g, '') : null,
        password: hashedPassword,
        name: name.trim(),
        role,
        plan: 'FREE',
        trialEndsAt,
      },
      select: userSelect,
    });

    // Auto-create organization and add user as OWNER
    const org = await prisma.organization.create({
      data: {
        ownerId: user.id,
        name: name.trim() + "'s Business",
      },
    });

    await prisma.teamMember.create({
      data: {
        orgId: org.id,
        userId: user.id,
        teamRole: 'OWNER',
      },
    });

    const { accessToken, refreshToken } = generateToken(user.id);
    res.status(201).json({
      user: {
        ...user,
        teamRole: 'OWNER',
        organization: { id: org.id, name: org.name, logo: null },
      },
      token: accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login (email or phone)
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/phone and password are required' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const isEmail = cleanIdentifier.includes('@');

    let user;
    if (isEmail) {
      user = await prisma.user.findUnique({ where: { email: cleanIdentifier } });
    } else {
      const cleanPhone = identifier.replace(/[\s-]/g, '');
      user = await prisma.user.findUnique({ where: { phone: cleanPhone } });
    }

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated. Contact admin.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get team membership info
    const membership = await prisma.teamMember.findFirst({
      where: { userId: user.id, isActive: true },
      include: { organization: { select: { id: true, name: true, logo: true } } },
    });

    const { accessToken, refreshToken } = generateToken(user.id);
    res.json({
      user: {
        id: user.id, email: user.email, phone: user.phone, name: user.name,
        avatar: user.avatar, role: user.role, plan: user.plan,
        trialEndsAt: user.trialEndsAt, planExpiresAt: user.planExpiresAt,
        teamRole: membership?.teamRole || null,
        organization: membership?.organization || null,
      },
      token: accessToken,
      refreshToken,
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Google OAuth callback — verify ID token server-side
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID in .env' });
    }

    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(clientId);

    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const { sub: googleId, email, name, picture: avatar } = payload;
    if (!email) {
      return res.status(400).json({ error: 'Google account has no email' });
    }

    let user = await prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, avatar: avatar || user.avatar },
          select: userSelect,
        });
      } else {
        const userCount = await prisma.user.count();
        const role = userCount === 0 ? 'ADMIN' : 'USER';
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);

        user = await prisma.user.create({
          data: {
            email: email.toLowerCase(),
            name: name || email.split('@')[0],
            avatar,
            googleId,
            role,
            plan: 'FREE',
            trialEndsAt,
          },
          select: userSelect,
        });

        const org = await prisma.organization.create({
          data: { ownerId: user.id, name: (name || 'My') + "'s Business" },
        });
        await prisma.teamMember.create({
          data: { orgId: org.id, userId: user.id, teamRole: 'OWNER' },
        });
      }
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatar: avatar || user.avatar },
        select: userSelect,
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const membership = await prisma.teamMember.findFirst({
      where: { userId: user.id, isActive: true },
      include: { organization: { select: { id: true, name: true, logo: true } } },
    });

    const { accessToken, refreshToken } = generateToken(user.id);
    res.json({
      user: { ...user, teamRole: membership?.teamRole || null, organization: membership?.organization || null },
      token: accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Google login failed' });
  }
});

// Get current user with org info
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: userSelect,
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Get active team membership
    const membership = await prisma.teamMember.findFirst({
      where: { userId: req.userId, isActive: true },
      include: { organization: { select: { id: true, name: true, logo: true } } },
    });

    res.json({
      ...user,
      teamRole: membership?.teamRole || null,
      organization: membership?.organization || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name: name.trim(), avatar },
      select: userSelect,
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user.password) {
      return res.status(400).json({ error: 'Account uses Google login. Set a password first.' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.userId }, data: { password: hashed } });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Forgot password - generate reset code
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, phone } = req.body;
    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone is required' });
    }

    let user;
    if (email) {
      user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    } else if (phone) {
      const cleanPhone = phone.replace(/[\s-]/g, '');
      user = await prisma.user.findUnique({ where: { phone: cleanPhone } });
    }

    if (!user) {
      return res.status(404).json({ error: 'No account found with that email/phone' });
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Delete any existing reset tokens for this user
    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: code,
        expiresAt,
      },
    });

    // Send code via email if available
    if (user.email && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'ExpenseFlow <onboarding@resend.dev>',
          to: user.email,
          subject: 'Your password reset code',
          html: `<p>Your password reset code is: <strong>${code}</strong></p><p>This code expires in 15 minutes.</p>`,
        });
      } catch (emailErr) {
        console.error('Failed to send reset email:', emailErr.message);
      }
    } else if (user.phone) {
      // TODO: Send SMS via Twilio or similar service
      console.log(`[SMS TODO] Send reset code ${code} to ${user.phone}`);
    }

    res.json({ message: 'Password reset code sent. Check your email or phone.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process forgot password request' });
  }
});

// Reset password with code
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const resetRecord = await prisma.passwordReset.findUnique({ where: { token } });

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }
    if (resetRecord.used) {
      return res.status(400).json({ error: 'Reset code has already been used' });
    }
    if (new Date() > resetRecord.expiresAt) {
      return res.status(400).json({ error: 'Reset code has expired' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword },
    });

    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token is required' });

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET || process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') return res.status(401).json({ error: 'Invalid token type' });

    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, isActive: true } });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Account not found or deactivated' });

    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ token: accessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

module.exports = router;
