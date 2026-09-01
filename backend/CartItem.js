class CartItem{
    constructor(product, quantity){
        
        this.product = product
        this.quantity = quantity
    }
    getSubtotal(){
        return this.product.price * this.quantity;
    }
}
module.exports = CartItem;