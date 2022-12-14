/**
 * **/
var handler = {
    get: function (target, prop) {
        var it = Bind.GetKeyVal(target, prop);
        if (it == "") return "";
        if (isNaN(it)) return it;
        else {
            var y = String(it).indexOf(".") + 1; //获取小数点的位置
            if (y > 0) {
                return parseFloat(it);
            } else {
                return parseInt(it);
            }
        }
    },
    set: function (target, prop, value, receiver) {
        //更新赋值 
        Bind.SetKeyVal(target, prop, value);
        //更新视图赋值 
        Bind.UpdateView(target, prop, value);
        // 创建一个自定义事件 CustomEvent [5]
        // 事件名称使用的是 prop
        let event = new CustomEvent(prop, {
            // 传入新的值
            detail: value,
        })
        // 派发 event 事件
       // window.dispatchEvent(event);

    },
    defineProperty: function (target, prop, descriptor) {
        console.log('called: ' + prop);
        Reflect.defineProperty(target, prop, descriptor);
    },
    construct: function (target, argumentsList, newTarget) {
        return {
            value: argumentsList[0] * 10
        };
    },
    ownKeys(target) {
        return Reflect.ownKeys(target);
    }
}
function createProxy(obj) {
    if (obj == null) return null;
    for (const key in obj) {
        if (typeof obj[key] === 'object') {
            obj[key] = addSubProxy(obj[key])
        }
    }
    if (obj) return new Proxy(obj, handler)
}

function addSubProxy(subObj) {
    if (subObj) {
        for (const key in subObj) {
            if (typeof subObj[key] === 'object') {
                subObj[key] = addSubProxy(subObj[key])
            }
        }
        //
        return new Proxy(subObj, handler)
    }
}
var Bind = {
    //绑定代理
    BindProxy: function (data) {
        var pr = createProxy(data);
 
        return pr;
    },

    // 渲染数据
    compile(el) {
        el = el || document.body;
        // 获取el的子元素
        let child = el.childNodes
            // 遍历判断是否存在文本
            ;[...child].forEach((node) => {
                // 如果node的类型是TEXT_NODE
                if (node.nodeType === 3) {
                    // 拿到文本内容
                    let txt = node.textContent
                    // 正则匹配
                    let reg = /\{\{\s*([^\s\{\}]+)\s*\}\}/g
                    if (reg.test(txt)) {
                        let $1 = RegExp.$1
                        this.$data[$1] &&
                            (node.textContent = txt.replace(reg, this.$data[$1]))
                        // 绑定自定义事件
                        this.addEventListener($1, (e) => {
                            // 替换成传进来的 detail
                            node.textContent = txt.replace(reg, e.detail)
                        })
                    }
                    // 如果node的类型是ELEMENT_NODE
                } else if (node.nodeType === 1) {
                    // 获取attr
                    let attr = node.attributes
                    // 判断是否存在v-model属性
                    if (attr.hasOwnProperty('v-model')) {
                        // 获取v-model中绑定的值
                        let keyName = attr['v-model'].nodeValue
                        // 赋值给元素的value
                        node.value = Bind.GetKeyVal(GData, keyName);//  this.$data[keyName]
                        // 绑定事件
                        node.addEventListener('input', (e) => {
                            // 当事件触发的时候我们进行赋值
                           // this.$data[keyName] = node.value
                            Bind.SetKeyVal(GData, keyName, node.value);
                        })
                    }
                    // 递归执行
                    Bind.compile(node)
                }
            })
    },

    SetKeyVal: (target, prop, value) => {
        var dd = target;
        if (typeof dd != "object") return;
        var keys = prop.split('.');
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
    },
    GetKeyVal: (target, prop) => {
        var dd = target;
        if (typeof dd != "object") return dd;
        // console.log(dd);
        var keys = prop.split('.');
        var val;
        keys.forEach(function (key) {
            if (key in dd) {
                var t1 = dd[key];
                if (typeof t1 != "object") {
                    val = t1;
                } else {
                    dd = t1;
                }

            }
        });
        return val;
    },
    /*
    更新视图
    */
    UpdateView: (target, prop, value) => {
        $("[bf-model='" + prop + "']").each(function (i, dom) {
            var tag_name = $(dom)[0].nodeName.toLowerCase();
            var type = $(dom).attr("type");
            if (tag_name == "input" || tag_name == "textarea" || tag_name ==
                "select") {
                if (type != undefined && (type == "radio" || type == "checkbox")) {
                    // $("[bf-model='" + prop + "'][value='" + value + "']").prop(
                    // 	"checked", true);

                } else {
                    $(dom).val(value);
                }
            } else {
                $(dom).html(value);
            }
        });


    },
    Register: function (proxy) {
        if ($("[bf-model]").length > 0) {
            $("[bf-model]").each(function (i, dom) {
                var type = $(dom).attr("type");
                var tag_name = $(dom)[0].nodeName.toLowerCase();
                if (tag_name === "input" || tag_name === "textarea" || tag_name === "select") {
                    if (type != undefined && (type == "radio" || type == "checkbox")) {
                        $(dom).unbind().bind("click", function (e) {
                            var it = $(this).attr("bf-model");
                            var val = [];
                            if ($(this).prop("checked")) {
                                val.push($(this).val());
                            }
                            GData[it] = val.toString();
                            if (typeof bindwatch != 'undefined') {
                                bindwatch(it, val.toString());
                            }
                        });
                    } else {
                        $(dom).unbind().bind("input", function (e) {
                            var it = $(this).attr("bf-model");
                            GData[it] = $(this).val();
                            if (typeof bindwatch != 'undefined') {
                                bindwatch(it, $(this).val());
                            }
                        });
                        $(dom).unbind().bind("change", function (e) {
                            var it = $(this).attr("bf-model");
                            GData[it] = $(this).val();
                            if (typeof bindwatch != 'undefined') {
                                bindwatch(it, $(this).val());
                            }
                        });
                    }
                }
            });

        }
    },
    Reader: (target) => {

        $("[bf-model]").each(function (i, dom) {
            var prop = $(dom).attr("bf-model");
            var tag_name = $(dom)[0].nodeName.toLowerCase();
            var value = Bind.GetKeyVal(target, prop);
            var type = $(dom).attr("type");
            if (tag_name == "input" || tag_name == "textarea" || tag_name == "select") {
                if (type != undefined && (type == "radio" || type == "checkbox")) {
                    $("[bf-model='" + prop + "'][value='" + value + "']").prop("checked", true);

                } else {
                    $(dom).val(value);
                }
            } else {
                $(dom).html(value);
            }
        });


    },
    Config: () => {

    },
    Init: (data) => {
        var proxy = Bind.BindProxy(data);
        Bind.compile();
       // Bind.Register(proxy);
       // Bind.Reader(data);
        return proxy;

    }
}
