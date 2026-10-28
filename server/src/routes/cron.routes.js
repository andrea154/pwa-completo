import {Router} from 'express';
import { reminders } from '../controllers/cron.controller.js';

const router = Router();
router.get("/reminders", reminders);
router.post("/reminders", reminders);

export default router;