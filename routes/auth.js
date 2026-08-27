const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db');
const { createToken, validateToken } = require('../authUtils');

router.post("/login", (request, response, next) => {
    const userName = request.body.userName;
    const password = request.body.password;
    pool.query('select * from user_account WHERE login = $1', [userName], (err, res) => {
        if (err) return next(err);
        
        if (res.rows.length === 0) {
            response.sendStatus(404);
            return;
        }

        const user = res.rows[0];

        if (user.password !== crypto.createHash('sha256').update(password).update(user.salt).digest('hex')) {
            response.sendStatus(403);
            return;
        }

        response.json({token: createToken(user)});
    });
});

router.post("/verifier", async (request, response, next) => {
    try {
        const token = request.headers.token || request.cookies.token;
        const user = await validateToken(token);
        if (!user) {
            response.sendStatus(403);
            return;
        }
        response.cookie('token', token, {
            maxAge: 86400 * 1000, // 24 hours
            httpOnly: true, // http only, prevents JavaScript cookie access
            secure: true // cookie must be sent over https / ssl
        });
        response.json({data: 'ololo'});
    } catch (err) {
        next(err);
    }
});

module.exports = router;
