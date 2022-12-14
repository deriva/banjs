/*bj.js 双向绑定
 * author：liyi
 * updatetime:2022-12-14 09:16
 * desc：修复元素节点添加：class类绑定
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
    recomplie(elid, pre) {
        this.$data = _observe(JSON.parse(JSON.stringify(this.$data)), "", this);
        _compile(this.$el, this, elid);
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
                if (Array.isArray(dd)) {//是数组的话
                    var t1 = dd.find(x => x.primarykey == key);
                    if (typeof t1 != "object") {
                        val = t1;
                    } else {
                        dd = t1;
                        val = dd;
                    }
                } else {
                    if (key in dd) {
                        var t1 = dd[key];
                        if (typeof t1 != "object") {
                            val = t1;
                        } else {
                            dd = t1;
                            val = dd;
                        }
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
        var _key = "";
        var ischange = 0;
        if (keys.length > 1) {
            keys.forEach(function (key) {
                _key = key;
                if (Array.isArray(dd)) {//是数组的话
                    var t1 = dd.find(x => x.primarykey == key);
                    if (typeof t1 != "object") {
                        val = t1;
                    } else {
                        dd = t1;
                        val = dd;
                    }
                } else {

                    if (key in dd) {
                        var t1 = dd[key];
                        if (typeof t1 != "object" && dd[key] != value) {
                            dd[key] = value; ischange = 1;
                        } else {
                            dd = t1;
                        }
                    }
                }
            });
        } else {
            _key = exp;
            if (dd[exp] != value) { dd[exp] = value; ischange = 1; }
        }
        //值有变更的时候
        // bfUnilt.changeupdate(ischange, exp, dd, value, _key);

    },
    changeupdate: (ischange, keyname, dd, value, _key) => {
        if (ischange == 1) {
            //更新视图
            if (ban._binding[keyname]) {
                ban._binding[keyname].map(item => {
                    item.update();
                });
            }

            //新增值变更监听:并回调
            if (ban.watchinfo) {
                var pk = "";
                if (dd.hasOwnProperty("primarykey")) pk = dd["primarykey"];
                eval(ban.watchinfo + "('" + keyname + "','" + _key + "','" + value + "','" + pk + "')");
            }
        }
    }
}

function _observe(data, _pre, self) {
    if (!data || typeof data != 'object') {
        return;
    }
    var isArray = Array.isArray(data);
    // 取出所有属性遍历
    Object.keys(data).forEach(function (_k) {
        var key = _k;
        var afprex = _k;//尾缀
        //是数组
        if (isArray && data[_k] && data[_k].hasOwnProperty("primarykey")) {
            afprex = data[_k]["primarykey"];
        }
        if (key.indexOf("JBDetailLst") > -1)
            console.log(_k, key);
        if (_pre.length > 0) {
            key = _pre + "." + afprex;
        }

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
                return true;
            }
            if (typeof value == 'object')
                target[key] = _observe(value, _pre, self);
            if (target[key] != value) {
                Reflect.set(target, key, value, proxy);

                var keyname = _pre;
                if (_pre.length > 0) keyname = _pre + "." + key;
                //值有变更的时候
                bfUnilt.changeupdate(1, keyname, target, value, key);
                return true;

            }
            return false;
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
    let child = el.childNodes;
    // 遍历判断是否存在文本
    [...child].forEach((node) => {
        if (node.type == "text/html") return;
        // 如果node的类型是TEXT_NODE
        if (node.nodeType === 3) {
            _compile_Text(node, self);
            // 如果node的类型是ELEMENT_NODE
        } else if (node.nodeType === 1) {
            // 获取attr
            let attr = node.attributes
            // 判断是否存在v-model属性
            if (attr.hasOwnProperty('bf-model')) {
                _compile_bfmodel(node, self, attr);
            }
            else if (attr.hasOwnProperty('bf-html')) {
                _compile_bfhtml(node, self, attr);
            }
            else if (attr.hasOwnProperty('bf-class')) {
                _compile_bfclass(node, self, attr);
            }
            else if (attr.hasOwnProperty('v-for')) {
                _compile_vfor(node, self, attr);
            }

        }

        // 递归执行
        _compile(node, self)
    });
}
///解析text
function _compile_Text(node, self) {
    // 拿到文本内容
    let txt = node.textContent;
    if (txt.trim().length == 0) return;
    // 正则匹配
    let reg = /\{\{\s*([^\s\{\}]+)\s*\}\}/g
    if (reg.test(txt)) {
        let keyName = RegExp.$1;
        self._pushWatcher(new Watcher(node, 'txt', self, keyName));
        var val = bfUnilt._getVmVal(self.$data, keyName);
        if (typeof val != "object")
            (node.textContent = val);
        // 绑定自定义事件
        this.addEventListener(keyName, (e) => {
            // 替换成传进来的 detail
            node.textContent = txt.replace(reg, e.detail)
        })
    }
}

///解析bf-model
function _compile_bfmodel(node, self, attr) {
    // 获取v-model中绑定的值
    let keyName = attr['bf-model'].nodeValue;
    var val = bfUnilt._getVmVal(self.$data, keyName);

    if (typeof val != "object") {
        // 赋值给元素的value
        // node.value = val;//  
    }
    if (node.tagName == "INPUT") {
        node.value = val;// 

        if (node.type == "checkbox" || node.type == "radio") {
            self._pushWatcher(new Watcher(node, node.type, self, keyName));
            //更新视图
            if (self._binding[keyName]) {
                self._binding[keyName].map(item => {
                    item.update();
                });
            }
        } else {
            self._pushWatcher(new Watcher(node, 'val', self, keyName));
        }


        // 绑定事件
        node.addEventListener('input', (e) => {
            // 当事件触发的时候我们进行赋值  
            var val = node.value;
            if (node.type == "checkbox" || node.type == "radio") {
                var srcval = bfUnilt._getVmVal(self.$data, keyName);
                if (srcval == undefined) srcval = "";
                var valArr = srcval.toString().split(',');
                if (valArr[0] == "") valArr = [];
                var dataval = node.getAttribute("data-val");
                if (node.type == "checkbox") {
                    let deleteIndex = valArr.findIndex(item => item === dataval);
                    if (deleteIndex > -1) valArr.splice(deleteIndex, 1);
                }
                //清空0
                let deleteIndex2 = valArr.findIndex(item => item === "0");
                if (deleteIndex2 > -1) valArr.splice(deleteIndex2, 1);

                if (node.getAttribute("checked") == "checked") { node.removeAttribute("checked"); }
                else { node.setAttribute("checked", "checked"); valArr.push(dataval); }
                val = valArr.toString();
            }
            bfUnilt._setVmVal(self.$data, keyName, val);
        });

    }

    else if (node.tagName == "SELECT") {
        node.value = val;
        self._pushWatcher(new Watcher(node, 'val', self, keyName));
        // 绑定事件
        node.addEventListener('change', (e) => {
            // 当事件触发的时候我们进行赋值
            var val = node.value;
            bfUnilt._setVmVal(self.$data, keyName, val);
        });
    } else if (node.tagName == "IMG") {
        node.setAttribute("src", val);
        self._pushWatcher(new Watcher(node, 'src', self, keyName));
        // 绑定事件
        node.addEventListener('change', (e) => {
            // 当事件触发的时候我们进行赋值
            var val = node.getAttribute("src");
            bfUnilt._setVmVal(self.$data, keyName, val);
        });
    }
}

///解析bf-class
function _compile_bfclass(node, self, attr) {

    let keyName = attr['bf-class'].nodeValue;
    var val = bfUnilt._getVmVal(self.$data, keyName);
    if (val) { 
        node.setAttribute("class", val); 
    }

    // 判断是否存在bf-html属性
    self._pushWatcher(new Watcher(node, 'class', self, keyName));
}

///解析bf-html
function _compile_bfhtml(node, self, attr) {

    // 判断是否存在bf-html属性
    let keyName = attr['bf-html'].nodeValue;
    self._pushWatcher(new Watcher(node, 'html', self, keyName));
}
///解析v-for（暂未实现好）
function _compile_vfor(node, self) {
    // 获取v-model中绑定的值
    let keyName = attr['v-for'].nodeValue;

    var objkey = keyName.split('in')[1].trim();
    var lst = bfUnilt._getVmVal(ban.$data, objkey);
    lst.map((item) => {
        var p1 = node.cloneNode(true);
        p1.removeAttribute(keyName);
        node.parentNode.appendChild(p1);


    });
    self._pushWatcher(new Watcher(node, 'val', self, keyName));
    var val = bfUnilt._getVmVal(ban.$data, keyName);
    // 赋值给元素的value
    node.value = val;//  
    // 绑定事件
    node.addEventListener('input', (e) => {
        // 当事件触发的时候我们进行赋值  
        bfUnilt._setVmVal(ban.$data, keyName, node.value);
    })
}

/*

 watcher的作用是 链接Observer 和 Compile的桥梁，能够订阅并收到每个属性变动的通知，

 执行指令绑定的响应的回调函数，从而更新视图。

*/

class Watcher {

    constructor(node, attr, self, key) {

        this.node = node;

        this.attr = attr;

        // this.data = data;
        this.self = self;
        this.key = key;

    }

    update() {
        var vv = bfUnilt._getVmVal(this.self.$data, this.key);
        if (this.attr == "html")
            this.node.innerHTML = vv;
        else if (this.attr == "txt")
            this.node.textContent = vv;
        else if (this.attr == "val") {
            this.node.value = vv;
        } else if (this.attr == "class") {//设置类名 
            if (vv) {
                this.node.setAttribute("class", vv);
            }

        }
        else if (this.attr == "checkbox" || this.attr == "radio") {
            // this.node.value = vv;
            var dataval = this.node.getAttribute("data-val");
            if (vv == undefined) vv = "";
            var valArr = vv.toString().split(',');
            if (valArr[0] == "") valArr = [];
            let deleteIndex = valArr.findIndex(item => item === dataval);
            if (deleteIndex > -1) {
                this.node.setAttribute("checked", "checked")
            } else this.node.removeAttribute("checked");
        }
        else this.node.setAttribute(this.attr, vv);
    }
}
