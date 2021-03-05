const {Pool} = require('pg');
const fs = require('fs');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});
exports.createTableSalmonel = (pool) => {
    pool.query(`CREATE TABLE if not exists salmonel (
                id serial primary key,
                allgroups TEXT NOT NULL,
                serovar TEXT NOT NULL,
                o_antigen jsonb NOT NULL,
                h_antigen1 jsonb NOT NULL,
                h_antigen2 jsonb NOT NULL
            );`, (err, res) => {
        if (err) throw err;

        pool.query('SELECT count(*) as count FROM salmonel;', (err, res) => {
            if (err) throw err;

            console.log('SELECT count(*) as count FROM salmonel: ', res.rows)

            if (res.rows[0].count == '0') {
                const sql = `INSERT INTO salmonel (allgroups, serovar, o_antigen, h_antigen1, h_antigen2)
                         VALUES ($1, $2, $3, $4, $5);`;
                const insertRow = (data, row, index) => {
                    console.log('insertRow  ', row);
                    pool.query(sql, [
                        row[0],
                        row[1],
                        JSON.stringify(row[2]),
                        JSON.stringify(row[3]),
                        JSON.stringify(row[4]),
                    ], (err, res) => {
                        if (err) {
                            return console.log(err.message);
                        }
                        if (data[index + 1] !== undefined) {
                            insertRow(data, data[index + 1], index + 1);
                        }
                    })
                };
                let rawdata = fs.readFileSync('./createTables/Data.js');
                let Data = JSON.parse(rawdata);
                insertRow(Data, Data[0], 0);
            }
        });
    });
}