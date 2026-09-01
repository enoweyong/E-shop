class Product {
    constructor(productId, name, description, price, stock, category){
        this.productId = productId;
        this.name = name;
        this.description = description;
        this.price = price;
        this.stock = stock;
        this.category = category;
    }

    updateStock(quantity){
        this.stock -= quantity;
    }
    restock(quantity){
        this.stock += quantity;
    }
    displayProduct(){
        console.log(`${this.name} ${this.description} $${this.price} stock: ${this.stock}`)
    }
}
module.exports = Product;