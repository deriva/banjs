/*bj.js 双向绑定
 * author：liyi
 * updatetime:2022-10-02 14:55
 * desc：修复$data单个属性取值问题
 * */


class Ban {
    constructor(options) {

        this.$el = options.el || document.body;
        this.$methods = options.methods;
        //   this.$data = options.data;
        this._binding = {};
        this.$data = _observe(options.data, "", this);
        this.watchinfo = options.watchinfo;//监听对象 值变更
        _compile(this.$el, this);
    }

    _pushWatcher(watcher) {
        if (!this._binding[watcher.key]) {
            this._binding[watcher.key] = [];
        }
        this._binding[watcher.key].push(watcher);

    }
    _toSelectDesc(bfmodel) {
        try {
            var obj = document.querySelector("[bf-model='" + bfmodel + "']");
            if ("selectedIndex" in obj) {
                var index = obj.selectedIndex; //序号，取当前选中选项的序号
                var val = obj.options[index].text;
                return val;
            }
        } catch (e) {
            throw (e);
        }
    }
}
var bfUnilt = {
    _getVmVal: (target, prop) => {
        if (typeof prop != 'string') return "";
        var dd = target;
        if (typeof dd != "object") return dd;
        var val;
        var keys = prop.split('.');
        if (keys.length > 1) {
            keys.forEach(function (key) {
                if (key in dd) {
                    var t1 = dd[key];
                    if (typeof t1 != "object") {
                        val = t1;
                    } else {
                        dd = t1;
                        val = dd;
                    }

                }
            });
        } else {
            val = dd[prop];
        }
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
        if (keys.length > 1) {
            keys.forEach(function (key) {
                if (key in dd) {
                    var t1 = dd[key];
                    if (typeof t1 != "object") {
                        dd[key] = value;
                    } else {
                        dd = t1;
                    }
                }
            });
        } else {
            dd[exp] = value;
        }
    },
}

function _observe(data, _pre, self) {
    if (!data || typeof data != 'object') {
        return;
    }
    // 取出所有属性遍历
    Object.keys(data).forEach(function (_k) {
        var key = _k;
        if (_pre.length > 0) key = _pre + "." + _k;

        // Proxy不允许绑定在非对象上
        if (data[_k] && typeof data[_k] === 'object') {
            data[_k] = _observe(data[_k], key, self);
        }


    });

    if (data) return defineReactive(data, _pre, self);
}


