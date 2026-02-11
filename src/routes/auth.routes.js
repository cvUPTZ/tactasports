import express from 'express';
import { login } from '../services/auth.service.js';

const router = express.Router();

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`[Auth] Login attempt for: ${username}`);
    try {
        const result = await login(username, password);
        console.log(`[Auth] Login result: ${result ? 'Success' : 'Failed'}`);

        if (!result) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json(result);
    } catch (err) {
        console.error('[Auth] Login error:', err);
        res.status(401).json({ error: err.message });
    }
});

export default router;
