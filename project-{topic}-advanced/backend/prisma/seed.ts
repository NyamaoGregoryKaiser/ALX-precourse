import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/utils/password.util';
import { config } from '../src/config/env.config';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Admin User
  const adminPassword = await hashPassword(config.adminPassword);
  let adminUser = await prisma.user.findUnique({ where: { email: config.adminEmail } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        name: 'Admin User',
        email: config.adminEmail,
        password: adminPassword,
        role: UserRole.ADMIN,
      },
    });
    console.log(`Created admin user: ${adminUser.email}`);
  } else {
    console.log(`Admin user already exists: ${adminUser.email}`);
  }

  // Create Categories
  const categoriesData = [
    { name: 'Electronics', slug: 'electronics', description: 'Gadgets and electronic devices' },
    { name: 'Books', slug: 'books', description: 'Various genres of books' },
    { name: 'Clothing', slug: 'clothing', description: 'Apparel for all seasons' },
    { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Essentials for your home' },
  ];

  const createdCategories = [];
  for (const catData of categoriesData) {
    let category = await prisma.category.findUnique({ where: { slug: catData.slug } });
    if (!category) {
      category = await prisma.category.create({
        data: {
          id: uuidv4(),
          ...catData,
        },
      });
      console.log(`Created category: ${category.name}`);
    } else {
      console.log(`Category already exists: ${category.name}`);
    }
    createdCategories.push(category);
  }

  const electronicsCategory = createdCategories.find(c => c.slug === 'electronics');
  const booksCategory = createdCategories.find(c => c.slug === 'books');
  const clothingCategory = createdCategories.find(c => c.slug === 'clothing');

  // Create Products
  const productsData = [
    {
      name: 'Smart TV 4K UHD',
      description: 'Experience stunning visuals with this 55-inch 4K UHD Smart TV.',
      price: 699.99,
      stock: 50,
      imageUrl: 'https://images.samsung.com/is/image/samsung/levant-uhd-au8000-ua55au8000u-frontblack-317135065?$720_576_PNG$',
      categoryId: electronicsCategory?.id,
    },
    {
      name: 'Wireless Bluetooth Headphones',
      description: 'Premium sound quality with noise-cancelling features and long battery life.',
      price: 129.99,
      stock: 120,
      imageUrl: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MR2N3?wid=1144&hei=1144&fmt=jpeg&qlt=95&.v=1682379374154',
      categoryId: electronicsCategory?.id,
    },
    {
      name: 'The Great Gatsby',
      description: 'A classic novel by F. Scott Fitzgerald exploring themes of decadence, idealism, and social upheaval.',
      price: 12.50,
      stock: 200,
      imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/71FTuJ9vD6L.jpg',
      categoryId: booksCategory?.id,
    },
    {
      name: 'TypeScript Deep Dive',
      description: 'A comprehensive guide to TypeScript for experienced JavaScript developers.',
      price: 35.00,
      stock: 80,
      imageUrl: 'https://basarat.gitbook.io/typescript/assets/cover.png',
      categoryId: booksCategory?.id,
    },
    {
      name: "Men's Casual T-Shirt",
      description: 'Comfortable and stylish cotton t-shirt, perfect for everyday wear.',
      price: 19.99,
      stock: 300,
      imageUrl: 'https://lp2.hm.com/hmgoepprod?set=source[/95/b7/95b71946399b1a510523ec366a7b7239031c5905.jpg],origin[dam],category[men_tshirtstanks_shortsleeve],type[DESCRIPTIVESTILLLIFE],res[w],hmver[2]&call=url[file:/product/main]',
      categoryId: clothingCategory?.id,
    },
    {
      name: "Women's Denim Jeans",
      description: 'High-waisted, slim-fit denim jeans with a modern wash.',
      price: 49.99,
      stock: 150,
      imageUrl: 'https://img.ltwebstatic.com/images3_pi/2021/04/09/1617942702a45a6c3848b3c37e1b54f9d268d052a6_thumbnail_900x.webp',
      categoryId: clothingCategory?.id,
    },
  ];

  for (const prodData of productsData) {
    if (prodData.categoryId) {
      let product = await prisma.product.findFirst({ where: { name: prodData.name } });
      if (!product) {
        product = await prisma.product.create({
          data: {
            id: uuidv4(),
            ...prodData,
            price: new prisma.Decimal(prodData.price), // Ensure Decimal type
          },
        });
        console.log(`Created product: ${product.name}`);
      } else {
        console.log(`Product already exists: ${product.name}`);
      }
    } else {
      console.warn(`Skipped product "${prodData.name}" due to missing category ID.`);
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });