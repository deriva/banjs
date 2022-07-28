
/*
 * 作者:lity 
 *日期:2022-07-23
 *版本:1.0.2
 *名称:板（ban）
 *描述：原生js双向绑定，比vue的写法过于让人抛弃底层，只会写组件ui，配置化的东西太多，而ban的双向绑定：遵从原生js规则，使用起来更灵活
 *版本更新:双向绑定1.0.2版本-->更新绑定
 *版权:by lity
 */
function Ban(options) {
    this.$options = options || {};
    this.$el = options.el
    this.$data = options.data
    let computed = options.computed;
    let methods = options.methods;
    let self = this;
    // _binding保存着model与view的映射关系，也就是Wachter的实例，当model更新的时候，更新对应的view
    self._binding = {};
    // 1. 编译模板
    new Compile(this.$el || document.body, this);
    //代理绑定
    self.ProxyDefine(this.$data, [], self);


}
Ban.prototype = {
    //代理递归循坏绑定
    ProxyDefine: (data, objname, self) => {
        //  var self = this;
        var dd = data;
        if (objname == undefined)
            objname = [];
        for (var key in data) {
            if (dd.hasOwnProperty(key)) {
                var t1 = dd[key];
                if (Array.isArray(dd)) {//给数组添加主键
                    var vv = t1[":index"];
                    if (vv) objname.push(":index-" + vv + "");
                    else objname.push(":index-" +key);
                } else {
                    objname.push(key);
                }
                if (typeof t1 == "object") {
                    self.ProxyDefine(t1, objname, self);
                } else {
                    self.Define(dd, key, objname, self);
                    dd[key] = t1;
                }
                objname.pop();

            }

        }
    },

    //声明绑定
    Define: (data, key, objname, self) => {
        let val = data[key];
        let objnamestr = objname.join('.');
        // 建立需要监测属性的关联
        if (!self._binding[objnamestr]) {
            self._binding[objnamestr] = {
                _directives: [] // 存储所有使用该数据的地方
            };
        }
        Object.defineProperty(data, key, {
            configurable: true,
            enumerable: true,
            get: function proxyGetter() {
                return val;
            },
            set: function proxySetter(v) { 
                if (val != v) {
                    val = v;
                    // 如果数据被修改，则需要通知每一个使用该数据的地方进行更新数据， 
                    self.UpdateView(objnamestr, v, self);
                }
            }
        })

    },
    //更新视图:通知观察者 更新view
    UpdateView: (key, val, self) => {
        var binding = self._binding[key];
        binding._directives.forEach(function (item) {
            item.update(val);
        });
    },

}

/**
 * @class 指令解析类 Compile
 * @param {[type]} el [element节点]
 * @param {[type]} vm [mvvm实例]
 */
