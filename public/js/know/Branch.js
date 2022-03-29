//dataObj也可以设置成没有()的样子

class AutoId {
    id
    constructor() { }

    init(id) {
        this.id = Number(id);
    }
    alloc() {
        return this.id++;
    }
}

$.know.Branch = class {

    static idAllocator = new AutoId();

    static bindIdAllocator = new AutoId();

    static mainBranch = null;
    static _toggleMode = false;
    static set toggleMode(value) {
        this._toggleMode = value;

        // this.mainBranch.offSpringsAndSelf.forEach(branch => {
        //     branch.updateContent();
        // })
        this.allBranches.forEach(branch => {
            branch.updateContent();
        })

    }
    static get toggleMode() {
        return this._toggleMode;
    }

    static get allBranches() {
        let arr = [];
        $('.branch').each((i, elem) => {
            arr.push($.know.Branch.from$elem($(elem)));
        })
        return arr;
    }

    get offSprings() {
        let arr = [];
        this.$elem.find('.branch').each((i, elem) => {
            arr.push($.know.Branch.from$elem($(elem)));
        })
        return arr;
    }
    get offSpringsAndSelf() {
        let arr = this.offSprings;
        arr.push(this);
        return arr;
    }



    //必须传入完整dataObj
    constructor(dataObj) {
        this.$elem = $(`
            <li class="branch">
                <div class="tab">
                    <div class="indicator"></div>
                    <span></span>
                    <a class="btn" href="javascript:;"></a>
                </div>
                <ul></ul>
            </li>`);

        this.configNewSelf(dataObj);
    }


    bind$elem() {
        this.$elem.prop('branch', this);
    }


    //初始化时放入数组
    static bindIdToList = {}
    bindList = null;



    static from$elem($elem) {
        return $elem.prop('branch');
    }

    static fromTab($tab) {
        return this.from$elem($tab.parent());
    }
    static fromBtn($btn) {
        return this.from$elem($btn.parent().parent());
    }

    get childBranchCount() {
        return this.getUl().children().length;
    }

    set content(value) {
        this.getSpan().html(value);
    }

    getUl() {
        return this.$elem.children('ul');
    }
    getTab() {
        return this.$elem.children('.tab');
    }
    getSpan() {
        return this.getTab().children('span')
    }

    getIndicator() {
        return this.getTab().children('.indicator');
    }

    get parentBranch() {
        return this.constructor.from$elem(
            this.$elem.parent().parent()
        );
    }

    _dataObj = null
    get dataObj() {
        return this._dataObj;
    }
    set dataObj(value) {
        if (this._dataObj) {
            alert('不能覆盖dataObj');
            return;
        }
        this._dataObj = value;
    }


    _childContructed = false;
    setChildConstructedAsync(value) {
        let boolVal = Boolean(value)
        if (this._childContructed == boolVal) return emptyPromise;
        this._childContructed = boolVal;
        if (boolVal) {
            return this.constructChildBranchesAsync();
        } else {
            this.getUl().html('');
            return emptyPromise;
        }
    }
    get childConstructed() {
        return this._childContructed;
    }



    static unselectAllBranches() {
        $('.branch.selected').removeClass('selected');
    }
    static ungreenSelectAllBranches() {
        $('.branch.green-selected').removeClass('green-selected');
    }
    select() {
        this.$elem.addClass('selected');
    }
    greenSelect() {
        this.$elem.addClass('green-selected');
    }

    static getSelectedBranch() {
        let $elems = $('.branch.selected');
        return $elems.length > 0 ? this.from$elem($elems) : undefined;
    }


    _expanded = false
    set expanded(value) {
        let boolVal = Boolean(value);
        if (boolVal == this._expanded) return;
        this._expanded = boolVal;
        if (boolVal) {
            this.$elem.addClass('expanded')
        } else {
            this.$elem.removeClass('expanded')
        }
    }
    get expanded() {
        return this._expanded;
    }


    _hasChild = false
    set hasChild(value) {
        let boolVal = Boolean(value)
        if (boolVal == this._hasChild) return;

        this._hasChild = boolVal;
        if (boolVal) {
            this.$elem.addClass('has-child');
        } else {
            this.$elem.removeClass('has-child');
        }
    }
    get hasChild() {
        return this._hasChild;
    }


    configNewSelf(dataObj) {

        //在$elem的prop中放入branch
        this.bind$elem();
        this.dataObj = dataObj;
        this.hasChild = Boolean(this.dataObj.cid);
        delete this.dataObj.cid;
        //可以少一个请求,避免冲突
        if (!this.hasChild) this._childContructed = true;

        this.extraData = $.know.ParsedData.parse(dataObj);
        this.updateContent();
        this.updateIndicatorStyle()

        this.constructor.idMap[this.dataObj.id] = this;



        // this.makeTab($.know.ParsedData.parse(dataObj));
    }
    childLinks = {}

    getChildBranchById(id) {

        return this.childLinks[id];
    }
    addAChildBranchLink(branch) {
        this.childLinks[branch.dataObj.id] = branch;
    }
    removeAChildBranchLink(branch) {
        delete this.childLinks[branch.dataObj.id];
    }

    //declarative tab中设置一个hasChild变量绑定has-child样式

    expandByidsAsync(idsArr) {
        console.log(idsArr)
        idsArr = idsArr.join('-').split('-');
        let i = idsArr.indexOf(String(this.dataObj.id));

        i++;
        let branch = this;

        return expandAsync()
            .then(() => { return branch });
        function expandAsync() {
            if (i < idsArr.length) {
                return branch.expandChildBranchesAsync().then(() => {
                    console.log(idsArr[i])
                    branch = branch.getChildBranchById(idsArr[i]);
                    console.log(branch)
                    i++;
                    return expandAsync();
                })
            }
            return emptyPromise;
        }


    }




    expandChildBranchesAsync() {
        this.expanded = true;
        return this.setChildConstructedAsync(true);
    }

    unexpandChildBranches() {
        this.expanded = false;
    }




    //最好改成promise并发
    constructChildBranchesAsync() {

        return $.know.DataObj
            .getDataObjsByPidAsync(this.dataObj.id)
            .then((arr) => {

                let branches = arr.map(dataObj => {
                    return new this.constructor(dataObj);
                })

                this.addChildBranches(branches);


            })
    }


    addAChildBranch(childBranch) {

        this.addAChildBranchLink(childBranch)
        this.hasChild = true;
        this.getUl().append(childBranch.$elem);

    }
    addChildBranches(childBranches) {

        let $elems = childBranches.map(branch => {
            this.addAChildBranchLink(branch);
            return branch.$elem;
        })
        this.getUl().append($elems)
        this.hasChild = true;
    }

    removeSelfFromBindList() {
        this.bindList.splice(this.bindList.indexOf(this), 1)
    }

    removeAChildBranch(childBranch) {

        this.removeAChildBranchLink(childBranch);
        childBranch.$elem.remove();
        this.hasChild = this.childBranchCount;

        if (childBranch.bindList) {
            childBranch.offSpringsAndSelf.forEach(branch => {
                branch.removeSelfFromBindList();
            })
        }

    }


    giveAChildBranchTo(childBranch, newParentbranch) {
        newParentbranch.addAChildBranch(childBranch);
        this.removeAChildBranchLink(childBranch);
        this.hasChild = this.childBranchCount;



    }


    updateIndicatorStyle() {
        let extraData = this.extraData;
        let colorArr = []
        if (extraData.example) {
            colorArr.push('red')
        }
        if (extraData.toggle) {
            colorArr.push('orange')
        }
        if (extraData.source) {
            colorArr.push('green')
        }

        if (colorArr.length == 0) {
            this.getIndicator().css('width', '0');
            return;
        }
        let step = 100 / colorArr.length;
        let i = 0;
        colorArr = colorArr.map(color => {
            return `${color} ${i}% ${i += step}%`
        })
        this.getIndicator().css('width', '20px');
        this.getIndicator().css('background', `linear-gradient(to bottom,${colorArr.join(',')})`);


    }



    createABlankChildBranchAsync() {

        let id = this.constructor.idAllocator.alloc();
        //需要先有nextId才能有这个

        return this.dataObj
            .addABlankChildAsync(
                '',
                this.childBranchCount + 1,
                id
            )
            .then((dataObj) => {
                return new this.constructor(dataObj);
            });

    }

    async addABlankChildBranchAsync() {


        await this.expandChildBranchesAsync()
        let childBranch = await this.createABlankChildBranchAsync()

        this.addAChildBranch(childBranch);
        this.constructor.unselectAllBranches();
        childBranch.select();

    }


    static idMap = new Map();

    //完美的例子,先后台函数,再前台函数
    async removeSelfAsync() {

        await this.dataObj.removeBranchAsync();
        this.parentBranch.removeAChildBranch(this);

    }

    async changeContentAsync(text) {

        //解析text
        this.dataObj.knlg = text;

        this.extraData = $.know.ParsedData.firstParse(this.dataObj);

        await this.dataObj.changeKnlgAsync()
        this.updateContent();
        this.updateIndicatorStyle();
    }
    _extraData = null
    set extraData(value) {
        this._extraData = value;

    }
    get extraData() {
        return this._extraData;
    }

    updateContent() {
        if (this.constructor.toggleMode &&
            Boolean(this.extraData.toggle)) {

            this.content = this.extraData.toggle;
        } else {
            this.content = this.extraData.mainText;
        }
    }


    isOffspringOf(branch) {
        return this.dataObj.isOffspringOf(branch.dataObj);
    }

    m_moveTo(newParentBranch) {
        let oldParentBranch = this.parentBranch;
        newParentBranch.addAChildBranch(this);
        oldParentBranch.removeAChildBranch(this);


    }

    moveToAsync(newParentBranch) {
        if (newParentBranch.isOffspringOf(this) || newParentBranch === this) {
            alert('操作不允许')
            return emptyPromise;
        }

        let oldAncestorDataObj = this.parentBranch.dataObj;
        let newAncestorDataObj = newParentBranch.dataObj;

        return newParentBranch.expandChildBranchesAsync()
            .then(() => {
                return this.dataObj.getBranchPathsAsync()
            })

            .then((arr) => {

                arr.forEach(dataObj => {
                    dataObj.changePath(oldAncestorDataObj, newAncestorDataObj);
                })
                arr.push({
                    id: this.dataObj.id,
                    pid: newParentBranch.dataObj.id
                })
                return this.dataObj.constructor.updateDatasAsync(arr);

            })
            .then(() => {

                this.offSpringsAndSelf.forEach(branch => {
                    console.log(branch.dataObj.path)
                    branch.dataObj.changePath(oldAncestorDataObj, newAncestorDataObj);
                    console.log(branch.dataObj.path)
                })


                //父元素的属性也要改
                this.dataObj.pid = newParentBranch.dataObj.id;
                // this.dataObj.changePath(oldAncestorDataObj, newAncestorDataObj);

                this.parentBranch.giveAChildBranchTo(this, newParentBranch);

            })
    }

    static async createRootAsync() {
        let $ul = $('<ul></ul>');

        let arr = await $.know.DataObj.getDataObjsByPidAsync(0)

        let $elems = arr.map(dataObj => {

            let branch = new this(dataObj);
            return branch.$elem;
        })
        $ul.append($elems);
        return $ul;
    }

}

