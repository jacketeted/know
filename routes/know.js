const express = require('express');
const pool = require('../pool')
const cmd = require('child_process')
const fs = require('fs')

let router = express.Router();



class IdAllocator {
    id = 0;

    init(id) {
        this.id = Number(id);
    }
    alloc() {
        return this.id++;
    }
}


let idAllocator;
let bindIdAllocator;

async function init() {
    idAllocator = new IdAllocator();
    let [{ id }] = await queryAsync(`SELECT AUTO_INCREMENT id FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA ='${pool.database}' AND TABLE_NAME='know'`);
    idAllocator.init(id);

    bindIdAllocator = new IdAllocator();
    let [{ bindId }] = await queryAsync('SELECT MAX(`bindId`) `bindId` FROM `know`');
    bindIdAllocator.init(bindId ? bindId + 1 : 1)
}


class Branch {

    id = 0;




    constructor(id) {
        this.id = Number(id);
    }
    async getChildrenAsync() {
        let sql = 'SELECT `id`,`knlg`,`bindId`,(SELECT `id` FROM `know` WHERE `pid`=parent.id limit 1) AS `cid` FROM `know` AS parent WHERE `pid`=? ORDER BY `orderNum`';

        return await queryAsync(sql, [this.id]);
    }

    async addAChildAsync(childKnlg) {


        let [{ childCount }] = await queryAsync('SELECT COUNT(id) childCount FROM `know` WHERE `pid`=?', [this.id]);

        let [{ parentPath }] = await queryAsync('SELECT `path` parentPath FROM `know` WHERE `id`=?', [this.id]);

        let childId = idAllocator.alloc()
        let obj = {
            id: childId,
            knlg: childKnlg,
            pid: this.id,
            orderNum: childCount + 1,
            path: `${parentPath}-${childId}`

        }
        await queryAsync('INSERT INTO `know` SET ?', [obj]);
        return obj;
    }
    async changeKnlgAsync(knlg) {

        return await queryAsync('UPDATE `know` SET knlg=? WHERE `id`=?', [knlg, this.id]);

    }

    async deleteSelfAsync() {




        let [{ path, pid, bindId }] = await queryAsync('SELECT `path`,`bindId`,`pid` FROM `know` WHERE `id`=?', [this.id]);

        let [{ oriPBindId }] = await queryAsync('SELECT `bindId` oriPBindId FROM `know` WHERE `id`=?', [pid])

        let delArr = [];
        let notHasChildArr = [];

        //存放可能要更新的bindId
        let updateArr = await queryAsync('SELECT `bindId` FROM `know` WHERE `path` LIKE ?', [path + '%']);
        await queryAsync('DELETE FROM `know` WHERE `path` LIKE ?', [path + '%']);

        delArr.push(this.id);

        //判断父分支是否还有子元素
        let childArr = await queryAsync('SELECT `id` FROM `know` WHERE `pid`=? LIMIT 1', [pid]);
        if (childArr.length == 0) {

            notHasChildArr.push(pid)
        }



        if (bindId) {
            let bindBranches = await queryAsync('SELECT `id`,`path`,`pid` FROM `know` WHERE `bindId`=?', [bindId]);
            for (let obj of bindBranches) {

                let [{ pBindId }] = await queryAsync('SELECT `bindId` pBindId FROM `know` WHERE `id`=?', [obj.pid]);

                //只要父元素是绑定同样的就直接删除
                if (pBindId && (pBindId == oriPBindId)) {
                    await queryAsync('DELETE FROM `know` WHERE `path` LIKE ?', [obj.path + '%']);
                    delArr.push(obj.id)
                    let childArr = await queryAsync('SELECT `id` FROM `know` WHERE `pid`=? LIMIT 1', [obj.pid]);
                    if (childArr.length == 0) {

                        notHasChildArr.push(obj.pid)
                    }
                }
            }
        }



        for (let obj of updateArr) {
            if (obj.bindId) {

                let [{ count }] = await queryAsync('SELECT COUNT(id) count FROM `know` WHERE `bindId` = ?', [obj.bindId]);
                if (count == 1) {
                    await queryAsync('UPDATE `know` SET `bindId`=NULL WHERE `bindId` = ?', [obj.bindId]);
                }
            }
        }

        return { delArr, notHasChildArr };

    }

