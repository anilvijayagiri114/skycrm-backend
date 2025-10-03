import { Router } from 'express';
import { getRoleIdByName, listRoles } from '../controllers/roleController.js';
import { authRequired, permit } from '../middleware/auth.js';
const router = Router();
router.get('/getRoleId', getRoleIdByName);
router.get('/', authRequired, permit('Admin'), listRoles);
export default router;
