import os
from dotenv import load_dotenv
from flask import Flask
from app import create_app, db
from app.models.user import User
from app.models.scraper_config import ScraperConfig
from app.models.scraping_job import ScrapingJob, JobStatus
from app.models.scraping_result import ScrapingResult
from datetime import datetime
import json

load_dotenv()

def seed_data(app):
    with app.app_context():
        db.create_all() # Ensure tables exist

        print("Seeding users...")
        if not User.query.filter_by(username='admin').first():
            admin_user = User(username='admin', email='admin@example.com', is_admin=True)
            admin_user.set_password('adminpassword')
            db.session.add(admin_user)
            print("  - Admin user created: admin/adminpassword")
        else:
            print("  - Admin user already exists.")

        if not User.query.filter_by(username='user1').first():
            user1 = User(username='user1', email='user1@example.com', is_admin=False)
            user1.set_password('user1password')
            db.session.add(user1)
            print("  - Regular user created: user1/user1password")
        else:
            print("  - Regular user already exists.")

        db.session.commit()

        admin_user = User.query.filter_by(username='admin').first()
        user1 = User.query.filter_by(username='user1').first()

        print("Seeding scraper configurations...")
        if not admin_user:
            print("Skipping scraper config seeding, admin user not found.")
        else:
            # Admin's scraper config
            product_scraper = ScraperConfig.query.filter_by(name='Product Page Scraper', user_id=admin_user.id).first()
            if not product_scraper:
                product_scraper = ScraperConfig(
                    user_id=admin_user.id,
                    name='Product Page Scraper',
                    start_url='https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html',
                    css_selectors=json.loads('''
                        {
                            "title": "h1",
                            "price": "p.price_color",
                            "stock_status": "p.instock.availability",
                            "product_description": "#product_description + p"
                        }
                    '''),
                    description='Scrapes title, price, stock, and description from a book product page on books.toscrape.com'
                )
                db.session.add(product_scraper)
                print(f"  - Admin's Product Page Scraper created (ID: {product_scraper.id if product_scraper.id else 'pending'})")
            else:
                print(f"  - Admin's Product Page Scraper already exists (ID: {product_scraper.id})")

            # Another admin scraper config
            category_scraper = ScraperConfig.query.filter_by(name='Category Page Scraper', user_id=admin_user.id).first()
            if not category_scraper:
                category_scraper = ScraperConfig(
                    user_id=admin_user.id,
                    name='Category Page Scraper',
                    start_url='https://books.toscrape.com/catalogue/category/books/travel_2/',
                    css_selectors=json.loads('''
                        {
                            "category_title": "div.page-header h1",
                            "first_book_title": "li.col-xs-6:nth-child(1) h3 a",
                            "first_book_price": "li.col-xs-6:nth-child(1) p.price_color"
                        }
                    '''),
                    description='Scrapes category title and details of the first book from a book category page.'
                )
                db.session.add(category_scraper)
                print(f"  - Admin's Category Page Scraper created (ID: {category_scraper.id if category_scraper.id else 'pending'})")
            else:
                print(f"  - Admin's Category Page Scraper already exists (ID: {category_scraper.id})")

        if not user1:
            print("Skipping scraper config seeding, user1 not found.")
        else:
            # User1's scraper config
            simple_scraper = ScraperConfig.query.filter_by(name='Simple Test Scraper', user_id=user1.id).first()
            if not simple_scraper:
                simple_scraper = ScraperConfig(
                    user_id=user1.id,
                    name='Simple Test Scraper',
                    start_url='https://books.toscrape.com/',
                    css_selectors=json.loads('''
                        {
                            "page_title": "h1",
                            "first_product_link": ".product_pod:nth-child(1) h3 a"
                        }
                    '''),
                    description='A basic scraper for the books.toscrape.com homepage.'
                )
                db.session.add(simple_scraper)
                print(f"  - User1's Simple Test Scraper created (ID: {simple_scraper.id if simple_scraper.id else 'pending'})")
            else:
                print(f"  - User1's Simple Test Scraper already exists (ID: {simple_scraper.id})")

        db.session.commit()

        # Retrieve configs again after commit to get their IDs
        product_scraper = ScraperConfig.query.filter_by(name='Product Page Scraper', user_id=admin_user.id).first()
        simple_scraper = ScraperConfig.query.filter_by(name='Simple Test Scraper', user_id=user1.id).first()

        print("Seeding scraping jobs (some completed, some pending)...")
        if product_scraper:
            # Completed Job for Admin
            if not ScrapingJob.query.filter_by(scraper_config_id=product_scraper.id, status=JobStatus.COMPLETED).first():
                completed_job_data = {
                    "title": "A Light in the Attic",
                    "price": "£51.77",
                    "stock_status": "In stock (22 available)",
                    "product_description": "It's a beautiful book about poetry and light."
                }
                job1 = ScrapingJob(
                    scraper_config_id=product_scraper.id,
                    user_id=admin_user.id,
                    status=JobStatus.COMPLETED,
                    started_at=datetime(2023, 1, 1, 10, 0, 0),
                    finished_at=datetime(2023, 1, 1, 10, 1, 0)
                )
                db.session.add(job1)
                db.session.commit() # Commit job to get ID for result
                db.session.add(ScrapingResult(
                    job_id=job1.id,
                    data=completed_job_data,
                    url=product_scraper.start_url
                ))
                print(f"  - Admin's COMPLETED job for Product Page Scraper (ID: {job1.id})")
            else:
                print(f"  - Admin's COMPLETED job for Product Page Scraper already exists.")

            # Pending Job for Admin
            if not ScrapingJob.query.filter_by(scraper_config_id=product_scraper.id, status=JobStatus.PENDING).first():
                job2 = ScrapingJob(
                    scraper_config_id=product_scraper.id,
                    user_id=admin_user.id,
                    status=JobStatus.PENDING
                )
                db.session.add(job2)
                print(f"  - Admin's PENDING job for Product Page Scraper (ID: {job2.id if job2.id else 'pending'})")
            else:
                print(f"  - Admin's PENDING job for Product Page Scraper already exists.")

        if simple_scraper:
            # Completed Job for User1
            if not ScrapingJob.query.filter_by(scraper_config_id=simple_scraper.id, status=JobStatus.COMPLETED).first():
                user1_completed_job_data = {
                    "page_title": "All products",
                    "first_product_link": "/catalogue/a-light-in-the-attic_1000/index.html"
                }
                job3 = ScrapingJob(
                    scraper_config_id=simple_scraper.id,
                    user_id=user1.id,
                    status=JobStatus.COMPLETED,
                    started_at=datetime(2023, 1, 5, 12, 0, 0),
                    finished_at=datetime(2023, 1, 5, 12, 0, 30)
                )
                db.session.add(job3)
                db.session.commit()
                db.session.add(ScrapingResult(
                    job_id=job3.id,
                    data=user1_completed_job_data,
                    url=simple_scraper.start_url
                ))
                print(f"  - User1's COMPLETED job for Simple Test Scraper (ID: {job3.id})")
            else:
                print(f"  - User1's COMPLETED job for Simple Test Scraper already exists.")

        db.session.commit()
        print("Data seeding complete.")


if __name__ == '__main__':
    # Set the FLASK_ENV for the seed script
    os.environ['FLASK_ENV'] = 'development'
    app = create_app()
    seed_data(app)
```