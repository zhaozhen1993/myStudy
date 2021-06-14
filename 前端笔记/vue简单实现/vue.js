//响应式defineReactive

function defineReactive(obj, key, value) {
    observer(value) //递归
    const dep = new Dep()
    Object.defineProperty(obj,key, {
        get() {
            console.log(value, 'get')
            Dep.target&& dep.addwatch( Dep.target)
            return value 
        },
        set(newvalue) {
            observer(newvalue) //主要解决直接赋值对象问题  data:{a:{n:1}}  => data.a = {c:0}
            value = newvalue
            dep.notify()
        }
    })
}
//遍历 响应式处理
function observer(obj) {
    if (typeof obj !== 'object' || obj == null) {
        return
    }
    Object.keys(obj).forEach(key => {
        defineReactive(obj,key,obj[key])
    })
}
//数据代理
function proxy(vm){
    Object.keys(vm.$data).forEach(key => {
        Object.defineProperty(vm, key, {
            get() {
                return vm.$data[key]
            },
            set(v) {
                vm.$data[key] = v
            }
        })
    })
}
class Vue {
    constructor(options) {
        this.$data = options.data
        this.$options = options

        //响应式处理,遍历data

        observer(options.data)

        //proxy 代理  便于使用app.count否则app.$data.count
        proxy(this)
        //编译
        new Compile(options.el,this)
    }
}

class Compile{
    constructor(el,vm) {
        this.$vm = vm
        //获取dom
        this.$el = document.querySelector(el)

        //编译
        this.compile(this.$el,vm)
    }

    compile(el, vm) {
        el.childNodes.forEach(node => {
            if (this.isElement(node)) {
               //是否是元素
                // 元素:解析动态的指令、属性绑定、事件
                // node.textContent
                const attrs = node.attributes              
                Array.from(attrs).forEach(attr => {                 
                    const attrname = attr.name
                    const value = attr.value
                    if (this.isDirect(attrname)) {
                        const dir = attrname.substring(2)
                        console.log(dir, 'dir')
                        this[dir]&&this[dir](node,value)
                    } else if (attrname.startsWith('@')) {
                        const me = attrname.substring(1)
                        console.log(attrname, me, value)
                        this.Eventlisnter(node,me,value)
                    }
                })
            } else if (this.isInter(node)) {
                //是否是插值
                // node.textContent = this.$vm[RegExp.$1]
                this.updata(node,RegExp.$1,'text')
            }
            if (node.childNodes.length !== 0) {
                this.compile(node) 
            }
        })
    }
    //事件@
    Eventlisnter(node, key, value) {
        const fn = this.$vm.$options.methods[value]
        node.addEventListener(key,fn)
        // vm.$options.methods[value]()
    }
    //更新
    updata(node,exp,dir) {
        const fn = this[dir + 'Updater']
        //初始化
        fn && fn(node, this.$vm[exp])
        
        new Watch(this.$vm, exp, function (val) {
            fn && fn(node, val)
        })

    }

    text(node, exp) {
        this.updata(node,exp,'text')
        // node.textContent = this.$vm[value]
    }

    textUpdater(node, val) {
        node.textContent = val
    }

    html(node, exp) {
        this.updata(node,exp,'html')
        // node.innerHTML =  this.$vm[value]
    }

    htmlUpdater(node, val) {
        node.innerHTML = val
    }

    isElement(node) {
        return node.nodeType === 1
    }
    
    isInter(node) {
        return node.nodeType == 3 && /\{\{(.*)\}\}/.test(node.textContent)
    }

    isDirect(node) {
        return node.indexOf('v-')===0
    }
}

//更新函数,节点更新

class Watch{
    constructor(vm, key, Fn) {
        this.vm = vm
        this.key = key
        
        this.updater = Fn
        // watchers.push(this)
        Dep.target = this
        this.vm[this.key]
        Dep.target = null
    }

    updata() {
        const val = this.vm[this.key]

        this.updater.call(this.vm,val)
    }
}

class Dep{
    constructor() {
        this.deps = []
    }

    addwatch(watch) {
        this.deps.push(watch)
    }

    notify() {
        this.deps.forEach(watch=>watch.updata())
    }
}