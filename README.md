# mini-vue

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

### mini-vue 
实现一个简单的vue
* 数据响应式
* 模版引擎和渲染

数据响应式
监听数据并展示在视图上

### 实现一个mini-vue 
* 数据响应式
    - Object.defineProperty()
    - Proxy [vue3中使用]

* 模版引擎
    - 插值: {{}}
    - 指令: v-bind v-on v-model v-for v-if

* 渲染
    - 模版=> vdom => dom 

重点：vue-diff算法