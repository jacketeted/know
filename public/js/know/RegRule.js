
$.know.RegRule = class {
    constructor(uniqueWord) {
        this.regExpStrings = [];
        this.map = [];
        this.caches = [];
        this.uniqueWord = uniqueWord;
    }

    set(groupName, regExp, callback) {
        regExp instanceof RegExp && (regExp = regExp.source);
        this.regExpStrings.push(`(?<${groupName}>${regExp})`);
        this.map.push({ groupName, callback })
        return this;
    }

    save() {

        this.regExp = new RegExp(this.regExpStrings.join('|'), 'g');
    }

    execute(text, obj) {

        return text.replaceAll(this.regExp, function (keyword,...args) {
            let groups = args[args.length - 1];
            // let groups = arguments[arguments.length - 1];


            let resText = this.getResultText(groups, keyword, obj);

            return resText;
        }.bind(this))

    }

    getResultText(groups, keyword, obj) {
        let resText;
        this.map.some((elem) => {
            if (groups[elem.groupName] !== undefined) {
                resText = elem.callback(keyword, obj);

                return true;
            }
            return false;
        })
        return resText;
    }

    borrow(text, obj) {
        if(!this.uniqueWord) throw new Error('借的时候必须设置唯一识别码');
        this.caches = [];

        return text.replaceAll(this.regExp, function (keyword,...args) {
            let groups = args[args.length - 1];
            // let groups = arguments[arguments.length - 1];

            this.caches.push(this.getResultText(groups, keyword, obj))
            return this.uniqueWord;
        }.bind(this))

    }
    giveback(text) {
        let i = 0;
        return text.replaceAll(this.uniqueWord, () => {
            return this.caches[i++];
        })
    }

}
