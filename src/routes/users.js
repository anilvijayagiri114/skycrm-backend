import express from 'express';
import { listUsers, getUserDetails, getUsersByRole, updateUserDetails, deleteUser } from '../controllers/userController.js';
import { authRequired, permit } from '../middleware/auth.js';
const router = express.Router();

router.get('/', authRequired, permit('Admin','Sales Manager'), listUsers);
router.get('/paginationUsersList',authRequired, permit('Admin','Sales Manager'), listUsers);
router.post('/usersByRole', authRequired, permit('Admin'), getUsersByRole);
router.post('/getUserDetails', authRequired, permit('Admin'), getUserDetails);
router.put('/updateUser', authRequired, permit('Admin'), updateUserDetails);
router.delete('/deleteUser', authRequired, permit('Admin'), deleteUser);
export default router;
