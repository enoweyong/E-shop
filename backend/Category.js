class Category{
    constructor(categoryId, name){
        this.categoryId = categoryId;
        this.name = name;
        this.products = []
    }
    addProduct(product){
        this.products.push(product);
    }
    listProducts(){
        this.products.forEach(product => product.displayProduct())
    }
}
module.exports = Category;