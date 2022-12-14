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

  <table class="layui-table">
                    <tr>
                        <th style="width:5%">客户</th>
                        <td style="width:20%">
                            <span>{{Mb.ID}}</span>
                            <span>{{Mb.NickName}}</span>
                            <span>{{Mb.Account}}</span>
                            <span>{{Mb.CompanyName}}</span>
                            <span>{{Mb.PayType}}</span>
                        </td>
                        <th style="width:5%">订单编号</th>
                        <td style="width:20%">{{Info.OrderNo}}</td>
                        <th style="width:5%">状态</th>
                        <td style="width:20%"> 
                            <span class="" bf-class="Info.StatusIndex">
                                {{OrderData.Info.StatusName}}
                            </span>
                        </td>
                        <th style="width:5%">创建时间</th>
                        <td style="width:20%">{{Info.CreatedTime}}</td>
                    </tr>
                    <tr>
                        <th>支付方式</th>
                        <td> {{Info.PayType}}</td>
                        <th></th>
                        <td></td>
                        <th></th>
                        <td></td>
                        <th></th>
                        <td></td>
                    </tr>
                 
                </table>

    <script type="text/javascript">
  var ban = new Ban({
        data: {
            Search: {
                ID: LP.GetQueryString("id")
            },
           Info: { Id: 0, Status: 0, InnerRemark: "", Note: "", StatusName: "", StatusIndex:"tag0" },//订单主信息
         
        }
    });
    </script>
    
    
   
 官网地址:[官网](http://w0.wiki/article/219993.html)
