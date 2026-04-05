from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils.text import slugify
from .models import Article, Page, Category, Tag
import logging

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=Article)
@receiver(pre_save, sender=Page)
def generate_content_slug(sender, instance, *args, **kwargs):
    """
    Automatically generates a unique slug for Article/Page if not provided.
    Appends a timestamp if slug already exists.
    """
    if not instance.slug:
        base_slug = slugify(instance.title)
        unique_slug = base_slug
        num = 1
        while sender.objects.filter(slug=unique_slug).exists():
            unique_slug = f"{base_slug}-{num}"
            num += 1
        instance.slug = unique_slug
        logger.debug(f"Generated slug '{instance.slug}' for {sender.__name__} '{instance.title}'")

@receiver(pre_save, sender=Category)
def generate_category_slug(sender, instance, *args, **kwargs):
    """
    Automatically generates a unique slug for Category if not provided.
    """
    if not instance.slug:
        base_slug = slugify(instance.name)
        unique_slug = base_slug
        num = 1
        while sender.objects.filter(slug=unique_slug).exists():
            unique_slug = f"{base_slug}-{num}"
            num += 1
        instance.slug = unique_slug
        logger.debug(f"Generated slug '{instance.slug}' for Category '{instance.name}'")

@receiver(pre_save, sender=Tag)
def generate_tag_slug(sender, instance, *args, **kwargs):
    """
    Automatically generates a unique slug for Tag if not provided.
    """
    if not instance.slug:
        base_slug = slugify(instance.name)
        unique_slug = base_slug
        num = 1
        while sender.objects.filter(slug=unique_slug).exists():
            unique_slug = f"{base_slug}-{num}"
            num += 1
        instance.slug = unique_slug
        logger.debug(f"Generated slug '{instance.slug}' for Tag '{instance.name}'")
```