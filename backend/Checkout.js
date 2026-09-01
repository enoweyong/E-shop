const Order = require("./Order");

class Checkout {
    static checkout(customer) {

        const order = new Order(Date.now(), 2);

        customer.shoppingCart.items.forEach(item => {
            order.addItem(item.product, item.quantity);
            item.product.updateStock(item.quantity);
        });

        customer.shoppingCart.clearCart();
        customer.placeOrder(order);

        return order;
    }
}

module.exports = Checkout;