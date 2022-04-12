//实现响应式
/// 设置obj的key 拦截它,
function defineReactive(obj, key, val) {    
    //如果是嵌套对象的话,就遍历对象实现多层的拦截        
    Object.defineProperty(obj, key, {
        get() {
            console.log('get', key, '***********');
            return val
        },
        set(v) {
            if (v !== val) {
                val = v;
                // 如果传入的v是一个对象。所以需要继续observe一下 
                observe(v)
                console.log('set')
                // update 更新视图
            }
        }
    })
}

const obj = {
    bar: 'bar',
    baz: {
        a: 1
    },
    arr:[1,2,3]
}
// 如果是


// 如果要对obj做响应式 可以对它的的每一个属性都进行做响应式操作处理
function observe(obj) {
    // 判断obj的值，必须是object
    if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach(key => defineReactive(obj, key, obj[key]))
    }
    return obj
}

function set(obj,key,val){
    defineReactive(obj,key,val)
}
observe(obj)
// 如果直接给它赋值，能够检测到变化吗？
obj.baz.a = 1;
console.log(obj);

//动态新增属性

// 
set(obj,'dong','123')

// 数组一般会使用push、pop等数组的方法，但是Object.defineProperty拦截不到这些的
// 变化。不过可以拦截到数组的每一项的set和get，因为数组也属于对象。 arr[0] 
// 解决方案： 覆盖数组中7个变更方法，拦截这几个方法，并且会通知订阅者更新。

