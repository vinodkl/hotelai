import express from 'express';
import { ReservationRepo } from '../db/repository.js';

const router = express.Router();

// GET /api/reservations?status=confirmed
router.get('/', (req, res) => {
  const { status } = req.query;
  res.json(ReservationRepo.findAll({ status }));
});

// GET /api/reservations/upcoming
router.get('/upcoming', (req, res) => {
  const days = req.query.days ? parseInt(req.query.days) : 7;
  res.json(ReservationRepo.findUpcoming(days));
});

// GET /api/reservations/today-checkins  
router.get('/today-checkins', (req, res) => {
  res.json(ReservationRepo.findTodayCheckIns());
});

// GET /api/reservations/:id
router.get('/:id', (req, res) => {
  const reservation = ReservationRepo.findById(req.params.id);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
  res.json(reservation);
});

// POST /api/reservations
router.post('/', (req, res) => {
  try {
    const reservation = ReservationRepo.create(req.body);
    res.status(201).json(reservation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/reservations/:id/cancel
router.patch('/:id/cancel', (req, res) => {
  try {
    const reservation = ReservationRepo.cancel(req.params.id);
    res.json(reservation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/reservations/:id/status
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status is required' });
  try {
    const reservation = ReservationRepo.updateStatus(req.params.id, status);
    res.json(reservation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
