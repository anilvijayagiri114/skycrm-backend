import express from 'express';
const router = express.Router();
import { resetPassword } from '../controllers/authController.js';
// Reset password after OTP verification
import { Router } from 'express';
import { login, register, listUsers, getUserDetails, getUsersByRole, updateUserDetails, changePassword, sendRecoveryEmail, logout, deleteUser } from '../controllers/authController.js';
import { authRequired, permit } from '../middleware/auth.js';

// ...existing code...



// OTP email endpoint
router.post('/send_recovery_email', sendRecoveryEmail);
router.post('/login', login);
router.post('/logout',authRequired, logout);
router.post('/reset_password', resetPassword);
router.post('/register', authRequired, permit('Admin','Sales Manager'), register);
router.get('/users', authRequired, permit('Admin','Sales Manager'), listUsers);
router.post('/change-password', authRequired, changePassword);
router.post('/usersByRole', authRequired, permit('Admin'), getUsersByRole);
router.post('/getUserDetails', authRequired, permit('Admin'), getUserDetails);
router.put('/updateUser', authRequired, permit('Admin'), updateUserDetails);
router.delete('/deleteUser', authRequired, permit('Admin'), deleteUser);
export default router;
