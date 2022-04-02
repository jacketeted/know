


//如果再出问题,则是异步问题,要设置访问服务器时不能对其它元素进行操作

/**
 * 已实现的功能
 * 1、有子元素的要带一个小三角按钮 √
 * 2、前系隐藏功能√
 * 3、按一个按钮后全部显示函数名，再按一下全部显示解释 （如v-once 元素只渲染一次 √
 * 4、总共要实现的标签：1.示例  2.注解  3.整句解释，可切换(同第3条) 4.引用位置(书本\视频位置) √
 * 5、搜索功能 √
 * 
 * 想实现的功能
 * 1、输入时提示功能
 * 2、从这个元素和另一个元素一样，修改一个元素会都改，
 * pid设置成/1/2/   搜索%/1/%   不好 ×
 * 2、添加复制元素及复制和绑定元素的功能，这样搜索起来方便
 * 3、删除时自动更新 √
 * 4 悬浮窗要鼠标移上去也不会消失 √
 * 5. my定义改成<my定义>{(......)} √
 * 6 分支按自定义顺序排列
*/



'use strict';

let isrequesting = false;


let $d1 = $('#d1');
let $textarea = $('#d2>textarea');
let $basicFn = $('#d2>.basic-function');
let $extraFn = $('#d2>.extra-function');
let $moveFn = $('#d2>.move-function');
let $copyFn = $('#d2>.copy-function');

let $d3 = $('#d3');
let $d4 = $('#d4');
let $searchBox = $('.search-box');
let mainBranch;
let $mainUl;

//先创建根
(async function () {
    $.know.Branch.idAllocator.init(
        await Database.idAsync()
    );

    let $ul = await $.know.Branch.createRootAsync();

    $d1.append($ul);
    // mainBranch = $.know.Branch.from$elem($ul.children(':first'))
    $mainUl = $ul;
    $.know.Branch.mainBranch = $.know.Branch.from$elem($ul.children(':first'));
})()


function updateExtraBtns() {
    let branch = $.know.Branch.getSelectedBranch();
    let parsedData;
    if (branch) {
        parsedData = branch.parsedData;
    } else {
        parsedData = { example: false, toggle: false, source: false }
    }

    $extraFn.children('.example').prop('disabled', !parsedData.example);
    $extraFn.children('.toggle').prop('disabled', !parsedData.toggle);
    $extraFn.children('.source').prop('disabled', !parsedData.source);

}

$d1.delegate('div.tab', 'click', async function () {



    let branch = $.know.Branch.fromTab($(this))

    //选中
    $.know.Branch.unselectAllBranches();
    branch.select();


    // //将$d3隐藏
    if ($d3.is(':visible')) {
        $d3.hide();
    }
    // setExtraBtns(branch.parsedData)
    updateExtraBtns()


    //焦点设置在textarea上
    // $textarea.focus()


});

$d1.delegate('a.btn', 'click', async function () {
    if (isrequesting) return;
    isrequesting = true;

    let branch = $.know.Branch.fromBtn($(this));

    if (branch.expanded) {
        branch.unexpandChildBranches();
    } else {
        await branch.expandChildBranchesAsync()
    }
    isrequesting = false;
});

$extraFn.children('.sleep').click(function () {
    $.ajax({
        method: 'get',
        url: '/know/v1/sleep'
    })
});

; (function () {
    let timer = null;
    $d1.delegate('div.tab', 'mouseover', function (e) {
        if (e.target.className == 'definition') {
            if (timer) { clearTimeout(timer); timer = null }
            let $tab = $(this);
            let $span = $(e.target);
            let index = parseInt($span.attr('data-index'));

            $d4.html($.know.Branch.fromTab($tab).parsedData.defs[index]);
            $d4.css('left', e.clientX + 20 + 'px')
            $d4.css('top', e.clientY + 20 + 'px')
            $d4.show()
        }

    });

    $d3.mouseover(function (e) {

        if (e.target.className == 'definition') {
            if (timer) { clearTimeout(timer); timer = null }
            let $tab = $(this);
            let $span = $(e.target);
            let index = parseInt($span.attr('data-index'));

            $d4.html($(this).prop('parsedData').defs[index]);

            $d4.css('left', e.clientX + 20 + 'px')
            $d4.css('top', e.clientY + 20 + 'px')
            $d4.show()
        }
    });
    $d4.mouseleave(function () {
        timer = setTimeout(() => $d4.hide(), 200);
    })

    $d4.mouseover(function () {
        if (timer) { clearTimeout(timer); timer = null }
    })

    $d3.delegate('span.definition', 'mouseleave', function (e) {
        timer = setTimeout(() => $d4.hide(), 200);



    });

    $d1.delegate('span.definition', 'mouseleave', function () {

        timer = setTimeout(() => $d4.hide(), 200);

    });

})();


