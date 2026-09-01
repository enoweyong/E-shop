class Category{
    constructor(categoryId, name){
        this.categoryId = categoryId;
        this.name = name;
        this.products = []
    }
    addProduct(product){
        this.products.push(product);
    }
    ListProducts(){
        this.products.forEach(product => product.displayProduct())
    }
    listProducts(){
        this.ListProducts();
    }
}
module.exports = Category;