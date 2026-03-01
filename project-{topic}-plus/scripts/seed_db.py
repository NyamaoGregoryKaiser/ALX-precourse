```python
import uuid
from decimal import Decimal
from app import db
from app.models import User, Category, Product, Cart, UserRole, OrderStatus
from app.services.product_service import CategoryService # Re-use category creation logic

def seed_all_data(app):
    with app.app_context():
        # Clear existing data
        db.drop_all()
        db.create_all()

        print("Seeding Users...")
        # Create users
        admin_user = User(id=uuid.uuid4(), username='admin', email='admin@example.com', role=UserRole.ADMIN)
        admin_user.password = 'adminpass'
        db.session.add(admin_user)

        customer_user = User(id=uuid.uuid4(), username='testuser', email='test@example.com', role=UserRole.CUSTOMER)
        customer_user.password = 'testpass'
        db.session.add(customer_user)

        db.session.flush() # Flush to get user IDs for carts

        # Create carts for users
        admin_cart = Cart(user_id=admin_user.id)
        customer_cart = Cart(user_id=customer_user.id)
        db.session.add(admin_cart)
        db.session.add(customer_cart)

        db.session.commit()
        print("Users and Carts seeded.")

        print("Seeding Categories...")
        # Create categories
        electronics_data = {"name": "Electronics", "description": "Gadgets and electronic devices"}
        clothing_data = {"name": "Clothing", "description": "Apparel for all seasons"}
        books_data = {"name": "Books", "description": "Novels, non-fiction, and more"}

        electronics = CategoryService.create_category(electronics_data)
        clothing = CategoryService.create_category(clothing_data)
        books = CategoryService.create_category(books_data)

        print("Categories seeded.")

        print("Seeding Products...")
        # Create products
        products_to_seed = [
            {
                "name": "Smartphone X",
                "description": "Latest model smartphone with advanced features.",
                "price": Decimal("799.99"),
                "stock": 50,
                "image_url": "https://m.media-amazon.com/images/I/71u9zEa5UJL._AC_UF1000,1000_QL80_.jpg",
                "category_id": electronics['id']
            },
            {
                "name": "Wireless Headphones",
                "description": "Noise-cancelling over-ear headphones.",
                "price": Decimal("149.99"),
                "stock": 120,
                "image_url": "https://m.media-amazon.com/images/I/61SUj2ZzmWL._AC_UF894,1000_QL80_.jpg",
                "category_id": electronics['id']
            },
            {
                "name": "Men's T-Shirt",
                "description": "Comfortable cotton t-shirt for everyday wear.",
                "price": Decimal("25.00"),
                "stock": 200,
                "image_url": "https://lp2.hm.com/hmgoepprod?set=source[/91/73/9173f4439c368d5423f2f89d31d9999557b77873.jpg],origin[dam],category[men_tshirtstanks_tshirts],type[DESCRIPTIVESTILLLIFE],res[w],hmver[1]&call=url[file:/product/miniature]",
                "category_id": clothing['id']
            },
            {
                "name": "Women's Jeans",
                "description": "Stylish slim-fit jeans.",
                "price": Decimal("59.99"),
                "stock": 80,
                "image_url": "https://lsco.scene7.com/is/image/lsco/a19590001-front-pdp?fmt=jpeg&qlt=70&resMode=bisharp&fit=crop:2000:1800",
                "category_id": clothing['id']
            },
            {
                "name": "The Great Gatsby",
                "description": "Classic novel by F. Scott Fitzgerald.",
                "price": Decimal("12.50"),
                "stock": 300,
                "image_url": "https://m.media-amazon.com/images/I/71tQ5qE0GDL._AC_UF1000,1000_QL80_.jpg",
                "category_id": books['id']
            },
            {
                "name": "Python Programming Book",
                "description": "A comprehensive guide to Python programming.",
                "price": Decimal("45.00"),
                "stock": 150,
                "image_url": "https://m.media-amazon.com/images/I/81M1z34+JTL._AC_UF1000,1000_QL80_.jpg",
                "category_id": books['id']
            },
        ]

        for p_data in products_to_seed:
            product = Product(
                id=uuid.uuid4(),
                name=p_data['name'],
                slug=p_data['name'].lower().replace(' ', '-'),
                description=p_data['description'],
                price=p_data['price'],
                stock=p_data['stock'],
                image_url=p_data['image_url'],
                category_id=p_data['category_id']
            )
            db.session.add(product)
        db.session.commit()
        print("Products seeded.")

        # Example: Add some items to customer's cart
        print("Seeding Cart Items...")
        smartphone = Product.query.filter_by(name="Smartphone X").first()
        tshirt = Product.query.filter_by(name="Men's T-Shirt").first()

        if smartphone and tshirt:
            cart = Cart.query.filter_by(user_id=customer_user.id).first()
            if cart:
                cart_item1 = CartItem(cart_id=cart.id, product_id=smartphone.id, quantity=1)
                cart_item2 = CartItem(cart_id=cart.id, product_id=tshirt.id, quantity=2)
                db.session.add(cart_item1)
                db.session.add(cart_item2)
                db.session.commit()
                print("Customer cart seeded with items.")
            else:
                print("Customer cart not found for seeding items.")
        else:
            print("Required products not found for seeding cart items.")

        print("Database seeding complete!")

if __name__ == '__main__':
    from manage import app # Import the app instance from manage.py
    seed_all_data(app)
```