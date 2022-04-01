
class MyError {

    static TYPE = class {
        static STR_NOT_ARRAY = 'type is not Array\n';
        static NOT_ARRAY(...msgs) { return new Error(this.STR_NOT_ARRAY + msgs.join('')) }

        static STR_NOT_STRING = 'type is not String\n';
        static NOT_STRING(...msgs) { return new Error(this.STR_NOT_STRING + msgs.join('')) }
    }
    static STR_PROP_NOT_EXISTS = `property not exists\n`;
    static PROP_NOT_EXISTS(...msgs) { return new Error(this.STR_PROP_NOT_EXISTS + msgs.join('')) }

    static STR_PROP_ALREADY_EXISTS = `property already exists\n`;
    static PROP_ALREADY_EXISTS(...msgs) { return new Error(this.STR_PROP_ALREADY_EXISTS + msgs.join('')) }

    static STR_FILE_NOT_EXISTS = `file not exists\n`;
    static FILE_NOT_EXISTS(...msgs) { return new Error(this.STR_FILE_NOT_EXISTS + msgs.join('')) }

    static STR_FILE_ALREADY_EXISTS = `file already exists\n`;
    static FILE_ALREADY_EXISTS(...msgs) { return new Error(this.STR_FILE_ALREADY_EXISTS + msgs.join('')) }

    static STR_PARAM_IS_EMPTY = `A parameter is empty\n`;
    static PARAM_IS_EMPTY(value, strValue) {
        if (value === undefined) {
            return new Error(`${this.STR_PARAM_IS_EMPTY}value: ${value} `)
        }
        if (strValue === undefined) {
            return new Error(`${this.STR_PARAM_IS_EMPTY}strValue: ${strValue} `)
        }
        return new Error(this.STR_PARAM_IS_EMPTY + strValue + ': ' + value)
    }

    static _BASE_STR_PARAM_IS_EMPTY(){
        
    }


}

module.exports = MyError;