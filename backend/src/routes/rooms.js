import express from 'express';
import { RoomRepo } from '../db/repository.js';

const router = express.Router();

// GET /api/rooms — all rooms
router.get('/', (req, res) => {
  res.json(RoomRepo.findAll());
});

// GET /api/rooms/available?checkIn=2026-02-25&checkOut=2026-02-28&guests=2&type=suite
router.get('/available', (req, res) => {
  const { checkIn, checkOut, guests, type } = req.query;
  if (!checkIn || !checkOut) {
    return res.status(400).json({ error: 'checkIn and checkOut are required' });
  }
  const available = RoomRepo.findAvailable(checkIn, checkOut, guests ? parseInt(guests) : null, type);
  res.json({ available, count: available.length, checkIn, checkOut });
});

// GET /api/rooms/:id
router.get('/:id', (req, res) => {
  const room = RoomRepo.findById(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

export default router;
