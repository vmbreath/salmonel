const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require("fs");
const pool = require('../db');
const { validateToken } = require('../authUtils');
const dataParser = require('../dataParser');
const zipUtils = require("../zipUtils");

const upload = multer({dest: 'uploads/'});

router.post("/uploadtable", upload.single('table'), async (request, response, next) => {
    try {
        await dataParser.processLineByLine(request.file.path);

        const gz = await zipUtils.gzip(fs.readFileSync(request.file.path));
        const sql = `INSERT INTO files (name, date, compress_type, data)
                     VALUES ($1, $2, $3, $4);`;
        await pool.query(sql, [
            request.file.originalname,
            new Date(),
            'gz',
            gz,
        ]);

        response.send('file loaded');
    } catch (err) {
        next(err);
    }
});

router.get("/files", async (req, res, next) => {
    try {
        const token = req.headers.token || req.cookies.token;
        const user = await validateToken(token);
        if (!user) {
            res.sendStatus(403);
            return;
        }
        const files = await pool.query('select id, name, date, compress_type from files');
        res.json(files.rows);
    } catch (err) {
        next(err);
    }
});

router.get("/files/:id/data", async (req, res, next) => {
    try {
        const token = req.headers.token || req.cookies.token;
        const user = await validateToken(token);
        if (!user) {
            res.sendStatus(403);
            return;
        }
        const id = req.params.id;
        const files = await pool.query('select name, compress_type, data  from files where id= $1', [id]);
        if (files.rows.length === 0) {
            res.sendStatus(404);
            return;
        }

        let file = files.rows[0];
        if (file.compress_type && file.compress_type === 'gz') {
            res.setHeader('Content-Encoding', 'gzip');
        }
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);

        res.send(file.data);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