    async parentAsync(newParentId) {

        let [{ path, pid }] = await queryAsync('SELECT `path`,`pid` FROM `know` WHERE `id`=?', [this.id]);
        let arr = await queryAsync('SELECT `id`,`path` FROM `know` WHERE `path` LIKE ?', [path + '%'])
        let [{ oldAncestorPath }] = await queryAsync('SELECT `path` oldAncestorPath FROM `know` WHERE `id` = ?', [pid])
        let [{ newAncestorPath }] = await queryAsync('SELECT `path` newAncestorPath FROM `know` WHERE `id` = ?', [newParentId])


        let sql = 'UPDATE `know` SET `path` = ? WHERE id=?'
        await Promise.all(arr.map(async obj => {
            return queryAsync(sql, [
                newAncestorPath + obj.path.slice(oldAncestorPath.length),
                obj.id
            ])
        }))

        await queryAsync('UPDATE `know` SET `pid` = ? WHERE id = ?', [newParentId, this.id])
    }

    async offspringsAndSelfAsync(path) {

        return await queryAsync('SELECT * FROM `know` WHERE `path` LIKE ?', [path + '%'])
    }


    async copyAndBindAsync(newParentId) {
        // let [{ id }] = await queryAsync(`SELECT AUTO_INCREMENT id FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA ='${pool.database}' AND TABLE_NAME='know'`);

        let [{ pid, path }] = await queryAsync('SELECT `path`,`pid` FROM `know` WHERE `id`=?', [this.id]);

        let [{ oldAncestorPath }] = await queryAsync('SELECT `path` oldAncestorPath FROM `know` WHERE `id` = ?', [pid])
        let [{ newAncestorPath }] = await queryAsync('SELECT `path` newAncestorPath FROM `know` WHERE `id` = ?', [newParentId])

        let arr = await this.offspringsAndSelfAsync(path);

        let idMap = new Map();
        //把新id和旧id放入映射
        arr.forEach(obj => {
            idMap[obj.id] = idAllocator.alloc();
        })

        //添加ancestorId的映射
        idMap[pid] = newParentId;

        let updateArr = [];

        arr.forEach(obj => {
            //这边要+1因为要去掉'-'
            let idListPath = obj.path.slice(oldAncestorPath.length + 1).split('-');

            idListPath.forEach((id, i, arr) => {
                arr[i] = idMap[Number(id)];
            })
            obj.path = `${newAncestorPath}-${idListPath.join('-')}`
            obj.pid = idMap[obj.pid]

            // 这里处理时obj.id还没有改
            if (!obj.bindId) {
                obj.bindId = bindIdAllocator.alloc();
                updateArr.push({
                    id: obj.id,
                    bindId: obj.bindId
                })
            }

            obj.id = idMap[obj.id];
        })
        await Promise.all(arr.map(obj => {
            return queryAsync('INSERT INTO `know` SET ?', [obj])
        }))
        await Promise.all(updateArr.map(obj => {
            return queryAsync('UPDATE `know` SET ? WHERE `id`=?', [obj, obj.id])
        }))

        return { updateArr, newId: idMap[this.id] };


    }


};


class Branch1 {
    bindId;
    id;
    knlg;
    orderNum;
    path;
    pid;
    hasChild;

    static async fromIdAsync(id) {
        let [obj] = await queryAsync('SELECT id,pid,knlg,orderNum,path,bindId,hasChild FROM know WHERE id=?', id);
        this.wrap(obj);
        return obj;
    }
    static wrap(obj) {
        Object.setPrototypeOf(obj, this.prototype);
        return obj;
    }
    static async parentAsync() {
        return await this.constructor.fromIdAsync(this.pid);
    }
    async deleteSelfAsync() {
        let parent = await this.parentAsync();
        await queryAsync('DELETE FROM `know` WHERE `path` LIKE ?', [this.path + '%']);
        let pHasChild = await parent.checkHasChildAsync();
        await parent.setHasChildAsync(pHasChild);
    }
    async delSfAndUpdBindAsync() {
        // let this.offspringsAndSelfAsync
        let parent = await this.parentAsync();
        await queryAsync('DELETE FROM `know` WHERE `path` LIKE ?', [this.path + '%']);
        let pHasChild = await parent.checkHasChildAsync();
        await parent.setHasChildAsync(pHasChild);
    }
    async childCountAsync() {
        let [{ childCount }] = await queryAsync('SELECT COUNT(id) childCount FROM `know` WHERE `pid`=?', [this.id])
        return childCount;
    }
    async checkHasChildAsync() {
        let arr = await queryAsync('SELECT `id` FROM `know` WHERE `pid`=? LIMIT 1', [this.id])
        return arr.length > 0;
    }
    async addAChildAsync(knlg, bindId = null) {
        let childCount = await this.childCountAsync();

        let branch = new Branch();
        branch.knlg = knlg;
        branch.id = idAllocator.alloc();
        branch.pid = this.id;
        branch.orderNum = childCount + 1;
        branch.path = `${this.path}-${branch.id}`;
        branch.hasChild = 0;
        branch.bindId = bindId;

        await queryAsync('INSERT INTO `know` SET ?', [branch])
        await this.setHasChildAsync(true);
        return branch;
    }
    async setHasChildAsync(hasChild) {
        if (hasChild == this.hasChild) return;
        await queryAsync('UPDATE `know` SET hasChild=? WHERE id=?', [Number(hasChild), this.id])
    }

