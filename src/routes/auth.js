import express from 'express';
const router = express.Router();
import { resetPassword } from '../controllers/authController.js';
// Reset password after OTP verification
// import { login, register, changePassword, sendRecoveryEmail, logout} from '../controllers/authController.js';
import { login, register, changePassword, sendRecoveryEmail, logout, logoutBeacon, heartbeat, validateSession } from '../controllers/authController.js';
import { authRequired, permit } from '../middleware/auth.js';
import { listLogs } from '../controllers/logController.js';
import { generateReport } from '../controllers/reportController.js';

// ...existing code...



// OTP email endpoint
// router.post('/send_recovery_email', sendRecoveryEmail);
// router.post('/login', login);
// router.post('/logout',authRequired, logout);
// router.post('/reset_password', resetPassword);
// router.post('/register', authRequired, permit('Admin','Sales Manager'), register);
// router.post('/change-password', authRequired, changePassword);
// router.get('/logs',authRequired, permit('Admin','Sales Manager'), listLogs);

// export default router;
router.post('/send_recovery_email', sendRecoveryEmail);
router.post('/login', login);
router.post('/logout',authRequired, logout);
router.post('/logout-beacon', logoutBeacon);
router.post('/heartbeat', authRequired, heartbeat);
router.get('/validate-session', authRequired, validateSession);
router.post('/reset_password', resetPassword);
router.post('/register', authRequired, permit('Admin','Sales Manager'), register);
router.post('/change-password', authRequired, changePassword);
router.get('/logs',authRequired, permit('Admin','Sales Manager'), listLogs);
router.get('/report',authRequired, permit('Admin',"Sales Manager"), generateReport);
export default router;
