var uid =0;//唯一标识id
// const queue= []; 排队更新的watcher队列
// const has = {}; watcher队列所有id
// index=0; 当前正在更新的watcher位置
// let waiting = false 需要等到watcher队列所有更新完后，防止重复更新
// let flushing = false 是否正在更新
class Vue{
  $options; //new vue时传的参数
  _data; //data对象
  id; //vue id
  $el; //绑定元素
  constructor(options){
    this.id = ++uid; //保持唯一id
    this._data = typeof(options.data)=="function"?options.data():options.data;//记录data
    this.$options = options;//记录options
    this.initData(this) //初始化data
    this.initMethods(this,options.methods) //初始化methods
    this.$el = document.querySelector(this.$options.el); //记录el
    this.compile(this.$el); //编译模板节点
  }
  initData(vm){
   for(let key in this._data){ //代理_data，可直接在this上访问data中数据
     this.proxy(this,'_data',key)
   }
    new Observer(this._data) //为data中的数据添加getter和setter,本实现只支持了单层简单对象
  }
  initMethods(vm,methods){
    for(let key in methods){
      if(vm._data.hasOwnProperty(key)){ //不要使data属性和method名重名
        console.log('data中重名')
      }else
      vm[key] = methods[key].bind(vm) //代理methods的调用，可使method直接用this调用
    }
  }
  compile(node){
    if(node.nodeType == 1){ //为一时为标签节点
      let attrs = node.getAttributeNames(); //获取该标签所有属性
      if(attrs&&attrs.length>0){
        for(let i =0;i<attrs.length;i++){ //遍历所有属性，分类解析
          if(attrs[i].indexOf('@')>=0){
            this.compileEvent(node,attrs[i],this) //解析事件，只解析了@click事件
          }else if(attrs[i].indexOf('v-')>=0){
            this.compileDirective(node,attrs[i],this) //解析指令，只解析了v-model
          }
        }
      }
      if(node.childNodes&&node.childNodes.length>0){
        node.childNodes.forEach((childNode)=>{ //递归解析所有子节点
          this.compile(childNode)
        })
      }
    }else if(node.nodeType == 3){ //此时为纯文本节点
      this.compileText(node,this)
    }
  }
  proxy(vm,source,key){ //defineProperty设置get,set。this.x相当于this._data.x
    let sharedConfig = {
      enumerable: true,
      configurable: true,
      get:function(){
        return this[source][key]
      },
      set:function(val){
        this[source][key] =val
      }
    }
    Object.defineProperty(vm,key,sharedConfig)
  }
  compileText(textNode,vm){
    let updateTextContent,match; //渲染函数，记录匹配正则的内容
    let regx = /\{\{((?:.|\r?\n)+?)\}\}/g; //源码中匹配{{}}的正则
    let textCache = textNode.textContent; //缓存纯文本内容
    if(match = textCache.match(regx)){ //如果其中存在{{}}
      let keyArr = []; //记录所有其中的变量名，不支持表达式和运算符，只支持纯变量
      match.forEach((item)=>{
        //为了分割变量以外的文本（有缺陷不能显示{{}}文本）
        textCache =textCache.replace(item,'{{}}') 
        keyArr.push(item.slice(2,-2))
      })
      let restTxtArr = textCache.split('{{}}');//获取其它文本数组
      //该函数时通过watcher设置的更新函数，每次依赖改变都会调用
      updateTextContent = function(_this){ 
        let contentText = '';
        keyArr.forEach((key,index)=>{
          contentText +=restTxtArr[index]+_this[key] //按规律拼接
        })
        contentText += restTxtArr[restTxtArr.length-1]
        textNode.textContent = contentText //更新到节点文本
      }
       //设置纯文本的renderWatcher,源码中只设置了一个renderWatcher,因为它的更新函数很全面，
       //我们这里只针对部分，所以每个需要更新数据到不同类型dom都需要设置一个对应watcher,就像
       //下面的input更新
      new Watcher(vm,updateTextContent,null); 
    }
  }
  compileEvent(nodeEle,attr,vm){
    if(attr=="@click"){ //解析@click事件
      let funcName = nodeEle.getAttribute(attr); //获取对应函数名
      //将函数绑定到node上，记得绑定methods的函数this指向
      nodeEle.addEventListener(attr.slice(1),vm[funcName].bind(vm)); 
      // console.log(attr.slice(1),vm[funcName])
      nodeEle.removeAttribute(attr) //删除@click属性
    }
  }
  compileDirective(nodeEle,attr,vm){
    if(attr=="v-model"){//解析v-model
      let modelKey = nodeEle.getAttribute(attr); //获取v-model绑定的值
      let updateNodeVal = function(_this){ //input更新函数，watcher用的，类似上面纯文本更新
        nodeEle.value = _this[modelKey] //绑定值赋给input.value
      }
      new Watcher(vm,updateNodeVal,null);//设置input的更新watcher
      nodeEle.addEventListener('change',function(val){ //input绑定change事件来改变绑定的值
        vm[modelKey] = nodeEle.value
      })
      nodeEle.removeAttribute(attr) //删除v-model属性
    }
  }
}
class Watcher{
  value='';//用于存储userwatcher的值，renderWatcher不返回值，只用来执行初始的get函数
  key=""; //源码中叫做expOrFn,是coumpted的函数(handler)，或watch的属性(key)
  cb=null;//watch的属性对应的监听函数(handler)
  vm=null;//vue实例
  depsArr=[];//依赖数组
  depIdsArr=[];//依赖id数组
  id;//watcher id
  constructor(vm,key,cb,option){
    this.id = uid++;
    this.vm = vm;
    this.cb =cb;
    this.key =key;
    this.value = this.get()//这个只有在renderWatcher或watcher是才会直接get,computed使用lazy来判断的，这里用不到就没有加上去
  }
  get(){
    let value;
    Dep.target = this;//当前watcher设置到Dep.target，为了正确记录当前watcher的依赖，否则不知道这个依赖是哪个watcher订阅的
    value= this.key.call(this.vm,this.vm); //此时调用更新函数,renderWatcher没有返回值
    Dep.target = null;//执行完后清空，否则没有watcher的变化可能也会记录到这个watcher上
    return value 
  }
    //收集依赖，源码定义了依赖的缓存，通过对比差别通知某依赖我已经不需要依赖你了，让它删掉自己
    //我们不需要那么详细就不加了
  addDep(dep){ 
    if(!this.depIdsArr.includes(dep.id)){//如果没有这个依赖则添加
      this.depIdsArr.push(dep.id);//添加依赖Id,用于上面的if判断
      this.depsArr.push(dep);//添加依赖
      dep.addSub(this)//通知依赖添加自己（告诉这个依赖(dep)我是你的订阅者(watcher)）
    }
  }
  // update(){ 用于多个watcher同时更新处理，这里用不着，sub[i].run换成sub[i].update也没问题
  //   if(!has[this.id]){
  //     has[this.id] = true;
  //     if(!flushing){
  //       queue.push(this);
  //     }else{
  //       let i = queue.length - 1
  //       while (i > index && queue[i].id > watcher.id) {
  //         i--
  //       }
  //       queue.splice(i + 1, 0, this)
  //     }
  //   }
  //   if (!waiting){
  //     waiting = true
  //     queue.sort((a,b)=>{
  //       return a.id-b.id
  //     })
  //     for(index = 0;index<queue.length;index++){
  //       has[queue[index].id] = null
  //       queue[index].run()
  //     }
  //    queue.slice()
  //    flushing = waiting = false
  //   }
  // }
  run(){
    this.get() //源码中这里处理了watch监听，我们这没watch只调用get就行
  }
}
class Dep{ //dependence 定义依赖
  id;
  subs=[];//存储该依赖订阅者列表
  static target = null;//Dep.target，全局dep共用静态变量，指示当前watcher
  constructor(options){
    this.id = uid++;
    this.subs = [];
  }
  depend(){
    if(Dep.target){
      Dep.target.addDep(this) //通知当前订阅者（watcher）我是你的依赖，把我记录下来
    }
  }
  addSub(sub){
    this.subs.push(sub) //由订阅者(watcher)调用，告诉依赖它订阅了你，把它记到subs(subscriber)
  }
  notify(){ //dep已改变，通知该依赖的所有订阅者更新
    for(let i =0;i<this.subs.length;i++){
      this.subs[i].run() //源码中为update，我们这run就行
    }
  }
}
class Observer{ //给data加get,set函数的
  constructor(data){ //源码中用一个observe()函数来执行，我们直接放到构造器中
    if(typeof(data)=='function'){//遍历data加get,set
       this.walk(data())
       }else{
      this.walk(data)
    }
  }
  walk(obj){ //其实也可以直接写在上面，为了方便对照源码，也用walk函数
    Object.keys(obj).forEach((key)=>{
    //简写的，省略了一些用不着的，也可以用defineReactive,这是完全的源码
      this.defineReactiveSimple(obj,key,obj[key])
    })
  }
  defineReactive(obj,key,val){
    var dep = new Dep(); //每次observe生成一个Dep
    var property = Object.getOwnPropertyDescriptor(obj, key);//获取key的详细设置
    if (property && property.configurable === false) {//不可配置就结束
      return
    }
    // cater for pre-defined getter/setters
    var getter = property && property.get;//记录已有的getter，setter
    var setter = property && property.set;
    //第三个参数表示默认值，一般vm.$set()使用,前面这个判断不知道是为什么，了解的可以说下
    if ((!getter || setter) && arguments.length === 2) {
      val = obj[key];
    }
    // 子属性是对象则递归，相当于每个Dep对应一个对象
    // var childOb = !shallow && observe(val);
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get: function reactiveGetter () {
        var value = getter ? getter.call(obj) : val;
        if (Dep.target) { //get时收集依赖
          dep.depend();
          // 我们没有子对象可以不写
          // if (childOb) {
          //   childOb.dep.depend(); //这里收集子对象的依赖
          //   if (Array.isArray(value)) {
            //收集数组依赖，专门重写了数组的方法，可以感知push，        
            //shift等操作变化，但没有处理直接改变下标导致的数组变化
          //     dependArray(value); 
          //   }
          // }
        }
        return value
      },
      set: function reactiveSetter (newVal) {
        var value = getter ? getter.call(obj) : val;
        /* eslint-disable no-self-compare */
        //这个不等自比较是处理NaN赋值给NaN的，此时不触发set
        if (newVal === value || (newVal !== newVal && value !== value)) {
          return
        }
        /* eslint-enable no-self-compare */
        // if (process.env.NODE_ENV !== 'production' && customSetter) {
        //   customSetter();//在vue中一般为自定义的警告函数
        // }
        // #7981: for accessor properties without setter
        //这里给出了issue号，我也没看的太明白，英语好的可以去看看，
        //感觉可能是设置了getter但不设置setter就视为只读,也可能和上面那个判断有关系
        if (getter && !setter) { return }
        if (setter) {
          setter.call(obj, newVal);
        } else {
          val = newVal;
        }
        //为子对象属性添加getter,setter
        // childOb = !shallow && observe(newVal);
        dep.notify(); //通知变化
      }
    })
  }
  defineReactiveSimple(obj,key,val){ //简写
    let dep = new Dep();
    let value = obj[key];
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get:function(){
        if (Dep.target) {
          dep.depend();
        }
        return value
      },
      set:function(newVal){
        value = newVal;
        dep.notify();
      }
    })
  }
}
new Vue({
  el:'#app',
  data(){
    return {
      count:2
    }
  },
  methods:{
    add(){
      console.log(this);
      if(isNaN(parseInt(this.count))){
        this.count = 0
      }
      this.count = parseInt(this.count)+1;
    }
  }
})
