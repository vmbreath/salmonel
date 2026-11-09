const express = require('express');
const pool = require('./db');
const app = express();
app.disable('x-powered-by');
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');next();});
app.set('query parser','simple');
app.use((req,res,next)=>{if(!['GET','HEAD'].includes(req.method))return res.status(403).json({error:'Read-only search'});next();});
app.use(express.static(__dirname+'/public',{dotfiles:'deny'}));
app.get('/healthz',async(req,res)=>{try {const r=await pool.query('SELECT count(*)::int AS count FROM salmonel');res.json({status:'ok',records:r.rows[0].count});}catch(e){res.status(503).json({status:'unavailable'});}});
app.use('/',require('./routes/search'));
app.use((req,res)=>res.status(403).json({error:'Administration and file operations disabled in private pilot'}));
app.use((err,req,res,next)=>res.status(400).json({error:'Invalid request'}));
async function start(){
 await pool.query('SELECT count(*) FROM salmonel');
 app.listen(3000,'0.0.0.0',()=>console.log('Private pilot listening'));
}
start().catch(()=>{console.error('Database initialization failed');process.exit(1);});
