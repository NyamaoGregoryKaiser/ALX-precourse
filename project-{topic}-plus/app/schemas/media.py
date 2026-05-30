```python
from app.extensions import ma
from app.models.media import Media, MediaType
from app.schemas.user import UserSchema # For nesting uploader info

class MediaTypeSchema(ma.SQLAlchemyAutoSchema):
    """
    Marshmallow schema for MediaType model.
    """
    class Meta:
        model = MediaType
        load_instance = True
        fields = (
            'id', 'name', 'description',
            'created_at', 'updated_at'
        )
        dump_only = ('id', 'created_at', 'updated_at')

class MediaSchema(ma.SQLAlchemyAutoSchema):
    """
    Marshmallow schema for Media model.
    Includes nested schema for uploader and media type.
    """
    class Meta:
        model = Media
        load_instance = True
        include_fk = True # Include foreign keys like uploader_id, media_type_id
        fields = (
            'id', 'filename', 'filepath', 'alt_text', 'caption',
            'filesize', 'width', 'height', 'created_at', 'updated_at',
            'uploader_id', 'media_type_id', 'uploader', 'media_type'
        )
        dump_only = ('id', 'created_at', 'updated_at')

    # Nested schema for uploader
    uploader = ma.Nested(UserSchema, only=('id', 'username', 'email'), dump_only=True)
    # Nested schema for media_type
    media_type = ma.Nested(MediaTypeSchema, only=('id', 'name'), dump_only=True)

# Initialize schemas
media_type_schema = MediaTypeSchema()
media_types_schema = MediaTypeSchema(many=True)
media_schema = MediaSchema()
media_items_schema = MediaSchema(many=True)
```