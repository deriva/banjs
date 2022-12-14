function EBind(options) {
    this._init(options);
}

// 根据所给的自定义参数，进行数据双向绑定的初始化工作
EBind.prototype._init = function (options) {
    // options是初始化时的数据，包括el,data,method
    this.$options = options;

    // el是需要管理的Element对象，el:#app this.$el:id为app的Element对象
    this.$el = document.querySelector(options.el);

    // 数据
    this.$data = options.data;

    // 方法
    this.$methods = options.methods;

    // _binding保存着model与view的映射关系，也就是Wachter的实例，当model更新的时候，更新对应的view
    this._binding = {};

    // 重写 this.$data的get和set方法
    this._obverse(this.$data);

    // 解析指令
    this._compile(this.$el);
}


// 该函数的作用：对所有的this.$data里面的属性进行监听，访问器监听，实现model到view层的数据通信。当model层改变的时候通知view层
EBind.prototype._obverse = function (currentObj, completeKey) {
    // 保存上下文
    var _this = this;

    // currentObj就是需要重写get/set的对象，Object.keys获取该对象的属性，得到的是一个数组
    // 对该数组进行遍历
    Object.keys(currentObj).forEach(function (key) {

        // 当且仅当对象自身的属性才监听
        if (currentObj.hasOwnProperty(key)) {

            // 如果是某一对象的属性，则需要以person.age的形式保存
            var completeTempKey = completeKey ? completeKey + '.' + key : key;

            // 建立需要监测属性的关联
            _this._binding[completeTempKey] = {
                _directives: [] // 存储所有使用该数据的地方
            };

            // 获取到当前属性的值
            var value = currentObj[key];

            // 如果值是对象，则遍历处理，对每个对象属性都完全监测
            if (typeof value == 'object') {
                _this._obverse(value, completeTempKey);
            }

            var binding = _this._binding[completeTempKey];

            // 修改对象的每一个属性的get和set，在get和set中添加处理事件
            Object.defineProperty(currentObj, key, {
                enumerable: true,
                configurable: true, // 避免默认为false
                get() {
                    return value;
                },
                set(v) {
                    // value保存当前属性的值
                    if (value != v) {
                        // 如果数据被修改，则需要通知每一个使用该数据的地方进行更新数据，也即：model通知view层，Watcher类作为中间层去完成该操作（通知操作）
                        value = v;
                        binding._directives.forEach(function (item) {
                            item.update();
                        })
                    }
                }
            })
        }
    })
}


