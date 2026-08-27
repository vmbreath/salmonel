const crypto = require('crypto');
const pool = require('./db');

const createToken = (user) => {
    const data = user.login;
    const sign = crypto.createHash('sha256').update(data).update(user.password).digest('hex');
    return `${data}|${sign}`;
};

const validateToken = async (token) => {
    if (!token) return null;
    let parts = token.split('|');
    if (parts.length !== 2) return null;
    const data = parts[0];
    const sign = parts[1];
    
    try {
        const res = await pool.query('select * from user_account WHERE login = $1', [data]);

        if (res.rows.length === 0) {
            return null;
        }

        const user = res.rows[0];
        if (sign !== crypto.createHash('sha256').update(data).update(user.password).digest('hex')) {
            return null;
        }

        return user;
    } catch (err) {
        console.error("Token validation error:", err);
        return null;
    }
};

module.exports = {
    createToken,
    validateToken
};
