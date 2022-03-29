let htmlTabColorRule = new $.know.RegRule();

htmlTabColorRule.set('tab', /<[\u4e00-\u9fa5\w-]+/, (kw) => {
    return `&lt;<span class="keyword">${kw.slice(1)}</span>`;
})
htmlTabColorRule.set('attribute', /\b[\w-]+(?= *=)/, (kw) => {
    return `<span class="attribute">${kw}</span>`
})
htmlTabColorRule.set('value', /".*?"/, (kw) => {
    return `<span class="value">${kw}</span>`;
})

htmlTabColorRule.save();




let colorRule = new $.know.RegRule('ab敋')


//先处理注释的颜色
colorRule.set('comment', /\/\/.*(?=\n|$)/, (kw) => {
    return `<span class="comment">${kw}</span>`;
})

colorRule.set('keyword', /\b(function|let|new|null|class|async)\b/, (kw) => {
    return `<span class="keyword">${kw}</span>`;
})

colorRule.set('htmlTab', /<[^/!][^>]*(?=>)/, (kw) => {
    return htmlTabColorRule.execute(kw);
})

colorRule.set('htmlCloseTab', /<[/][^>]+(?=>)/, (kw) => {
    return `&lt;/<span class="keyword">${kw.slice(2)}</span>`;
})

colorRule.set('reserved', /\b(return|if|else|while|var)\b/, (kw) => {
    return `<span class="reserved">${kw}</span>`
})



colorRule.save();



$.know.Code = function (text) {
    return new $.know.Code.init(text);
}
$.know.Code.init = class {
    constructor(text) {
        this.text = text;
    }
    color() {

        this.text = colorRule.execute(this.text);
        return this;

    }

    colorRule(groupName, regExp, callBack) {
        let fullRegExp = `(?<${groupName}>${regExp})`;

        //这个arr要放在static中
        let arr = [];
        arr.push({ regExp: fullRegExp, groupName, callBack });

        //有满足条件的了就不再遍历
        arr.some()

    }

    toString() {
        return this.text;
    }

    transSignToHtml() {
        //此处加入了去除前后置换行符的功能
        //^\n+|\n+$必须放在前面
        this.text = this.text.replaceAll(/[\n&<> %]/g, function (keyword) {
            switch (keyword) {
                case '\n':
                    return '<br>'
                case '<':
                    return '&lt;'
                case '>':
                    return '&gt;'
                case '&':
                    return '&amp;'
                case ' ':
                    return '&nbsp;'
                case '%':
                    return '&#37;'
            }
            return keyword;
        })

        return this;
    }


    //去除代码中多余空格 不能有tab符号
    formatSpace() {
        //检索所有要修改的空格
        //由于头部没有\n,因此要加一个字符.来代替\n的长度
        let arr = this.text.match(/(^(?! *\n) *.)|(\n(?! *(\n|$)) *)/g);
        console.log(arr);
        if (arr != null) {
            //获取最短的空格长度					
            let min = arr[0].length;
            arr.forEach(elem => min > elem.length ? min = elem.length : 0);

            console.log(min)
            //消除空格
            let regExp = new RegExp(`(?<g1>\n {${min - 1}})|(?<g2>^ {${min - 1}})`, 'g');
            this.text = this.text.replaceAll(regExp, function (keyword, p1, p2) {

                if (p1 !== undefined) {
                    return '\n';
                }
                if (p2 !== undefined) {
                    return '';
                }
                console.log(8888888);
                return keyword;
            });
        }
        return this;
    }
    //去除代码中前后空行 不能有tab符号
    trimNewline() {
        this.text = this.text.replaceAll(/^[\n \t]*(?=\n)\n|\s+$/g, '')
        return this;
    }

    trimAll(){
        this.text=this.text.trim();
    }

    transTabToSpace() {
        this.text = this.text.replaceAll('\t', '        ');
        return this;
    }

    format(){
        return this.transTabToSpace().trimNewline().formatSpace();
    }



}
