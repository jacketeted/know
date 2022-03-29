const mysql=require('mysql');

const database='abcd';

let pool=mysql.createPool({
    host:'127.0.0.1',
    port:3306,
    user:'root',
    password:'',
    database,
    connectionLimit:15
})

pool.database=database;

module.exports=pool;

