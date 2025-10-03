import { Router } from 'express';
import { authRequired, permit } from '../middleware/auth.js';
import { createTeam, listTeams, addMembers, setLead, deleteTeam, editTeam, getTeamDetailsForLead} from '../controllers/teamController.js';

const router = Router();

// Important: /my-team route should be before any parameterized routes to avoid conflicts
router.get('/my-team', authRequired, permit('Admin', 'Sales Team Lead'), getTeamDetailsForLead);

router.post('/', authRequired, permit('Admin','Sales Manager'), createTeam);
router.get('/', authRequired, listTeams);
router.post('/:id/members', authRequired, permit('Admin','Sales Manager'), addMembers);
router.post('/:id/lead', authRequired, permit('Admin','Sales Manager'), setLead);
router.delete('/:id', authRequired, permit('Admin','Sales Manager'), deleteTeam);
router.put('/:id',authRequired, permit('Admin','Sales Manager'), editTeam);

export default router;