//移动分支的功能
; (function () {
    let cBranch = undefined;

    //两组按钮的显示和隐藏随情况切换
    let $btnGr1 = $moveFn.children('.confirm-move,.cancel');
    let $btnGr2 = $moveFn.children('.move').add($basicFn);
    $moveFn.children('.move').click(function () {

        let branch = $.know.Branch.getSelectedBranch();
        if (!branch) return;
        cBranch = branch;

        //切换显示的按钮组
        $btnGr1.removeClass('hide')
        $btnGr2.addClass('hide')

    })

    $moveFn.children('.cancel').click(function () {
        //切换显示的按钮组
        $btnGr1.addClass('hide')
        $btnGr2.removeClass('hide')
    })

    $moveFn.children('.confirm-move').click(async function () {
        if (isrequesting) return;
        isrequesting = true;

        let parentBranch = $.know.Branch.getSelectedBranch();
        if (!parentBranch) return;

        await cBranch.parentAsync(parentBranch)
        isrequesting = false;


        //将按钮恢复原状
        $btnGr1.addClass('hide');
        $btnGr2.removeClass('hide');

    })
})();

//复制分支的功能
; (function () {
    let cBranch = undefined;

    //两组按钮的显示和隐藏随情况切换
    let $btnGr1 = $copyFn.children('.confirm-copy,.cancel');
    let $btnGr2 = $copyFn.children('.copy').add($basicFn);
    $copyFn.children('.copy').click(function () {
        let branch = $.know.Branch.getSelectedBranch();
        if (!branch) return;
        cBranch = branch;

        //切换显示的按钮组
        $btnGr1.removeClass('hide')
        $btnGr2.addClass('hide')

    })

    $copyFn.children('.cancel').click(function () {
        //切换显示的按钮组
        $btnGr1.addClass('hide')
        $btnGr2.removeClass('hide')
    })

    $copyFn.children('.confirm-copy').click(function () {
        if (isrequesting) return;
        isrequesting = true;

        let parentBranch = $.know.Branch.getSelectedBranch();
        if (!parentBranch) return;

        cBranch.copyAndBindToAsync(parentBranch)
            .then(() => isrequesting = false);


        //将按钮恢复原状
        $btnGr1.addClass('hide');
        $btnGr2.removeClass('hide');

    })
})();


$basicFn.children('.add').click(function () {
    let branch = $.know.Branch.getSelectedBranch();
    if (!branch) return;

    if (isrequesting) return;
    isrequesting = true;

    branch.addABlankChildBranchAsync()
        .then(() => isrequesting = false);

    $textarea.focus()

});


//删除分支
$basicFn.children('.delete').click(function () {
    let branch = $.know.Branch.getSelectedBranch();
    if (!branch) return;


    if (isrequesting) return;
    isrequesting = true;


    //弹出确认删除对话框
    if (!confirm('是否确认删除')) {
        isrequesting = false;
        return;
    }

    //如果是根节点,则无法删除
    if (branch.dataObj.pid == 0) {
        return;
    }

    branch.deleteSelfAsync()
        .then(() => updateExtraBtns())
        .then(() => isrequesting = false);


});


$basicFn.children('.getContent').click(function () {
    let branch = $.know.Branch.getSelectedBranch();
    if (!branch) return;

    //将textarea的内容后面加上span的内容,以防误操作
    $textarea.val(`${$.know.Code($textarea.val()).trimNewline()}\n${branch.dataObj.knlg}`);

    //textarea获取焦点
    $textarea.focus();
});


