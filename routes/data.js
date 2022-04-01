const MyError = require('./my_error')
const CheckType = require('./check_type')
const MyFile = require('./my_file')

//数据库数据
//形式
// [
//     {a:1,b:1},
//     {a:2,b:2}
// ]
let arr = [
    { a: 1, b: 1 },
    { a: 2, b: 2 },
    { a: 2, b: 2 }
]

class Data {
    _data = null;

    constructor(arr) {
        this.data = arr;
    }

    set data(value) {
        if (!CheckType.isArray(value)) {
            throw MyError.TYPE.NOT_ARRAY('value: ', value);
        }
        this._data = value;
    }
    get data() {
        return this._data;
    }

    changeRow(costomFunc) {

        for (let obj of this.data) {
            Object.setPrototypeOf(obj, Data.Row.prototype);
            costomFunc.call(obj);
        }
    }

    exportToFile(fileName) {

    }

    importFromFile(fileName) {
        this.data = MyFile.Json.read(fileName);
    }


    static Row = class {

        deleteAColumn(colName) {
            if (!CheckType.isString(colName)) {
                throw MyError.TYPE.NOT_STRING('column name: ', colName);
            }
            if (!this.hasOwnProperty(colName)) {
                throw MyError.PROP_NOT_EXISTS('column name: ', colName);
            }
            delete this[colName];
        }
        addAColumn(colName, value = null) {
            if (!CheckType.isString(colName)) {
                throw MyError.TYPE.NOT_STRING();
            }
            if (this.hasOwnProperty(colName)) {
                throw MyError.PROP_ALREADY_EXISTS('column name: ', colName);
            }
            this[colName] = value;
        }
        changeAColumn(colName, value) {
            if (!CheckType.isString(colName)) {
                throw MyError.TYPE.NOT_STRING();
            }
            if (!this.hasOwnProperty(colName)) {
                throw MyError.PROP_NOT_EXISTS('column name: ', colName);
            }
            if (value===undefined) {
                throw MyError.PARAM_IS_EMPTY(8);
            }
            this[colName] = value;
        }
    }
}
let data = new Data(arr);
data.changeRow(function () {
    this.changeAColumn('b')
});

// data.importFromFile('yugfvty0.txt')
console.log(data)
