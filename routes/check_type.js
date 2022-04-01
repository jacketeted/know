class CheckType {
    static isString(value) {
        return typeof value === 'string' || value instanceof String;
    }
    static isArray(value) {
        return Array.isArray(value);
    }



}

module.exports = CheckType;