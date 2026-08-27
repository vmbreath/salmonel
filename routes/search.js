const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get("/test", (request, response, next) => {
    pool.query('SELECT * FROM salmonel;', (err, res) => {
        if (err) return next(err);
        response.json(res.rows);
    });
});

router.get("/filter", (request, response, next) => {
    try {
        const filter = JSON.parse(request.query.filter);
        let sql = 'SELECT * FROM salmonel WHERE 1=1 ';
        let args = [];
        const doSqlAndArgs = (antigen, it) => {
            args.push(it);
            sql += ` and ((${antigen} ? \$${args.length})`;
            args.push('%,' + it + ',%');
            sql += ` or (${antigen}::text like \$${args.length})`;
            args.push('%(' + it + ',%');
            sql += ` or (${antigen}::text like \$${args.length})`;
            args.push('%,' + it + ')%');
            sql += ` or (${antigen}::text like \$${args.length})`;
            args.push('%(' + it + ')%');
            sql += ` or (${antigen}::text like \$${args.length})`;
            args.push('%{' + it + ',%');
            sql += ` or (${antigen}::text like \$${args.length})`;
            args.push('%,' + it + '}%');
            sql += ` or (${antigen}::text like \$${args.length})`;
            args.push('%{' + it + '}%');
            sql += ` or (${antigen}::text like \$${args.length})`;
            args.push('%[' + it + ',%');
            sql += ` or (${antigen}::text like \$${args.length})`;
            args.push('%,' + it + ']%');
            sql += ` or (${antigen}::text like \$${args.length})`;
            args.push('%[' + it + ']%');
            sql += ` or (${antigen}::text like \$${args.length}))`;
        };
        
        filter.find.OAntigen.forEach(it => doSqlAndArgs('o_antigen', it));
        filter.find.H1Antigen.forEach(it => doSqlAndArgs('h_antigen1', it));
        filter.find.H2Antigen.forEach(it => doSqlAndArgs('h_antigen2', it));
        
        filter.exclude.OAntigen.forEach(it => {
            args.push(it);
            sql += ` and not (o_antigen ? \$${args.length})`;
        });
        filter.exclude.H1Antigen.forEach(it => {
            args.push(it);
            sql += ` and not (h_antigen1 ? \$${args.length})`;
        });
        filter.exclude.H2Antigen.forEach(it => {
            args.push(it);
            sql += ` and not (h_antigen2 ? \$${args.length})`;
        });
        
        pool.query(sql, args, (err, res) => {
            if (err) return next(err);
            response.json(res.rows);
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
