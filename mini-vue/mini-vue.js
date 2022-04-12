// mini-vue 实现
// 要实现数据驱动、模版编译和语法。
function defineReactive(obj, key, val) {
    // 如果被设置的值为对象，也需要遍历key去实现监听
    observe(val)

    //可以在这里拿到与key一一对应的dep关系
    const dep = new Dep()

    //如果是嵌套对象的话,就遍历对象实现多层的拦截        
    Object.defineProperty(obj, key, {
        get() {
            // 这里是获取数据，也就是初始化/使用变量的时候
            // 这里实现依赖收集，对每个用到key的地方的watcher都收集起来
            // Dep.target 就是watcher 
            Dep.target && dep.addDep(Dep.target)
            
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
                dep.notify()
            }
        }
    })
}
// 如果要对obj做响应式 可以对它的的每一个属性都进行做响应式操作处理
function observe(obj) {
    // 判断obj的值，必须是object
    if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach(key => defineReactive(obj, key, obj[key]))
    }
    return obj
}

function set(obj, key, val) {
    defineReactive(obj, key, val)
}

/**
 * 1. new Vue初始化，对data执行响应式处理，这个过程发生在observer中
 * 2. 同时对模版进行编译，找到其中动态绑定的数据，从data中获取并初始化视图，这个过程发生在Compile中
 * 3. 同时定义一个更新函数和Watcher，将来对应数据变化时Watcher会调用更新函数
 * 4. 由于data的某个key在同一个视图可能会出现多次，所有每个key都需要一个管家Dep来管理多个
 * watch
 * 5. 将来data中数据一旦发生变化，就会找到对应的Dep，通知所有的watcher执行更新函数
 */
// 提供一个render方法，渲染出当前的vue组件，并且响应式处理数据
// 给实例化的对象提供一个$mouted的方法，挂在元素

function proxy(vm) {
    Object.keys(vm.$data).forEach(key => {
        Object.defineProperty(vm, key, {
            get() {
                return vm.$data[key]
            },
            set(val) {
                vm.$data[key] = val;
                // 更新
                // console.log(watchers,'******');
                // watchers.forEach(w=>w.update())
            }
        })
    })
}

class Compile {
    constructor(el, vm) {
        // 保存树立 
        this.$vm = vm;
        // 编译模版树 
        this.compile(document.querySelector(el))
    }
    compile(el) {
        // el为根结点
        // 1. 获取el的所有子节点
        // el.chilren: 拿出元素
        // el.childNodes // 可以拿出文本和元素

        el.childNodes.forEach(node => {
            // 2. 判断node类型
            if (node.nodeType === 1) {
                // 元素
                // 判断是否有一些指令和事件
                // console.log('元素', node.nodeName);
                this.compileElement(node)
                //拿到元素以后需要递归，处理里面的子元素
                if (node.childNodes.length > 0) {
                    this.compile(node)
                }
            } else if (this.isInter(node)) {
                // 插值表达式
                // console.log('文本', node.textContent);
                // 解析文本
                // 编译插值文本
                this.compileText(node)
            }
        })


    }
    // {{xxx}}
    isInter(node) {
        return node.nodeType === 3 && /\{\{(.*)\}\}/.test(node.textContent)
    }
    // 抽离出来的公共更新方法  同一初始化和更新处理
    update(node,exp,dir){
        // exp 其实获取的是key dir是元素的类型
        // console.log('````',node,exp,dir,'`````');
        // 初始化
        const fn = this[dir+'UpDater'];
        fn && fn(node,this.$vm[exp])
        // 更新节点
        new Watcher(this.$vm,exp,function(val){
            fn && fn(node,val)
        })
    }
    compileText(node) {

        // 插值表达式中变量的名字 console.log(this.$vm[RegExp.$1]);
        // 设置node的值 
        // 
        this.update(node,RegExp.$1,'text')
    }
    compileElement(node) {
        //获取当前元素的属性,判断是否为动态
        const nodeAttrs = node.attributes;
        Array.from(nodeAttrs).forEach(attr => {
            const attrName = attr.name;
            const exp = attr.value;
            // 判断是否为指令
            if (attrName.startsWith('v-')) {
                // console.log(attrName.substring(2));
                const dir = attrName.substring(2)
                this[dir] && this[dir](node,exp)
            }
        })
    }
    text(node,exp){
        this.update(node,exp,'text')
    }

    html(node,exp){
        this.update(node,exp,'html')
    }
    textUpDater(node,val){
        node.textContent = val
    }
    htmlUpDater(node,val){
        node.innerHTML = val
    }
}

// 我们要监听所有的动态数据，则最好是在编译的时候去监听
// 监听和修改
// 对数据上出现的一个数据都有一个watcher来监听，每一个key都有一个dep去实现更新
class Watcher{
    // 见
    // vm key 更新函数
    constructor(vm,key,updateFn){
        this.vm = vm;
        this.key = key;
        this.updateFn = updateFn;
        console.log(this.vm,this.key,this.updateFn,'*****');

        // 触发收集依赖
        Dep.target =this
        // 触发get的方法
        vm[key]
        Dep.target =null
       
        // watchers.push(this)
    }
    update(){
        // 执行完更新函数以后，将
        this.updateFn.call(this.vm,this.vm[this.key])
    }
}

// 和data中的响应式数据是一一对应的数据

class Dep{
    constructor(){
        this.deps=[]
    }
    addDep(dep){
        this.deps.push(dep)
    }
    notify(){
        // 执行更新函数
        this.deps.forEach(dep=>dep.update())
    }
}

class MiniVue {
    constructor(options) {
        // 1.保存数据
        this.$options = options;

        // console.log(options);
        this.$data = options.data;
        // 2. 对data做响应式处理
        observe(this.$data);

        // 2.5 代理 vue的选项中的数据代理到vue实例上去
        proxy(this)

        // 3.编译 插值 
        // 拿到app下的元素
        // 获取dom，遍历子元素，分析哪些为动态。编译文本和元素
        new Compile(options.el, this)

    }
}