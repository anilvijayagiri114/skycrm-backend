import { Router } from 'express';
import { authRequired, permit } from '../middleware/auth.js';
import { teamStats, teamMembersStats, myStats } from '../controllers/statsController.js';

const router = Router();
router.get('/team/:id', authRequired, permit('Admin','Sales Manager','Sales Team Lead'), teamStats);
router.get('/team/:id/members', authRequired, permit('Admin','Sales Manager','Sales Team Lead'), teamMembersStats);
router.get('/my', authRequired, permit('Sales Representatives'), myStats);

export default router;
