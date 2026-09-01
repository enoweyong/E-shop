class OrderItem{
    constructor(product, quantity
    ){
        this.product = product
        this.quantity = quantity
    }
    getTotal(){
        return this.product.price * this.quantity
    }
}
module.exports = OrderItem;
