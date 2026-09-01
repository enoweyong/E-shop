const ProductCatalog = require("./ProductCatalog");

class ECommerceSystem {

    constructor() {
        this.catalog = new ProductCatalog();
        this.customers = [];
        this.orders = [];
    }

    registerCustomer(customer) {
        this.customers.push(customer);
    }

    addOrder(order) {
        this.orders.push(order);
    }

    listOrders() {
        if (this.orders.length === 0) {
            console.log("No orders available.");
            return;
        }

        this.orders.forEach(order => {
            if (order && typeof order.displayOrder === "function") {
                order.displayOrder();
            }
        });
    }
}

module.exports = ECommerceSystem;