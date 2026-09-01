const OrderItem = require("./OrderItem");

class Order {
    constructor(orderId, customer) {
        this.orderId = orderId;
        this.customer = customer;
        this.items = [];
        this.status = 'pending';
    }

    get Items() {
        return this.items;
    }

    addItem(product, quantity) {
        this.items.push(new OrderItem(product, quantity));
    }

    calculateTotal() {
        return this.items.reduce((total, item) => total + item.getTotal(), 0);
    }

    completeOrder() {
        this.status = "completed";
    }

    cancelOrder() {
        this.status = "cancelled";
    }

    displayOrder() {
        console.log(`Order ID: ${this.orderId}`);
        console.log(`Customer: ${this.customer?.name ?? 'unknown customer'}`);
        console.log(`Status: ${this.status}`);
        this.items.forEach(item => {
            console.log(`${item.product?.name ?? 'unknown product'} x ${item.quantity} = $${item.getTotal()}`);
        });
        console.log(`Total: $${this.calculateTotal()}`);
    }
}

module.exports = Order;