import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authRequired, permit } from '../middleware/auth.js';
import { listLeads, getLead, createLead, updateLead, changeStatus, addNote, createFollowUp, listFollowUps, uploadAttachment, importLeads,  bulkAssignLeads } from '../controllers/leadController.js';

const router = Router();

router.get('/', authRequired, listLeads);
router.get('/:id', authRequired, getLead);
router.post('/', authRequired, permit('Admin','Sales Manager'), createLead);
router.put('/:id', authRequired, updateLead);
router.post('/:id/status', authRequired, changeStatus);
router.post('/:id/notes', authRequired, addNote);
router.post('/:id/followups', authRequired, createFollowUp);
router.get('/:id/followups', authRequired, listFollowUps);

// uploads
const storage = multer.diskStorage({
  destination: (req,file,cb) => cb(null, path.join(process.cwd(), 'backend', 'uploads')),
  filename: (req,file,cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g,'_'))
});
const upload = multer({ storage });
const memoryUpload = multer({ storage: multer.memoryStorage() });
router.post('/:id/attachments', authRequired, upload.single('file'), uploadAttachment);
router.post('/import/csv', authRequired, permit('Admin','Sales Manager'), memoryUpload.single('file'), importLeads);
router.post('/bulk-assign', authRequired, permit('Admin','Sales Manager'), bulkAssignLeads);
router.delete('/:id', authRequired, permit('Admin','Sales Manager'), async (req, res) => {
  try {
    const lead = await (await import('../models/Lead.js')).default.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

export default router;
