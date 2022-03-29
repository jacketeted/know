$.know = {}
//全新对象

Object.defineProperty(window, 'emptyPromise', {
    get() {
        return new Promise(open => open())
    }
})
