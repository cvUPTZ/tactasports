import express from 'express';
import * as authService from '../services/auth.service.js';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All user routes require admin role
router.use(authMiddleware);
router.use(roleMiddleware(['admin']));

// Get all users
router.get('/', async (req, res) => {
    try {
        const users = await authService.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new user
router.post('/', async (req, res) => {
    try {
        const result = await authService.addUser(req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update user
router.put('/:username', async (req, res) => {
    try {
        const result = await authService.updateUser(req.params.username, req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete user
router.delete('/:username', async (req, res) => {
    try {
        const result = await authService.deleteUser(req.params.username);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