    async offspringsAndSelfAsync(){
        let arr = await queryAsync('SELECT id,pid,knlg,orderNum,path,bindId,hasChild FROM know WHERE path LIKE ?', this.path+'%');
        arr.forEach(obj=>{
            this.constructor.wrap(obj);
        })
        return arr;
    }



}


class BindBranchList {
    branchList;
    static async fromBranchAsync(branch) {
        let bindBranchList = new this();
        let bindId = branch.bindId;

        let arr = await queryAsync('SELECT id,pid,knlg,orderNum,path,bindId,hasChild FROM know WHERE bindId=?', bindId);
        arr.forEach(obj => {
            Branch1.wrap(obj);
        })

        bindBranchList.branchList = arr;
        return bindBranchList;
    }

    async addAChildAsync(knlg) {

        let childBranchList = []
        let hasChildIds = []
        let bindId = bindIdAllocator.alloc();
        for (let branch of this.branchList) {

            if (!branch.hasChild) {
                hasChildIds.push(branch.id);
            }
            let childBranch = await branch.addAChildAsync(knlg, bindId);
            childBranchList.push(childBranch);

        }
        return { childBranchList, hasChildIds };
    }

    async deleteSelfAsync(mainBranch){
        this.rmABranchById(mainBranch.id);
        // console.log('mainBranch   ',mainBranch)
        // console.log('this.branchList   ',this.branchList)
        let arr=await mainBranch.offspringsAndSelfAsync();
        arr.forEach(obj=>{
            if(obj.bindId){
                bindIds.push(obj.bindId);
            }
        })
        
        let bindIds=[];
        arr.forEach(obj=>{
            if(obj.bindId){
                bindIds.push(obj.bindId);
            }
        })

        console.log(bindIds)


    }

    rmABranchById(id){
        this.branchList.some((obj,i,arr)=>{
            if(obj.id==id){
                arr.splice(i,1)
                return true;
            }
        })
    }






}




//获取子分支, 及子分支是否含有子分支
router.get('/v1/children/id/:id', async (req, res) => {

    let arr = await new Branch(req.params.id).getChildrenAsync();
    res.send(arr)

});

//插入数据
router.post('/v1/child', async (req, res) => {
    let { parentId, childKnlg } = req.body;

    let branch = await Branch1.fromIdAsync(parentId);
    if (branch.bindId) {
        let bindBranchList = await BindBranchList.fromBranchAsync(branch);

        let result = await bindBranchList.addAChildAsync(childKnlg);
        res.send(result)

    } else {
        let hasChildIds = [];
        if (!branch.hasChild) {
            hasChildIds.push(branch.id);
        }
        let childBranch = await branch.addAChildAsync(childKnlg);
        res.send({ childBranchList: [childBranch], hasChildIds })
    }

});


// 修改知识内容
router.put('/v1/self', async (req, res) => {
    let { id, knlg } = req.body;

    await new Branch(id).changeKnlgAsync(knlg);
    res.send('1');
})