$basicFn.children('.confirm').click(function () {

    let branch = $.know.Branch.getSelectedBranch();
    if (!branch) return;

    if (isrequesting) return;
    isrequesting = true;


    let oldText = branch.dataObj.knlg;

    branch.contentAsync($textarea.val())
        .then(() => {

            setExtraBtns(branch.parsedData);

            //让textarea显示原来的文字
            $textarea.val(oldText);

            //让textarea获取焦点
            $textarea.focus();

            isrequesting = false;

        })

})

//目前只能将delete键操作放在这里
$textarea.keyup(function (e) {
    //如果按ctrl+回车,则可以代替'确认修改'按钮
    if (e.keyCode == 13 && e.ctrlKey) {
        $basicFn.children('.confirm').trigger('click');
    } else if (e.keyCode == 46) {
        $basicFn.children('.delete').trigger('click');
    }
});

$extraFn.children('.example').click(function () {
    let branch = $.know.Branch.getSelectedBranch();
    if (!branch) return;

    $d3.html(branch.parsedData.example);
    $d3.prop('parsedData', branch.parsedData)
    $d3.show();
});
$extraFn.children('.toggle').click(function () {
    let branch = $.know.Branch.getSelectedBranch();
    if (!branch) return;

    let parsedData = branch.parsedData;
    //如果是toggleMode
    if ($.know.Branch.toggleMode &&
        Boolean(parsedData.toggle)) {
        $d3.html(parsedData.mainText);
    } else {
        $d3.html(parsedData.toggle);
    }
    $d3.prop('parsedData', branch.parsedData)
    $d3.show();
});
$extraFn.children('.source').click(function () {
    let branch = $.know.Branch.getSelectedBranch();
    if (!branch) return;

    $d3.html(branch.parsedData.source);
    $d3.show();
});
$extraFn.children('.toggle-mode').click(function () {
    $.know.Branch.toggleMode = !$.know.Branch.toggleMode;

});
$extraFn.children('.search').click(function () {

    if ($searchBox.hasClass('hide')) {
        $searchBox.removeClass('hide')
    } else {
        $searchBox.addClass('hide');
        $.know.Branch.ungreenSelectAllBranches();
    }
});

; (() => {

    let $li;
    let impoBranch;
    let inMode = false;
    $extraFn.children('.important').click(function () {
        if (!inMode) {
            let branch = $.know.Branch.getSelectedBranch();
            //有branch就一定有mainUl
            if (!branch) return;

            $li = $('<li></li>');
            $li.insertAfter(branch.$elem);
            $mainUl.append(branch.$elem);

            impoBranch = branch;
            inMode = true;
            mainBranch.$elem.hide();
        } else {

            $li.replaceWith(impoBranch.$elem)

            mainBranch.$elem.show();
            inMode = false;
        }


    });



})()




function setExtraBtns(parsedData) {

    $extraFn.children('.example').prop('disabled', !parsedData.example);
    $extraFn.children('.toggle').prop('disabled', !parsedData.toggle);
    $extraFn.children('.source').prop('disabled', !parsedData.source);
}

$searchBox.children('button').click(function () {

    let branch = $.know.Branch.getSelectedBranch();
    if (!branch) return;


    if (!$searchBox.children('input').val()) {
        return;
    }
    let strs = $searchBox.children('input').val().split('|||');

    let ignoreCase = !$searchBox.children('label').children(':checkbox').prop('checked');

    let regExps = strs.map(str => {
        if (ignoreCase) {
            return new RegExp(str, 'i');
        } else {
            return new RegExp(str);
        }

    })


    let search = new $.know.Search();
    return search.fetchDataAsync(branch.dataObj.path, branch.dataObj.id)
        .then(() => {
            $.know.Branch.ungreenSelectAllBranches();
            let results = search.search(regExps)

            let i = 0;
            return forEach();
            function forEach() {
                if (i < results.length) {

                    // return $.know.Branch.mainBranch.expandByidsAsync(results[i++].path.split('-'))
                    return branch.expandByidsAsync(results[i++].path.split('-'))
                        .then((branch) => {

                            branch.greenSelect();
                            return forEach();
                        })
                }

            }

        });


});

