$.know.Search = class {
    constructor() {
        this.arr = [];
    }
    fetchDataAsync(path, bid) {
        return $.know.Database.getDataObjsByPathLikeAsync(path)
            .then((arr) => {
                // 将数组按路径从短到长排列
                arr.sort((a, b) => {
                    return a.path.length - b.path.length;
                })

                let obj = {}

                obj[0] = { knlg: '' }
                arr.forEach(elem => {
                    obj[elem.id] = elem;
                    let ids = elem.path.split('-');
                    //把id列表切割成只剩当前分支

                    ids = ids.slice(ids.indexOf(String(bid)));

                    let knlgs = []
                    ids.forEach(id => {
                        knlgs.push(obj[parseInt(id)].knlg);
                    })
                    elem.toSearch = knlgs.join('-')
                });
                this.arr = arr;

            })
    }

    // searchSingle(regExp) {
    //     let results = [];
    //     this.arr.forEach(elem => {
    //         for (const result of results) {
    //             if (this.isChild(elem, result)) {
    //                 return;
    //             }
    //         }

    //         if (regExp.test(elem.toSearch)) {

    //             results.push(elem);
    //         }
    //     })
    //     return results;
    // }

    //用于搜索不确定字符顺序的情况,如(程序 动画 或 动画 程序)
    //搜索时要注意.和\n配合
    search(regArr) {

        let results = this.arr;

        regArr.forEach(regExp => {

            results = results.filter(elem => regExp.test(elem.toSearch));
            // results=results.filter(elem => {
            //     if (regExp.test(elem.toSearch)) {
            //         return elem;
            //     }
            // })
        })
        // console.log(regArr,results);


        // 只要短的,不要长的
        let filteredResults = []
        results.forEach(result => {
            for (const fResult of filteredResults) {
                if (this.isChild(result, fResult)) {
                    return;
                }
            }
            filteredResults.push(result);
        })
        return filteredResults;



    }

    isChild(elem1, elem2) {
        return elem1.path.indexOf(elem2.path) != -1 && elem1.path != elem2.path;
    }







}