//删除分支
router.delete('/v1/self/id/:id', async (req, res) => {
    let { id } = req.params;

    let branch = await Branch1.fromIdAsync(id);
    if (branch.bindId) {
        let bindBranchList = await BindBranchList.fromBranchAsync(branch);

        let result = await bindBranchList.deleteSelfAsync(branch);
        res.send(result)

    } else {
        // let hasChildIds = [];
        // if (!branch.hasChild) {
        //     hasChildIds.push(branch.id);
        // }
        // let childBranch = await branch.addAChildAsync(childKnlg);
        // res.send({ childBranchList: [childBranch], hasChildIds })
    }











    // let result = await new Branch(id).deleteSelfAsync();

    // res.send(result);

});

//修改parent
router.put('/v1/changeParent', async (req, res) => {
    let { id, newParentId } = req.body;

    await new Branch(id).parentAsync(newParentId);
    res.send('1')
});


router.post('/v1/copyAndBind', async (req, res) => {
    let { id, newParentId } = req.body;

    let result = await new Branch(id).copyAndBindAsync(newParentId);
    res.send(result)
});




router.post('/v1/dataObjs', async (req, res) => {

    let str = req.body.myStr;
    let arr = JSON.parse(str);

    //遍历数组并将数组中的内容加入数据库
    let sql = 'INSERT INTO `know` SET ?';

    await Promise.all(arr.map(obj => queryAsync(sql, [obj])));
    res.send('1');

});


router.get('/v1/id', async (req, res) => {
    let sql = `SELECT AUTO_INCREMENT FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA ='${pool.database}' AND TABLE_NAME='know'`;

    let result = await queryAsync(sql);
    res.send(String(result[0].AUTO_INCREMENT));

})


router.get('/v1/uniqueBindId', async (req, res) => {
    let sql = 'SELECT MAX(`bindId`) `uniqueBindId` FROM `know`';

    let result = await queryAsync(sql);
    let uniqueBindId = result[0].uniqueBindId;
    uniqueBindId = uniqueBindId ? uniqueBindId + 1 : 1;
    res.send(String(uniqueBindId));

})






// 修改绑定的元素的knlg
router.put('/v1/knlgsByBindId', async (req, res) => {
    let obj = req.body;
    let sql = 'UPDATE `know` SET `knlg`=? WHERE `bindId`=?';

    await queryAsync(sql, [obj.knlg, obj.bindId]);
    res.send('1');

})

// 获取绑定的元素
router.get('/v1/paths/bindId/:bindId', async (req, res) => {
    let bindId = req.params.bindId;

    let sql = 'SELECT `id`,`path` FROM `know` WHERE `bindId`=?';

    res.send(await queryAsync(sql, [bindId]));


})

function queryAsync(sql, arr) {
    return new Promise((resolve, reject) => {
        pool.query(sql, arr, (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(result);
        })
    })
}

router.delete('/v1/dataObjs/pathLikeAndBindId', async (req, res) => {
    let { pid, path, bindId } = req.body;

    //获得要删除的其它绑定的分支
    let sqlGet = 'SELECT pid,path FROM know parent WHERE bindId=? AND ((SELECT bindId FROM `know` WHERE id = parent.pid) IS NOT NULL)';
    let sqlDel = 'DELETE FROM know WHERE path LIKE ?';

    let result = await queryAsync('SELECT bindId FROM know WHERE id=?', [pid]);
    let pBindId = result[0].bindId;

    if (pBindId) {

        let result = await queryAsync(sqlGet, [bindId]);

        await Promise.all(result.map((obj) => {
            return queryAsync(sqlDel, [obj.path + '%']);
        }))
    } else {
        await queryAsync(sqlDel, [path + '%']);
    }

    let idArr = [];
    result = await queryAsync('SELECT id,bindId, COUNT(bindId) AS bindIdCount FROM know GROUP BY bindId');
    for (let obj of result) {
        if (obj.bindIdCount == 1) {
            idArr.push(obj.id);
            await queryAsync('UPDATE know SET bindId = NULL WHERE bindId = ?', [obj.bindId]);
        }
    }

    res.send(idArr)

})



//修改父元素的pid,path及子元素的path(path填写父元素path)
router.put('/v1/dataObjs', async (req, res) => {
    let str = req.body.myStr;
    let arr = JSON.parse(str);

    //遍历数组并将数组中的内容加入数据库
    let sql = 'UPDATE `know` SET ? WHERE `id`=?';

    await Promise.all(arr.map(obj => queryAsync(sql, [obj, obj.id])))
    res.send('1')

});




