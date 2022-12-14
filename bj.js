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
    set: function (target, prop, value) {
        //更新赋值 
        Bind.SetKeyVal(target, prop, value);
        //更新视图赋值 
        Bind.UpdateView(target, prop, value);

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
        return createProxy(data);
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
        Bind.Register(proxy);
        Bind.Reader(data);
        return proxy;

    }
}
