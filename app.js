const express = require('express');
const { router: knowRouter, init } = require('./routes/know');

let app = express();


app.use(express.static('public'));
app.use(express.urlencoded({
    extended: false,
    limit: '5mb'
}));
app.use('/know', knowRouter);


(async () => {
    await init();
    app.listen(9060);

})()