function Compile(el, vm) {
    this.$vm = vm;
    this.$el = compileUtil.isElementNode(el) ? el : document.querySelector(el);

    if (this.$el) {
        this.$fragment = this.nodeFragment(this.$el);
        this.compileElement(this.$fragment, "");
        // 将文档碎片放回真实dom
        this.$el.appendChild(this.$fragment)
    }
}
Compile.prototype = {
    compileElement: function (el, preexp) {
        let self = this;
        let childNodes = el.childNodes;
        [].slice.call(childNodes).forEach(node => {
            self.parseNode(node, preexp);
        });
    },
    // 文档碎片，遍历过程中会有多次的dom操作，为提高性能我们会将el节点转化为fragment文档碎片进行解析操作
    // 解析操作完成，将其添加回真实dom节点中
    nodeFragment: function (el) {
        let fragment = document.createDocumentFragment();
        let child;

        while (child = el.firstChild) {
            fragment.appendChild(child);
        }
        return fragment;
    },
    //解析节点
    parseNode: function (node, preexp) {
        let text = node.textContent;

        let self = this;
        // 如果是element节点
        if (compileUtil.isElementNode(node)) {
            self.compile(node, preexp);
        }
        // 如果是text节点
        else if (compileUtil.isTextNode(node) && compileUtil.$reg().test(text)) {
            var exparr = [];
            text.match(compileUtil.$reg()).forEach((item, i) => {
                var exp = item.replace("{{", "").replace("}}", "");//info.msg
                if (preexp) {
                    exp = preexp + "." + exp.split(".")[1];//lst.0.n
                    node.textContent = node.textContent.replace(item, "{{" + exp+"}}");
                }
               
                exparr.push(exp);
            });
            compileUtil.BindText(node, this.$vm, exparr, preexp);
        }
        // 解析子节点包含的指令
        if (node.childNodes && node.childNodes.length) {
            self.compileElement(node, preexp);
        }
    },
    // 指令解析
    compile: function (node, preexp) {
        let nodeAttrs = node.attributes;
        let self = this;
        //node.parseNode().appendChild(node);
        [].slice.call(nodeAttrs).forEach(attr => {
            let attrName = attr.name;
            let exp = attr.value;
            //绑定事件集
            if (compileUtil.isEventDirective(attrName)) {
                compileUtil.eventHandler(node, self.$vm, exp, attrName);
                node.removeAttribute(attrName);
            } else {
                var dir = compileUtil.getDir(attrName);
                if (dir) {
                    if (dir == "for") {//for循环
                        self.compileFor(node, attrName, exp, preexp);
                    } else {
                        compileUtil.BindByAttrName(node, self.$vm, exp, dir, "");
                    }
                    node.removeAttribute(attrName);
                }
            }
        });
    },
    //编译for 列表数据
    compileFor: function (node, attrName, exp, preexp) {
        let self = this;//(it,a) in lst
        var lstvar = exp.split('in')[1].trim();//lst
        var itemvar = exp.split('in')[0].trim().replace("(", "").replace(")", "").split(",");//item
        self.$vm.$data[lstvar].forEach((sub, i) => {
            var vv = sub[itemvar[1]];
            sub[":index"] = vv;
            preexp = lstvar + ".:index-" + vv ;
            if (i > 0) {
                var p1 = node.cloneNode(true);
                p1.removeAttribute(attrName);
                p1.setAttribute("b-key", preexp);
                self.compileElement(p1, preexp);
                node.parentNode.appendChild(p1);
            }
        });
        self.$vm.$data[lstvar].forEach((sub, i) => {
            var vv = sub[itemvar[1]];
            sub[":index"] = vv;
            preexp = lstvar + ".:index-" + vv ;
            if (i == 0) {
                // node.setAttribute("b-key", preexp);
                let childNodes = node.childNodes;
                childNodes.forEach(node => {
                    self.compileElement(node, preexp);
                });
            }
        });
   
    }
}
// 定义$elm，缓存当前执行input事件的input dom对象
let $elm;
let timer = null;
// 指令处理集合
const compileUtil = {
    $reg: () => { return /\{\{((?:.|\n)+?)\}\}/g; },
    //通过属性名获取对应的指令
    getDir: function (attrName) {
        var dir = "";
        switch (attrName) {
            case "b-m": { dir = "model"; break; }
            case "b-h": { dir = "html"; break; }
            case "b-t": { dir = "text"; break; }
            case "b-c": { dir = "class"; break; }
            case "b-e": { dir = "event"; break; }
            case "b-for": { dir = "for"; break; }
            default: dir = "";
        }
        return dir;
    },
    isElementNode: function (node) {
        return node.nodeType === 1;
    },
    // text纯文本
    isTextNode: function (node) {
        return node.nodeType === 3
    },
    // x-XXX指令判定
    isDirective: function (attr) {
        return attr.indexOf('b') >= 0;
    },
    // 事件指令判定
    isEventDirective: function (dir) {
        return dir.indexOf('b-e') >= 0;
    },
    //绑定的文本节点
    BindText: function (node, vm, exp, preexp) {
        let initcontent = node.textContent;
        exp.forEach((sub, i) => {//exp:info.msg
            var key = compileUtil.guid();
            // console.log("BindText", sub);
            // node.setAttribute("b-key", key);
            let watcher = this.AddWatch(node, vm, key, sub, "text", initcontent);
            var val = this._getVmVal(vm.$data, sub);
            watcher && watcher.update(val);
        });
    },
    //通过属性名称更新节点并添加观察者
    BindByAttrName: function (node, vm, exp, dir) {
        let initcontent = node.textContent;
        var val = this._getVmVal(vm.$data, exp);
        var key = compileUtil.guid(); 
        //通过指令渲染节点值
        compileUtil.ReaderNodeByDir(node, dir, val, initcontent);
        // 给当前element对象添加model到view层的映射
        let watcher = this.AddWatch(node, vm, key, exp, dir, initcontent);
        // watcher && watcher.update(val);
        if (dir == "model") {
            let self = this;
            // 监听input事件
            node.addEventListener('input', function (e) {
                let newVal = e.target.value;
                $elm = e.target;
                if (val === newVal) {
                    return;
                }
                // 设置定时器  完成ui js的异步渲染
                clearTimeout(timer);
                timer = setTimeout(function () {
                    self._setVmVal(vm.$data, exp, newVal);
                    vm.UpdateView(exp, newVal, vm);
                    val = newVal;
                })
            });
        }
    },

    /**
     * node: 指令对应的DOM元素
     * eb: 指令对应的实例
     * key:对象唯一key 同时会给node节点增加唯一属性
     * exp:对象属性名称：info.msg   lst.0.age 等
     * initnode:初始节点
     * dir:html,text,class等
     **/
    AddWatch: function (node, vm, key, exp, dir, initcontent) {
        // 给当前element对象添加model到view层的映射 
        if (node) {
            if (!vm._binding[exp]) {
                vm._binding[exp] = {
                    _directives: [] // 存储所有使用该数据的地方
                };
            }
            var watcher = new Watcher({
                node: node,//节点元素
                eb: vm,//所挂载的实例 
                key: key,  //value ,txt//暂时未用 
                exp: exp,
                dir: dir,
                initcontent: initcontent
            });
            vm._binding[exp]._directives.push(watcher);
            return watcher; 
        }
        return;
    },

    // 事件处理
    eventHandler: function (node, vm, attrVal, attrName) {
        let eventType = attrName.split(':')[1];
        if (!eventType) eventType = "click";
        if (eventType) {
            let fn = vm.$options.methods && vm.$options.methods[attrVal];
            if (fn) {
                node.addEventListener(eventType, fn.bind(vm), false);
            } else {
                node.addEventListener(eventType, function () {
                    eval(attrVal);
                }, false);
            }
        }
    },
    /**
     * [获取挂载在vm实例上的value]
     * @param  {[type]} vm  [mvvm实例]
     * @param  {[type]} exp [expression]
     */
    _getVmVal: function (vm, exp) {
        var dd = vm;
        var val; var keys = exp.split('.');
        keys.forEach(function (key) {
            if (/:index-((?:.|\n)+?)/g.test(key)) {//lst.[:index-val].a
                var st = key.replace("[", "").replace("]", "").split("-");
                dd.forEach((item, i) => {
                    if (item[":index"] == st[1]) {
                        dd = item;
                    }
                });
            } else {
                if (dd.hasOwnProperty(key)) {
                    var t1 = dd[key];
                    if (typeof t1 != "object") {
                        val = t1;
                    } else {
                        dd = t1;
                    }

                }
            }
        });
        if (val == undefined) val = "";
        return val;
    },
    /**
     * [设置挂载在vm实例上的value值]
     * @param  {[type]} vm    [mvvm实例]
     * @param  {[type]} exp   [expression]
     * @param  {[type]} value [新值]
     */
    _setVmVal: function (vm, exp, value) {
        var dd = vm;
        var keys = exp.split('.');
        keys.forEach(function (key) {
            if (dd.hasOwnProperty(key)) {
                var t1 = dd[key];
                if (typeof t1 != "object") {
                    dd[key] = value;
                } else {
                    dd = t1;
                }
            }
        });
    },
    // 指令渲染集合
    ReaderNodeByDir: function (option, value) {
        //node, dir, value
        var node = option.node;
        switch (option.dir) {
            case "html": { node.innerHTML = typeof value === 'undefined' ? '' : value; break; }
            case "class": { break; }
            case "model": {
                if (node.value != value) {
                    node.value = typeof value === 'undefined' ? '' : value;
                }
                break;
            }
        }

    },
    //渲染文本节点的值
    ReaderTextNode: function (option) {
        var node = option.node;
        var data = option.eb.$data;
        let self = this;
        var text = option.initcontent;//{{info.title}},{info.msg},{{lst.[n-9].n}},{{lst.[a-8].a}}
        let arr = text.match(compileUtil.$reg());
        if (arr) {
            arr.forEach((item, i) => {
                var exp = item.replace("{{", "").replace("}}", "");
                var val = self._getVmVal(data, exp);
                var reg = new RegExp(item, 'g');//g 全局匹配 
                text = text.replace(reg, val);
            });
            node.textContent = text;
        }
    },
    def: function (obj, key, val, enumerable) {
        Object.defineProperty(obj, key, {
            value: val,
            enumerable: !!enumerable,
            configurable: true,
            writable: true
        })
    },
    guid: function () {
        return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

 

/**
 * options 属性：
 * node: 指令对应的DOM元素
 * eb: 指令对应的实例 
 * key:对象唯一key 同时会给node节点增加唯一属性
 * group:属性组
 * type:1对象{} 2数组[]
 * initnode:初始节点
 * dir:html,text,class等
 */
function Watcher(options) {
    this.$options = options;
    this.update();
}

Watcher.prototype = {
    update: function (val) {//更新视图 
        if (val) {
            // 获取到被绑定的对象 
            var dir = this.$options.dir;
            if (dir == "text") {
                compileUtil.ReaderTextNode(this.$options, val);
            } else {
                compileUtil.ReaderNodeByDir(this.$options, val);
            }

        }
    }

}



/**
 * observeArr的部分
 **/
// 生成新的原型
let newPrototype = Object.create(Array.prototype);

let methods = ["push", "pop", "shift", "unshift", "reverse", "sort", "splice"];
// 在新原型上面添加以上方法，实现劫持
methods.forEach(method => {
    newPrototype[method] = function (...args) {
        console.log(`使用了${method}`);
        let inserted;
        switch (method) {
            case "push":
            case "unshift":
                inserted = args;
                break;
            case "splice":
                inserted = args.slice(2);
                break;
            default:
                break;
        }
        inserted && observeArr(inserted);
        return Array.prototype[method].call(this, ...args);
    };
});

function observeArr(arr) {
    // 新加！！！是对象的话，需要用对象
    if (Object.prototype.toString.call(arr) === "[object Object]") {
        observeObj(arr);
        return;
    }

    if (Array.isArray(arr)) {
        // 整个数组指向新的原型
        arr.__proto__ = newPrototype;
        // 数组的每项，如果是数组，也指向新的原型。
        arr.forEach(observeArr);
    }

    // 不是对象或者数组的，什么都不做
}

/**
 * observeObj的部分
 **/
function observeObj(obj) {
    // 加上参数限制，必须是对象才有劫持，也是递归的终止条件
    if (typeof obj !== "object" || obj == null) {
        return;
    }
    // 新加！！！数组交给数组处理
    if (Array.isArray(obj)) {
        observeArr(obj);
        return;
    }
    // 是对象的话 才开始递归
    for (let key in obj) {
        // 直接使用 obj.hasOwnProperty会提示不规范
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            observeKey(obj, key);
            // 这里劫持该属性的属性值，如果不是对象直接返回，不影响
            observeObj(obj[key]);
        }
    }
    return obj;
}
function observeKey(obj, key) {
    let value = obj[key];
    Object.defineProperty(obj, key, {
        get() {
            console.log("读取属性", value);
            return value;
        },
        set(newValue) {
            console.log("设置属性", newValue);
            value = newValue;
        }
    });
}

/**
 * demo试试
 **/
let data = { a: 1, b: [1, 2, { c: 2 }] };
observeObj(data);
data.a = 2;
data.b.push([2, 3]);

let arr = [{ a: "数组里的对象" }, 3, 4];
observeArr(arr);
arr[0].a = 3;