// 该函数的作用是：对自定义指令进行编译，为其添加原生监听事件，实现view到model层的数据通信，也即当view层数据变化之后通知model层数据更新
// 实现原理：通过托管的element对象：this.$el，获取到所有的子节点，遍历所有的子节点，查看其是否有自定义属性，如果有指定含义的自定义属性
// 比如说：e-bind/e-model/e-click则根据节点上添加的自定义属性的不同为其添加监听事件
// e-click添加原生的onclick事件，这里主要注意点就是：需要将this.$method中指定方法的上下文this改为this.$data
// e-model为绑定的数据更新，这里只支持input,textarea标签，原因：采用标签自带的value属性实现的view到model层的数据通信
// e-bind
EBind.prototype._compile = function (root) {
    // 保存执行上下文
    var _this = this;

    // 获取到托管节点元素的所有子节点，只包括元素节点
    var nodes = root.children;

    for (let i = 0; i < nodes.length; i++) {
        // 获取到子节点/按顺序
        var node = nodes[i];

        // 如果当前节点有子节点，则继续逐层处理子节点
        if (node.children.length) {
            this._compile(node);
        }

        // 如果当前节点绑定了e-click属性，则需要为当前节点绑定onclick事件
        if (node.hasAttribute('e-click')) {
            // hasAttribute可以获取到自定义属性
            node.addEventListener('click',(function () {
                // 获取到当前节点的属性值，也就是方法
                var attrVal = node.getAttribute('e-click');
                // 由于绑定的方法里面的数据要使用data里面的数据，所以需要将执行的函数的上下文，也就是this改为this.$data
                // 而使用bind，不使用call/apply的原因是onclick方法需要触发之后才会执行，而不是立马执行
                return _this.$methods[attrVal].bind(_this.$data);
            })())
        }


        // 只对input和textarea标签元素可以施行双向绑定，原因：利用这两个标签的内置的value属性实现双向绑定
        if (node.hasAttribute('e-model') && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA')) {
            // 给element对象添加监听input事件 ，第二个参数是一个立即执行函数，获取到节点的索引值，执行函数内部代码，返回事件处理
            node.addEventListener('input', (function (index) {
                // 获取到当前节点的属性值，也就是方法
                var attrVal = node.getAttribute('e-model');

                // 给当前element对象添加model到view层的映射
                _this._binding[attrVal]._directives.push(new Watcher({
                    name: 'input',
                    el: node,
                    eb: _this,
                    exp: attrVal,
                    attr: 'value'
                }))

                // 如果input标签value值改变，此时需要更新model层的数据，也就是view层到model层的改变
                return function () {
                    // 获取到绑定的属性，以.为分隔符，如果只是一个值，就直接获取当前值，如果是个对象（obj.key）的形式，则绑定的其实obj对象
                    // 中的key的值，此时就需要获取到key，并对key进行赋值为已改变的input标签的value值
                    var keys = attrVal.split('.');

                    // 获取上一步得到的属性的集合中最后一个属性（最后一个属性才是真正被绑定的值）
                    var lastKey = keys[keys.length - 1];

                    // 获得真正被绑定的值的父对象
                    // 因为如果是对象，比如：obj.key.val，则需要找到key的引用，因为这里要改变的是val
                    // 通过引用key 从而改变val的值，但是如果直接获取到的val的引用，val是数值型存储，赋值给另一个变量的时候，其实是新开辟的一个空间
                    // 并不能直接改变model层也就是this.$data里面的数据，而引用数据存储的话，赋值给另一个变量，另一个变量的修改，会影响原来的引用的数据
                    // 所以这里需要找到真正被绑定值的父对象，也就是obj.key里面的obj值
                    var model = keys.reduce(function (value, key) {
                        // 如果不是对象，则直接返回属性value
                        if (typeof value[key] !== 'object') {
                            return value;
                        }

                        return value[key];
                        // 这里使用model层作为起始值，原因：keys里面记录的是this.$data里面的属性，所以需要从父对象this.$data出发去找目标属性
                    }, _this.$data);

                    // model也就是之前说得父对象，obj.key中的obj,而lastkey也就是真正被绑定的属性，找到了之后就需要对其更新为节点的值啦。
                    // 这里的model层被修改会触发_observe里面的访问器属性setter，所以如果其他地方也使用了这个属性的话，也会相应的发生改变哦
                    model[lastKey] = nodes[index].value;
                }
            })(i))
        }


        // 对节点上绑定e-bind，为其添加model到view的映射即可，原因：e-bind实现的是model到view的数据通信，而在this._observer中
        // 已经通过definePrototype实现了，所以这里只需要添加通信，便于在_oberver中实现。
        if(node.hasAttribute('e-bind')) {
            var attrVal = node.getAttribute('e-bind');
            _this._binding[attrVal]._directives.push(new Watcher({
                name: 'text',
                el: node,
                eb: _this,
                exp: attrVal,
                attr: 'innerHTML'
            }))
        }
    }
}

/**
 * options 属性：
 * name: 节点名称：文本节点：text, 输入框：input
 * el: 指令对应的DOM元素
 * eb: 指令对应的EBind实例
 * exp: 指令对应的值：e-bind="test";test就是指令对应的值
 * attr: 绑定的属性值, 比如：e-bind绑定的属性，其实会反应到innerHTML中，v-model绑定的标签会反应到value中
 */
function Watcher(options) {
    this.$options = options;
    this.update();
}

Watcher.prototype.update = function () {
    // 保存上下文
    var _this = this;
    // 获取到被绑定的对象
    var keys = this.$options.exp.split('.');

    // 获取到DOM对象上要改变的属性，对其进行更改
    this.$options.el[this.$options.attr] = keys.reduce(function (value, key) {
        return value[key];
    }, _this.$options.eb.$data)
}