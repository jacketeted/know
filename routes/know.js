const express = require('express');
const pool = require('../pool')
const cmd = require('child_process')
const fs = require('fs')

let router = express.Router();

//获取子元素的数据及子元素中含有的第一个子元素
router.get('/v1/dataObjs/pid/:pid', async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');

    let $pid = req.params.pid;

    let sql = 'SELECT `id`,`knlg`,`pid`,`path`,`orderNum`,`bindId`,(SELECT `id` FROM `know` WHERE `pid`=parent.id limit 1) AS `cid` FROM `know` AS parent WHERE `pid`=? ORDER BY `orderNum`';

    let result = await queryAsync(sql, [$pid]);

    res.send(result);

});

//插入数据
//暂时不做插入是否成功的判断
router.post('/v1/dataObj', async (req, res) => {
    let obj = req.body;
    let sql = 'INSERT INTO `know` SET ?';

    await queryAsync(sql, [obj]);
    res.send(obj);

});

router.post('/v1/dataObjs', async (req, res) => {

    let str = req.body.myStr;
    let arr = JSON.parse(str);

    //遍历数组并将数组中的内容加入数据库
    let sql = 'INSERT INTO `know` SET ?';

    await Promise.all(arr.map(obj => queryAsync(sql, [obj])));
    res.send('1');

});


router.get('/v1/nextId', async (req, res) => {
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

//删除父元素及子元素(path填写父元素path)
router.delete('/v1/dataObjs/pathLike/:path', async (req, res) => {
    let $path = req.params.path;
    let sql = 'DELETE FROM `know` WHERE `path` LIKE ?';

    await queryAsync(sql, [$path + '%']);
    res.send('1');

});

// 修改元素
router.put('/v1/dataObj', async (req, res) => {
    let obj = req.body;
    let sql = 'UPDATE `know` SET ? WHERE `id`=?';

    await queryAsync(sql, [obj, obj.id]);
    res.send('1');

    // pool.query(sql, [obj, obj.id], (err, result) => {
    //     if (err) throw err;
    //     if (result.affectedRows > 0) {
    //         res.send('1');
    //     } else {
    //         res.send('0');
    //     }
    // })
})


// 修改绑定的元素的knlg
router.put('/v1/knlgsByBindId', async (req, res) => {
    let obj = req.body;
    let sql = 'UPDATE `know` SET `knlg`=? WHERE `bindId`=?';

    await queryAsync(sql, [obj.knlg, obj.bindId]);
    res.send('1');

    // pool.query(sql, [obj.knlg, obj.bindId], (err, result) => {
    //     if (err) throw err;
    //     if (result.affectedRows > 0) {
    //         res.send('1');
    //     } else {
    //         res.send('0');
    //     }
    // })
})

// 获取绑定的元素
router.get('/v1/paths/bindId/:bindId', async (req, res) => {
    let bindId = req.params.bindId;

    let sql = 'SELECT `id`,`path` FROM `know` WHERE `bindId`=?';

    res.send(await queryAsync(sql, [bindId]));

    // pool.query(sql, [bindId], (err, result) => {
    //     if (err) throw err;
    //     res.send(result);
    // })
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
    console.log(req.body)

    //获得要删除的其它绑定的分支
    let sqlGet = 'SELECT pid,path FROM know parent WHERE bindId=? AND ((SELECT bindId FROM `know` WHERE id = parent.pid) IS NOT NULL)';
    let sqlDel = 'DELETE FROM know WHERE path LIKE ?';

    let result = await queryAsync('SELECT bindId FROM know WHERE id=?', [pid]);
    let pBindId = result[0].bindId;
    console.log(pBindId)

    if (pBindId) {

        let result = await queryAsync(sqlGet, [bindId]);

        await Promise.all(result.map((obj) => {
            return queryAsync(sqlDel, [obj.path + '%']);
        }))
    } else {
        console.log(path)
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

//获取父元素及子元素的path(path填写父元素path)
router.get('/v1/paths/pathLike/:path', (req, res) => {
    let $path = req.params.path;
    let sql = 'SELECT `id`,`path` FROM `know` WHERE `path` LIKE ?';
    pool.query(sql, [$path + '%'], (err, result) => {
        if (err) throw err;
        res.send(result);
    })
});

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
            bindId INT
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







module.exports = router;