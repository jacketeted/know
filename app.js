const express=require('express');
const knowRouter=require('./routes/know');

let app=express();


app.use(express.static('public'));
app.use(express.urlencoded({
    extended:false,
    limit:'5mb'
}))
app.use('/know',knowRouter);



app.listen(8060);