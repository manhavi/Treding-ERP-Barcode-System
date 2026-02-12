import express from 'express';
import jwt from 'jsonwebtoken';
import { StaffModel } from '../models/Staff';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Valid admin 6-digit code
const ADMIN_CODE = '130702';

// GET /api/auth/me - return current user from token (for connection check / session)
router.get('/me', authenticate, (req: AuthRequest, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
      userId: number;
      username?: string;
      role?: string;
    };
    return res.json({
      user: {
        id: decoded.userId,
        username: decoded.username ?? 'user',
        role: decoded.role ?? 'staff',
      },
    });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    // Normalize code: convert to string, remove all whitespace, and ensure it's exactly 6 digits
    const normalizedCode = String(code).trim().replace(/\s+/g, '');
    
    // Validate code format (must be exactly 6 digits)
    if (!/^\d{6}$/.test(normalizedCode)) {
      return res.status(400).json({ error: 'Code must be exactly 6 digits' });
    }

    // Check if admin code (strict string comparison)
    if (normalizedCode === ADMIN_CODE) {
      const token = jwt.sign(
        { userId: 1, username: 'admin', role: 'admin', code: code },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' } // 24 hours (much more than 3 hours minimum)
      );

      const response = { 
        token, 
        user: { 
          id: 1, 
          username: 'admin', 
          email: 'admin@aaradhyafashion.com',
          role: 'admin',
          company: null,
          hasBothCompanies: true,
          permissions: {
            purchase: true,
            inventory: true,
            dispatch: true,
            billing: true,
            parties: true,
            staff: true, // Admin can access staff management
          }
        } 
      };
      return res.json(response);
    }

    // Check if staff PIN
    let staffResult = null;
    try {
      staffResult = await StaffModel.findByPin(normalizedCode);
    } catch (staffError: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Staff PIN check error:', staffError.message);
      }
      if (staffError.message?.includes('not found') || staffError.message?.includes('ENOENT')) {
        return res.status(401).json({ error: 'Invalid code' });
      }
      return res.status(500).json({ error: 'Database error. Please try again.' });
    }
    
    if (!staffResult) {
      return res.status(401).json({ error: 'Invalid code' });
    }

    const { staff, company } = staffResult;

    // Check if both PINs are the same (staff has access to both companies)
    const hasBothCompaniesAccess = staff.pin_aaradhya === staff.pin_af_creation;

    const token = jwt.sign(
      { 
        userId: staff.id, 
        username: staff.name, 
        role: 'staff', 
        staffId: staff.id, 
        company: hasBothCompaniesAccess ? null : company, // null if both companies access
        hasBothCompanies: hasBothCompaniesAccess
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '3h' } // 3 hours minimum as requested
    );

    res.json({ 
      token, 
      user: { 
        id: staff.id, 
        username: staff.name, 
        email: `${staff.name.toLowerCase().replace(/\s+/g, '')}@staff.aaradhyafashion.com`,
        role: 'staff',
        company: hasBothCompaniesAccess ? null : company, // null means both companies
        hasBothCompanies: hasBothCompaniesAccess,
        permissions: {
          purchase: staff.can_access_purchase === 1,
          inventory: staff.can_access_inventory === 1,
          dispatch: staff.can_access_dispatch === 1,
          billing: staff.can_access_billing === 1,
          parties: staff.can_access_parties === 1,
          staff: false, // Staff cannot access staff management
        }
      } 
    });
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Login error:', error.message);
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
