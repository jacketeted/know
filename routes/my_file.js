const fs = require('fs');
const MyError = require('./my_error')
class MyFile {
    static Json = class {
        static read(fileName) {
            if(!fs.existsSync(fileName)){
                throw MyError.FILE_NOT_EXISTS('filename: ',fileName)
            }
            return JSON.parse(fs.readFileSync(fileName));
        }
        static write(fileName,data) {
            if(fs.existsSync(fileName)){
                throw MyError.FILE_ALREADY_EXISTS('filename: ',fileName)
            }
            if(data===undefined){
                
            }
            return JSON.parse(fs.writeFileSync(fileName,));
        }

    }




}

module.exports=MyFile;