router.get('/v1/sleep', (req, res) => {
    cmd.exec('Rundll32.exe Powrprof.dll,SetSuspendState Sleep', (err, out, errString) => {
        if (err) { res.send(err); return; }
        res.send(out);
    })
})




router.get('/v1/dataObjs', (req, res) => {
    let sql = 'SELECT `id`,`knlg`,`pid`,`path`,`orderNum`,`bindId` FROM `know`';

    pool.query(sql, (err, result) => {
        res.send(result);
    })
})
router.get('/v1/export', (req, res) => {
    let sql = 'SELECT * FROM `know`';

    pool.query(sql, (err, result) => {
        if (err) throw err;

        let i = 0;
        while (fs.existsSync(`yugfvty${i}.txt`)) {
            i++;
        }

        fs.writeFileSync(`yugfvty${i}.txt`, JSON.stringify(result));

        res.send(result);

    })
})

router.get('/v1/import', (req, res) => {

    let i = 0;
    while (fs.existsSync(`yugfvty${i}.txt`)) {
        i++;
    }
    //最近导出的文件
    let filename = `yugfvty${i - 1}.txt`;

    let sql1 = `
    DROP TABLE IF EXISTS know;

    `
    pool.query(sql1, (err, result) => {
        let sql2 = `
        CREATE TABLE know(
            id INT PRIMARY KEY AUTO_INCREMENT,    
            knlg VARCHAR(5000),
            pid INT,
            path VARCHAR(1000),
            orderNum INT,
            bindId INT,
            hasChild TINYINT
        )DEFAULT CHARACTER SET UTF8 COMMENT "知识"
        `
        pool.query(sql2, (err, result) => {
            let str = fs.readFileSync(filename);
            let arr = JSON.parse(str);
            let sql = 'INSERT INTO `know` SET ?'
            let promArr = arr.map(obj => {
                return new Promise((open, promErr) => {
                    pool.query(sql, [obj], (err, result) => {
                        if (err) {
                            promErr(err);
                            return;
                        }

                        open();
                    })
                })
            })
            Promise.all(promArr)
                .then(() => res.send('1'))
                .catch((err) => {
                    throw err;
                })
        })





    })


})

router.get('/v1/addHasChild', async (req, res) => {
    let result = await queryAsync('SELECT * FROM know');
    for (let value of result) {
        let arr = await queryAsync('SELECT * FROM know WHERE pid = ? LIMIT 1', [value.id]);
        await queryAsync('UPDATE know SET hasChild=? WHERE id=?', [arr.length > 0 ? 1 : 0, value.id]);
    }
    res.send('1')
})

router.get('/v1/import/:filename', (req, res) => {

    let sql1 = `
    DROP TABLE IF EXISTS know;

    `
    pool.query(sql1, (err, result) => {
        let sql2 = `
        CREATE TABLE know(
            id INT PRIMARY KEY AUTO_INCREMENT,    
            knlg VARCHAR(5000),
            pid INT,
            path VARCHAR(1000)
        )DEFAULT CHARACTER SET UTF8 COMMENT "知识"
        `
        pool.query(sql2, (err, result) => {
            let str = fs.readFileSync(req.params.filename);
            let arr = JSON.parse(str);
            let sql = 'INSERT INTO `know` SET ?'
            let promArr = arr.map(obj => {
                return new Promise((open, promErr) => {
                    pool.query(sql, [obj], (err, result) => {
                        if (err) {
                            promErr(err);
                            return;
                        }

                        open();
                    })
                })
            })
            Promise.all(promArr)
                .then(() => res.send('1'))
                .catch((err) => {
                    throw err;
                })
        })





    })


})


router.post('/v1/changeKnlgFormatPost', (req, res) => {
    let str = req.body.myStr;
    let arr = JSON.parse(str);

    let sql = 'UPDATE `know` SET ? WHERE `id`=?';
    arr.forEach(elem => {
        pool.query(sql, [elem, elem.id], (err, result) => {
            if (err) throw err;

        })
    })
    res.send('1')

})


//获取父元素及子元素(path填写父元素path)
router.get('/v1/dataObjs/pathLike/:path', (req, res) => {
    let $path = req.params.path;
    let sql = 'SELECT * FROM `know` WHERE `path` LIKE ?';
    pool.query(sql, [$path + '%'], (err, result) => {
        if (err) throw err;
        res.send(result);
    })
});







module.exports = { router, init };