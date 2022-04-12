// 1. 实现响应式 
// // 数据劫持
// vue2 Object.defineProperty(obj,key,desc)
// vue3: Proxy 

//teset
// 响应数据
function defineReactive(obj,key,value){
    //如果value是个对象，也要同时响应式处理
    observe(value)
    Object.defineProperty(obj,key,{
        get(){
            console.log('get',value);
            return value
        },
        set(v){
            // 如果传入的v为对象，还需要响应式处理
            if(v!== value){
                observe(v)
                value = v;
                console.log('set',v);
            }
        }
    })
}

const obj = {
    foo:'foo',
    bar:'bar',
    baz:{
        a:1
    }
}

// 循环递归observe对象 
// 让obj做响应式
function observe(obj){
    if(typeof obj !== 'object' || obj == null){
        return obj
    }
    Object.keys(obj).forEach(key => defineReactive(obj,key,obj[key]));
}

function set(obj,key,value){
    defineReactive(obj,key,value)
}

observe(obj)

obj.foo;
obj.bar;
obj.baz;
obj.baz.a=34

set(obj,'tt','test')
obj.tt