function defineReactive(data, _pre, self) {
    return new Proxy(data, {
        set(target, key, value, proxy) {
            // 进行数组操作时，会进行两次set 一次数据改变，一次length改变，两次改变data的值是不变，因此不应该多分发一次消息
            if (Object.prototype.toString.call(data) === "[object Array]" && key === "length") {
                //  Reflect.set(target, key, value, proxy);
                //target[key] = value;
                return true;
            }
            if (typeof value == 'object')
                target[key] = _observe(value, _pre, self);


            // target[key] = value;
            Reflect.set(target, key, value, proxy);

            var keyname = key;
            if (_pre.length > 0) keyname = _pre + "." + key;
            //更新视图
            if (self._binding[keyname]) {
                self._binding[keyname].map(item => {
                    item.update();
                });
            }

            //新增值变更监听:并回调
            if (self.watchinfo) {
                eval(self.watchinfo + "('" + keyname + "','" + key + "','" + value + "')");
            }

            return true;
        },
        get: function (target, prop) {
            var it = Reflect.get(target, prop);
            if (typeof it == 'object') return it;
            return it;

        },

    });
}
// 渲染数据
function _compile(el, self, elid) {

    el = el || document.body;
    if (elid && typeof elid == "string") {
        el = document.querySelector(elid);
    }
    // 获取el的子元素
    let child = el.childNodes
        // 遍历判断是否存在文本
        ;[...child].forEach((node) => {
            if (node.type == "text/html") return;
            // 如果node的类型是TEXT_NODE
            if (node.nodeType === 3) {
                // 拿到文本内容
                let txt = node.textContent;

                if (txt.trim().length == 0) return;
                if (txt == "测试") {
                    debugger;
                }
                // 正则匹配
                let reg = /\{\{\s*([^\s\{\}]+)\s*\}\}/g
                if (reg.test(txt)) {
                    let keyName = RegExp.$1;

                    self._pushWatcher(new Watcher(node, 'txt', self.$data, keyName));

                    var val = bfUnilt._getVmVal(self.$data, keyName);
                    if (typeof val != "object")
                        (node.textContent = val);
                    // 绑定自定义事件
                    this.addEventListener(keyName, (e) => {
                        // 替换成传进来的 detail
                        node.textContent = txt.replace(reg, e.detail)
                    })
                }
                // 如果node的类型是ELEMENT_NODE
            } else if (node.nodeType === 1) {
                // 获取attr
                let attr = node.attributes
                // 判断是否存在v-model属性
                if (attr.hasOwnProperty('bf-model')) {
                    // 获取v-model中绑定的值
                    let keyName = attr['bf-model'].nodeValue;


                    var val = bfUnilt._getVmVal(self.$data, keyName);

                    if (typeof val != "object") {
                        // 赋值给元素的value
                        node.value = val;//  
                    }
                    if (node.tagName == "INPUT") {
                        self._pushWatcher(new Watcher(node, 'val', self.$data, keyName));
                        node.value = val;//  
                        // 绑定事件
                        node.addEventListener('input', (e) => {
                            // 当事件触发的时候我们进行赋值  
                            var val = node.value;
                            if (node.type == "checkbox") {
                                if (node.getAttribute("checked") == "checked") { node.removeAttribute("checked"); val = ""; }
                                else { node.setAttribute("checked", "checked"); }
                            }
                            bfUnilt._setVmVal(self.$data, keyName, val);
                        });
                    }

                    else if (node.tagName == "SELECT") {
                        node.value = val;
                        self._pushWatcher(new Watcher(node, 'val', self.$data, keyName));
                        // 绑定事件
                        node.addEventListener('change', (e) => {
                            // 当事件触发的时候我们进行赋值
                            var val = node.value;
                            bfUnilt._setVmVal(self.$data, keyName, val);
                        });
                    } else if (node.tagName == "IMG") {
                        node.setAttribute("src", val);
                        self._pushWatcher(new Watcher(node, 'src', self.$data, keyName));
                        // 绑定事件
                        node.addEventListener('change', (e) => {
                            // 当事件触发的时候我们进行赋值
                            var val = node.getAttribute("src");
                            bfUnilt._setVmVal(self.$data, keyName, val);
                        });
                    }
                } else if (attr.hasOwnProperty('bf-html')) {
                    // 判断是否存在bf-html属性
                    let keyName = attr['bf-html'].nodeValue;
                    self._pushWatcher(new Watcher(node, 'html', self.$data, keyName));
                    var val = bfUnilt._getVmVal(self.$data, keyName);
                }
                if (attr.hasOwnProperty('v-for')) {
                    // 获取v-model中绑定的值
                    let keyName = attr['v-for'].nodeValue;

                    var objkey = keyName.split('in')[1].trim();
                    var lst = bfUnilt._getVmVal(self.$data, objkey);
                    lst.map((item) => {
                        var p1 = node.cloneNode(true);
                        p1.removeAttribute(keyName);
                        node.parentNode.appendChild(p1);


                    });




                    self._pushWatcher(new Watcher(node, 'val', self.$data, keyName));
                    var val = bfUnilt._getVmVal(self.$data, keyName);
                    // 赋值给元素的value
                    node.value = val;//  
                    // 绑定事件
                    node.addEventListener('input', (e) => {
                        // 当事件触发的时候我们进行赋值  
                        bfUnilt._setVmVal(self.$data, keyName, node.value);
                    })
                }

            }

            // 递归执行
            _compile(node, self)
        })
}



/*

 watcher的作用是 链接Observer 和 Compile的桥梁，能够订阅并收到每个属性变动的通知，

 执行指令绑定的响应的回调函数，从而更新视图。

*/

class Watcher {

    constructor(node, attr, data, key) {

        this.node = node;

        this.attr = attr;

        this.data = data;

        this.key = key;

    }

    update() {
        var vv = bfUnilt._getVmVal(this.data, this.key);
        if (this.attr == "html")
            this.node.innerHTML = vv;
        else if (this.attr == "txt")
            this.node.textContent = vv;
        else if (this.attr == "val")
            this.node.value = vv;
        else this.node.setAttribute(this.attr, vv);
    }

}
