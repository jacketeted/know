
$.know.DataObj = class {
    static getDataObjsByPidAsync(parentId) {
        return $.know.Database.getDataObjsByPidAsync(parentId)
            .then(dataObjs => {
                dataObjs.forEach(dataObj => {
                    this.relate(dataObj);
                })
                return dataObjs;
            })
    }
    // static becomePid(id){
    //     return `(${id})`;
    // }

    //设置继承
    static relate(obj) {
        Object.setPrototypeOf(obj, this.prototype);
        return obj;
    }

    addABlankChildAsync(knlg,orderNum,id,bindId) {

        let dObj = {
            id,
            pid: this.id,
            path: `${this.path}-${id}`,
            orderNum,
            knlg,
            bindId
        }
        return $.know.Database.addADataObjAsync(dObj)
            .then((dataObj) => this.constructor.relate(dataObj));
    }

    removeBranchAsync() {
        return $.know.Database.deleteByPathLikeAsync(this.path);
    }

    changeKnlgAsync() {
        return $.know.Database.updateADataObjAsync(this);
        
    }

    getBranchPathsAsync() {
        return $.know.Database.getPathsByPathLikeAsync(this.path)
            .then(dataObjs => {
                dataObjs.forEach(dataObj => {
                    this.constructor.relate(dataObj);
                })
                return dataObjs;
            })
    }
    getBranchDataObjsAsync() {
        return $.know.Database.getDataObjsByPathLikeAsync(this.path)
            .then(dataObjs => {
                dataObjs.forEach(dataObj => {
                    this.constructor.relate(dataObj);
                })
                return dataObjs;
            })
    }

    static updateDatasAsync(arr) {
        return $.know.Database.updateDataObjsAsync(arr);
    }

    isOffspringOf(dataObj) {

        return this.path.indexOf(dataObj.path) != -1
            && this != dataObj;
    }


    getIdArr(startId) {
        let idArr = this.path.split('-');
        if (startId) {
            return idArr.slice(idArr.indexOf(String(startId)));
        } else {
            return idArr;
        }
    }
    setPath(idArr) {
        this.path = idArr.join('-');
    }

    changePath(oldAncestor, newAncestor) {
        this.path = newAncestor.path + this.path.slice(oldAncestor.path.length)
    }

    addAParentAsync(pDataObj) {
        this.pid = this.pid + this.becomePid(pDataObj.id);
        return $.know.Database.updateADataObjAsync(this);
    }
    removeAParentAsync(pDataObj) {
        let i = this.pid.indexOf(this.becomePid(pDataObj.id));

        if (i != -1) {
            this.pid.splice(i, this.becomePid(pDataObj.id).length)
        }

        return $.know.Database.updateADataObjAsync(this);
    }
    // becomePid(id) {
    //     return `(${id})`;
    // }

    async updateKnlgsByBindIdAsync(){
        return await $.know.Database.updateKnlgsByBindIdAsync(this.knlg,this.bindId);
    }

}




$.know.Database = class {

    static getDataObjsByPidAsync(pid) {
        return $.ajax({
            url: `/know/v1/dataObjs/pid/${pid}`,
            method: 'get',
            type: 'json'
        })
            .then(dataObjs => dataObjs)
    }

    static deleteByPathLikeAsync(path) {
        return $.ajax({
            url: `/know/v1/dataObjs/pathLike/${path}`,
            method: 'delete',
        })
    }

    static updateADataObjAsync(dataObj) {
        return $.ajax({
            url: `/know/v1/dataObj`,
            method: 'put',
            data: { id: dataObj.id, knlg: dataObj.knlg, pid: dataObj.pid, path: dataObj.path },
            type: 'json'
        })
    }
    static getPathsByPathLikeAsync(path) {
        return $.ajax({
            url: `/know/v1/paths/pathLike/${path}`,
            method: 'get',
            type: 'json'
        })
            .then(dataObj => dataObj)
    }

    static addADataObjAsync(dObj) {
        return $.ajax({
            url: `/know/v1/dataObj`,
            method: 'post',
            data: dObj,
            type: 'json'
        })
            .then(dataObj => dataObj);
    }

    static getDataObjsByPathLikeAsync(path) {
        return $.ajax({
            url: `/know/v1/dataObjs/pathLike/${path}`,
            method: 'get',
            type: 'json'
        });
    }
    static getNextIdAsync() {
        return $.ajax({
            url: `/know/v1/nextId`,
            method: 'get',
            type: 'json'
        });
    }
    static getUniqueBindIdAsync() {
        return $.ajax({
            url: `/know/v1/uniqueBindId`,
            method: 'get',
            type: 'json'
        });
    }

    static getPathsByBindIdAsync(bindId) {
        return $.ajax({
            url: `/know/v1/paths/bindId/${bindId}`,
            method: 'get',
            type: 'json'
        })
    }


    static updateDataObjsAsync(arr) {
        return $.ajax({
            url: `/know/v1/dataObjs`,
            method: 'put',
            data: { myStr: JSON.stringify(arr) }
        });
    }
    static addDataObjsAsync(arr) {
        return $.ajax({
            url: `/know/v1/dataObjs`,
            method: 'post',
            data: { myStr: JSON.stringify(arr) }
        });
    }

    static getAllDataObjsAsync() {
        return $.ajax({
            url: `/know/v1/dataObjs`,
            method: 'get'
        });
    }

    static exportAsync() {
        return $.ajax({
            url: `/know/v1/export`,
            method: 'get'
        });
    }
    static importAsync() {
        return $.ajax({
            url: `/know/v1/import`,
            method: 'get'
        });
    }
    static copyDataObjsAsync(id,knlg,newPPath,newPId) {
        return $.ajax({
            url: `/know/v1/copyDataObjs`,
            method: 'post',
            data:{id,knlg,newPPath,newPId}
        });
    }

    static async updateKnlgsByBindIdAsync(knlg,bindId){
        return await $.ajax({
            url:'/know/v1/knlgsByBindId',
            method:'put',
            data:{knlg,bindId}
        })
    }

    static async deleteDataObjsByPathLikeAndBindIdAsync(pid,path,bindId){
        return await $.ajax({
            url:`/know/v1/dataObjs/pathLikeAndBindId`,
            method:'delete',
            data:{pid,path,bindId}
        })
    }








}




