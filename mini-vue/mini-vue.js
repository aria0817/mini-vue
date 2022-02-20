
// 响应式处理
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

// 循环递归observe对象 
function observe(obj){
    if(typeof obj !== 'object' || obj == null){
        return obj
    }
    Object.keys(obj).forEach(key => defineReactive(obj,key,obj[key]));
}
function proxy(vm){
    Object.keys(vm.$data).forEach(key=>{
        Object.defineProperty(vm,key,{
            get(){
                return vm.$data[key]
            },
            set(v){
                vm.$data[key]=v
            }
        })
    })
}

class Compile{
    constructor(el,vm){
        // 保存Vue实例
        this.$vm =vm 
        // 编译模版
        this.compile(document.querySelector(el))
    }
    // el模版的根节点
    compile(node){
        //获取所有子节点,拿出文本和元素
        const childNodes = node.childNodes;
        console.log(childNodes);
        Array.from(childNodes).forEach(n=>{
            // 判断node类型 
            // 为元素
            // console.log(n);
            if(n.nodeType === 1){
                console.log('element',n.nodeName);
                this.compileText(n)
                // 子层
                console.log(n.childNodes.length);
                if(n.childNodes.length > 0){
                    this.compile(n)
                }
            }else if(this.isInter(n)){
                console.log('text',n.textContent)
                // 编译差值文本
                this.compileText(n)
            }
        })
    }
    //判断是否为插值
    isInter(n){
        console.log(n,'*******');
        return n.nodeType === 3 && /\{\{(.*)\}\}/.test(n.textContent)
    }
    // 编译插值文本
    compileText(n){
        n.textContent =  this.$vm[RegExp.$1]
    }
}

class MiniVue{
    constructor(options){
        // 保存选项 
        this.$options = options
        this.$data = options.data
        //对data做响应式处理
        observe(this.$data)

        // 代理 
        proxy(this)
        // 编译 
        new Compile(options.el,this)
    }
}