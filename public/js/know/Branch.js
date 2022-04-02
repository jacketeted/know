//dataObj也可以设置成没有()的样子

'use strict';

class AutoId {
    id = 0;

    init(id) {
        this.id = Number(id);
    }
    alloc() {
        return this.id++;
    }
}
class IdMap extends Map {

    idsToBranches(idArr) {
        let branchArr = [];
        idArr.forEach(id => {
            let branch = this[id];

            if (branch) branchArr.push(branch);
        })

        return branchArr;
    }
}

$.know.Branch = class {


    static bindIdToArr = new Map();
    static bindIdAllocator = new AutoId();
    static idAllocator = new AutoId();
    static idMap = new IdMap();
    static mainBranch = null;
    static _toggleMode = false;


    bindArr = null;
    children = [];
    _content = '';
    _parsedData = null;
    _knlg = '';
    _dataObj = null;
    _parent = null;




    get knlg() {
        return this._knlg;
    }

    get parsedData() {
        return this._parsedData;
    }




    get parent() {
        return this._parent;
    }

    static set toggleMode(value) {
        this._toggleMode = value;


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
    constructor(dataObj, parent) {
        this.$elem = $(`
            <li class="branch">
                <div class="tab">
                    <div class="indicator"></div>
                    <span></span>
                    <a class="btn" href="javascript:;"></a>
                </div>
                <ul></ul>
            </li>`);

        this.configNewSelf(dataObj, parent);
    }


    bind$elem() {
        this.$elem.prop('branch', this);
    }

    async copyAndBindToAsync(newParentBranch) {
        if (newParentBranch.isOffspringOf(this) || newParentBranch === this) {
            alert('操作不允许')
            return emptyPromise;
        }
        await newParentBranch.expandChildBranchesAsync();


        let { updateArr, newId } = await Database.copyAndBindAsync(this.id, newParentBranch.id);



        updateArr.forEach(obj => {
            let branch = this.constructor.idMap[obj.id];
            console.log('branch    ', branch)

            //有些还没展开
            if (branch) {
                this.constructor.bindIdToArr[obj.bindId] = branch.bindArr = [branch]
            }

        })

        //现在this.bindArr一定有值了


        let newMainBranch = new this.constructor({
            id: newId,
            knlg: this.knlg,
            cid: this.hasChild
        }, newParentBranch);
        newMainBranch.bindArr = this.bindArr;

        newMainBranch.bindArr.push(newMainBranch);
        newParentBranch.addAChildBranch(newMainBranch)

    }

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
        return this.children.length;
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

    _id
    get id() {
        return this._id;
    }

    configNewSelf(dataObj, parent) {

        //在$elem的prop中放入branch

        this._id = dataObj.id;
        this._parent = parent;
        this._knlg = dataObj.knlg;



        this.bind$elem();
        this.dataObj = dataObj;
        this.hasChild = Boolean(this.dataObj.hasChild);
        delete this.dataObj.cid;
        //可以少一个请求,避免冲突
        if (!this.hasChild) this._childContructed = true;

        this._parsedData = $.know.ParsedData.parse(dataObj);
        this.updateContent();
        this.updateIndicatorStyle()

        this.constructor.idMap[this.dataObj.id] = this;

        if (this.dataObj.bindId) {

            this.bindArr = this.constructor.bindIdToArr[dataObj.bindId];

            if (!this.bindArr) {
                this.constructor.bindIdToArr[dataObj.bindId] = this.bindArr = [this];
            } else {
                this.bindArr.push(this);
            }
        }

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



    expandByidsAsync(idsArr) {
        idsArr = idsArr.join('-').split('-');
        let i = idsArr.indexOf(String(this.dataObj.id));

        i++;
        let branch = this;

        return expandAsync()
            .then(() => { return branch });
        function expandAsync() {
            if (i < idsArr.length) {
                return branch.expandChildBranchesAsync().then(() => {
                    branch = branch.getChildBranchById(idsArr[i]);
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

        return Database.getChildrenAsync(this.id)
            .then((arr) => {
                let branches = arr.map(dataObj => {
                    return new this.constructor(dataObj, this);
                })

                this.addChildBranches(branches);


            })
    }


    addAChildBranch(childBranch) {
        this.children.push(childBranch)
        this.addAChildBranchLink(childBranch)
        this.hasChild = true;
        this.getUl().append(childBranch.$elem);

    }
    addChildBranches(childBranches) {

        childBranches.forEach(branch => {
            this.children.push(branch);
        })

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
        this.children.splice(this.children.indexOf(childBranch), 1);
        childBranch.$elem.remove();
        this.hasChild = this.childBranchCount;


        childBranch.offSpringsAndSelf.forEach(branch => {
            if (branch.bindList) {
                branch.removeSelfFromBindList();
            }

        })


    }




    giveAChildBranchTo(childBranch, newParentbranch) {


        this.children.splice(this.children.indexOf(childBranch), 1);
        childBranch._parent = newParentbranch;
        newParentbranch.addAChildBranch(childBranch);
        this.removeAChildBranchLink(childBranch);

        this.hasChild = this.childBranchCount;



    }


    updateIndicatorStyle() {
        let parsedData = this.parsedData;
        let colorArr = []
        if (parsedData.example) {
            colorArr.push('red')
        }
        if (parsedData.toggle) {
            colorArr.push('orange')
        }
        if (parsedData.source) {
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



    async createABlankChildBranchAsync() {

        // let childId = this.constructor.idAllocator.alloc();

        let {childBranchList, hasChildIds}=await Database.addAChildAsync(this.id, '');
        console.log('childBranchList      ',childBranchList)
        console.log('hasChildIds      ',hasChildIds)
        // return new this.constructor({ id: childId, knlg: '' }, this);
        childBranchList.forEach(obj=>{
            let pBranch=this.constructor.idMap[obj.pid];
            if(pBranch&&pBranch.childConstructed){
                pBranch.addAChildBranch(new this.constructor(obj,pBranch));
            }
        })
        hasChildIds.forEach(id=>{
            let branch=this.constructor.idMap[id];
            if(branch){
                branch.hasChild=true;
            }
        })

    }

    async addABlankChildBranchAsync() {


        // if (this.dataObj.bindId) {

        //     for (let branch of this.bindList) {
        //         await branch.expandChildBranchesAsync();
        //     }

        //     let arr = await $.know.Database.getPathsByBindIdAsync(this.dataObj.bindId)

        //     let bindId = this.constructor.bindIdAllocator.alloc();
        //     let newArr = arr.map(dataObj => {
        //         let id = this.constructor.idAllocator.alloc();
        //         return {
        //             id,
        //             knlg: '',
        //             path: `${dataObj.path}-${id}`,
        //             pid: dataObj.id,
        //             bindId
        //         }
        //     })

        //     await $.know.Database.addDataObjsAsync(newArr);

        //     for (let branch of this.bindList) {
        //         newArr.forEach(dataObj => {
        //             if (dataObj.pid == branch.dataObj.id) {
        //                 branch.addAChildBranch(new this.constructor($.know.DataObj.relate(dataObj)))
        //             }
        //         })
        //     }
        //     return;
        // }


        await this.expandChildBranchesAsync()
        let childBranch = await this.createABlankChildBranchAsync()

        // this.addAChildBranch(childBranch);
        // this.constructor.unselectAllBranches();
        // childBranch.select();

    }



    // static idMap = new Map();

    //完美的例子,先后台函数,再前台函数
    async deleteSelfAsync() {

        let {delArr,notHasChildArr}=await Database.deleteSelfAsync(this.id);
        console.log('notHasChildArr   ',notHasChildArr)

        delArr.forEach(id=>{
            let branch=this.constructor.idMap[id];
            if(branch){
                branch.parent.removeAChildBranch(branch)
            }
        })
        notHasChildArr.forEach(id=>{
            let branch=this.constructor.idMap[id];
            if(branch){
                branch.hasChild=false;
            }
        })
        // this.parent.removeAChildBranch(this);


    }

    async contentAsync(text) {

        //解析text
        this.dataObj.knlg = text;


        this._parsedData = $.know.ParsedData.firstParse(this.dataObj);

        if (this.dataObj.bindId) {
            await this.dataObj.updateKnlgsByBindIdAsync()

            this.bindList.forEach(branch => {
                branch.parsedData = this.parsedData;
                branch.dataObj.knlg = this.dataObj.knlg;
                branch.updateContent();
                branch.updateIndicatorStyle();
            })
        }

        await Database.changeKnlgAsync(this.id,this.dataObj.knlg)
        this.updateContent();
        this.updateIndicatorStyle();
    }


    updateContent() {
        if (this.constructor.toggleMode &&
            Boolean(this.parsedData.toggle)) {

            this.content = this.parsedData.toggle;
        } else {
            this.content = this.parsedData.mainText;
        }
    }


    isOffspringOf(branch) {

        let tempBranch = this.parent;

        while (tempBranch) {
            if (tempBranch == branch) return true;
            tempBranch = tempBranch.parent;
        }

        return false;
    }


    async parentAsync(newParent) {

        if (newParent.isOffspringOf(this) || newParent === this) {
            alert('操作不允许')
            return emptyPromise;
        }

        await newParent.expandChildBranchesAsync()
        await $.know.Database.changeParentAsync(this.id, newParent.id);
        this.parent.giveAChildBranchTo(this, newParent);

    }

    static async createRootAsync() {
        let $ul = $('<ul></ul>');

        let arr = await Database.getRootAsync()

        let $elems = arr.map(dataObj => {

            let branch = new this(dataObj);
            return branch.$elem;
        })
        $ul.append($elems);
        return $ul;
    }

}

