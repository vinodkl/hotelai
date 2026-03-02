import express from 'express';
import { GuestRepo } from '../db/repository.js';

const router = express.Router();

// GET /api/guests
router.get('/', (req, res) => {
  res.json(GuestRepo.findAll());
});

// GET /api/guests/:id  (includes reservation history)
router.get('/:id', (req, res) => {
  const guest = GuestRepo.findWithReservations(req.params.id);
  if (!guest) return res.status(404).json({ error: 'Guest not found' });
  res.json(guest);
});

export default router;
