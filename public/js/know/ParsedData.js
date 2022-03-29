let defParseRule = new $.know.RegRule('bd敋');

defParseRule.set('definition', /<my定义>(.|\n)+?{\((.|\n)+?\)}/, (kw, obj) => {
    let i = kw.indexOf('{(');

    obj.defs.push($.know.Code(kw.slice(i + 2, -2)).format().transSignToHtml().text);

    return `<span class="definition" data-index="${obj.defs.length - 1}">${$.know.Code(kw.slice(6, i)).format().transSignToHtml()}</span>`;

})

defParseRule.save()

let rawRule = new $.know.RegRule('k敋1');

rawRule.set('raw', /<my原生>(.|\n)+<\/my原生>/, (kw, obj) => {
    return kw.slice(6, -7);
})

rawRule.save()


let parseRule = new $.know.RegRule();

parseRule.set('example', /<my示例>(.|\n)+<\/my示例>/, (kw, obj) => {

    let example = kw.slice(6, -7);
    if (!obj.formatted) {
        console.log(example);
        console.log($.know.Code(example).formatSpace().text)
        return `<my示例>${$.know.Code(example).formatSpace().text}</my示例>`;
    } else {
        obj.example = $.know.ParsedData.inDepthParse($.know.Code(example).trimNewline().text, obj);
        return '';
    }

})
parseRule.set('toggle', /<my切换>(.|\n)+<\/my切换>/, (kw, obj) => {

    let toggle = kw.slice(6, -7);
    if (!obj.formatted) {
        return `<my切换>${$.know.Code(toggle).formatSpace().text}</my切换>`;
    } else {
        obj.toggle = $.know.ParsedData.inDepthParse($.know.Code(toggle).trimNewline().text, obj);
        return '';
    }

})

parseRule.set('source', /<my来源>(.|\n)+<\/my来源>/, (kw, obj) => {

    let source = kw.slice(6, -7);
    if (!obj.formatted) {
        return `<my来源>${$.know.Code(source).formatSpace().text}</my来源>`;
    } else {
        obj.source = $.know.ParsedData.inDepthParse($.know.Code(source).trimNewline().text, obj);
        return '';
    }

})

parseRule.save()



$.know.ParsedData = class {
    formatted = false
    mainText = ''
    example = ''

    source = ''
    toggle = ''
    defs = []

    static parse(dataObj,parsedData) {
        parsedData||(parsedData=new this())

        parsedData.formatted = true;

        let str = parseRule.execute(dataObj.knlg, parsedData);
        str = $.know.Code(str).trimNewline().text;
        parsedData.mainText = $.know.ParsedData.inDepthParse(str, parsedData);

        return parsedData;
    }

    static firstParse(dataObj) {
        let parsedData = new this;
        let str = $.know.Code(dataObj.knlg).transTabToSpace().text;
        str = parseRule.execute(str,parsedData);

        dataObj.knlg = $.know.Code(str).formatSpace().trimNewline().text;

        return this.parse(dataObj,parsedData);
    }


    static inDepthParse(text, obj) {

        //此处可做优化,已做

        text = defParseRule.borrow(text, obj);
        text = rawRule.borrow(text, obj);
        text = colorRule.borrow(text);

        text = $.know.Code(text).transSignToHtml().text;

        text = colorRule.giveback(text);
        text = rawRule.giveback(text);
        text = defParseRule.giveback(text)

        return text;

    }



}



