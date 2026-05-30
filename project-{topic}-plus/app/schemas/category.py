```python
from app.extensions import ma
from app.models.category import Category

class CategorySchema(ma.SQLAlchemyAutoSchema):
    """
    Marshmallow schema for Category model.
    """
    class Meta:
        model = Category
        load_instance = True
        fields = (
            'id', 'name', 'slug', 'description',
            'created_at', 'updated_at'
        )
        dump_only = ('id', 'created_at', 'updated_at')

# Initialize schemas
category_schema = CategorySchema()
categories_schema = CategorySchema(many=True)
```