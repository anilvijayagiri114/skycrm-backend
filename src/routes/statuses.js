import { Router } from 'express';
import { listStatuses } from '../controllers/statusController.js';
import { authRequired } from '../middleware/auth.js';
const router = Router();
router.get('/', authRequired, listStatuses);
export default router;
