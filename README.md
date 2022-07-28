# banjs
js实现数据双向绑定(访问器监听)-起名:板
双向绑定基于MVVM模型：model-view-viewModel

model: 模型层，负责业务逻辑以及与数据库的交互
view：视图层，负责将数据模型与UI结合，展示到页面中
viewModel：视图模型层，作为model和view的通信桥梁

双向绑定的含义：当model数据发生变化的时候，会通知到view层，当用户修改了view层的数据的时候，会反映到模型层。

而双向数据绑定的好处在于：只关注于数据操作，DOM操作减少

Vue.js实现的原理就是采用的访问器监听，所以这里也采用访问器监听的方式实现简单的数据双向绑定。

访问器监听的实现，主要采用了javascript中原生方法：Object.defineProperty，该方法可以为某对象添加访问器属性，当访问或者给该对象属性赋值的时候，会触发访问器属性，因此利用此思路，可以在访问器属性中添加处理程序。

demo:

<div id="app">
        <input type="text" b-m="title.msg">
        <input type="text" b-m="title.msg2">
        <input type="button" b-e:click="P.Msg(1,'assa3')" value="click">
        <input type="button" b-e:dblclick="P.Msg(0,'dbclickQ')" value="dbclick">
        {{title.msg}}
        测试2

        {{title.msg2}}

        {{name}}
        name:  <span b-m="info.name"></span>
        age:<span b-m="info.age"></span>
        <hr />
        {{info.name}}
        <h2 b-e:click="P.A2()">{{info.age}}</h2>
        <table class="layui-table">
            <thead><tr><th>n</th><th>a</th></tr></thead>
            <tbody>
                <tr b-for="(it,a) in lst" >
                    <td>{{it.n}}</td>
                    <td>{{it.a}}</td>
                </tr>
            </tbody>
        </table>
    </div>
    <script type="text/javascript">

        var P = {
            Msg: (a, v) => {
                layer.msg(a + "-" + v + "-" + App.$data.title.msg);
            },
            A2: () => {
                layer.msg(23);
            }
        }
        let App = new Ban({
            // el: "#app",
            el: "#app",
            data: {
                info: { name: "lity", age: 20 },
                lst: [
                    { n: "ljx1", a: 20 },
                    { n: "lj2x2", a: 30 },
                    { n: "lj2x3", a: 31 },
                    { n: "lj22x4", a: 32 }
                ],
                title: {
                    msg: "MVVM原理编译",
                    msg2: "我是测试的"
                },
            }
        })


    </script>
    
    
    官网地址:[官网](http://w0.wiki/article/219993.html)
