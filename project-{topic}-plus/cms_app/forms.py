from django import forms
from .models import Article, Page, Comment, Category, Tag, MediaFile

class ArticleForm(forms.ModelForm):
    categories = forms.ModelMultipleChoiceField(
        queryset=Category.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        required=False
    )
    tags = forms.ModelMultipleChoiceField(
        queryset=Tag.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        required=False
    )
    # Using ModelChoiceField for featured_image to show choice by title
    featured_image = forms.ModelChoiceField(
        queryset=MediaFile.objects.filter(media_type='image'),
        required=False,
        empty_label="No featured image"
    )

    class Meta:
        model = Article
        fields = ['title', 'slug', 'excerpt', 'content', 'status', 'published_at',
                  'categories', 'tags', 'featured_image']
        widgets = {
            'published_at': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
            'content': forms.Textarea(attrs={'rows': 15}),
            'excerpt': forms.Textarea(attrs={'rows': 5}),
        }
        help_texts = {
            'slug': 'Leave blank to auto-generate from title.',
            'published_at': 'Set to a future date to schedule publication.',
        }

    def clean(self):
        cleaned_data = super().clean()
        status = cleaned_data.get('status')
        published_at = cleaned_data.get('published_at')

        if status == 'published' and not published_at:
            # If content is published, published_at must be set (or will be set in model's save)
            # This validation ensures user understands it will be published now if they don't pick a date
            pass # The model's save method will handle setting published_at to now if not provided
        return cleaned_data

class PageForm(forms.ModelForm):
    categories = forms.ModelMultipleChoiceField(
        queryset=Category.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        required=False
    )
    tags = forms.ModelMultipleChoiceField(
        queryset=Tag.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        required=False
    )
    featured_image = forms.ModelChoiceField(
        queryset=MediaFile.objects.filter(media_type='image'),
        required=False,
        empty_label="No featured image"
    )
    parent_page = forms.ModelChoiceField(
        queryset=Page.objects.all(), # Can select any page as parent
        required=False,
        empty_label="No parent page"
    )

    class Meta:
        model = Page
        fields = ['title', 'slug', 'content', 'status', 'published_at',
                  'categories', 'tags', 'featured_image', 'parent_page', 'template_name']
        widgets = {
            'published_at': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
            'content': forms.Textarea(attrs={'rows': 15}),
        }
        help_texts = {
            'slug': 'Leave blank to auto-generate from title.',
            'published_at': 'Set to a future date to schedule publication.',
        }

    def clean(self):
        cleaned_data = super().clean()
        parent_page = cleaned_data.get('parent_page')

        if parent_page and self.instance and self.instance.pk == parent_page.pk:
            raise forms.ValidationError("A page cannot be its own parent.")

        return cleaned_data

class CommentForm(forms.ModelForm):
    class Meta:
        model = Comment
        fields = ['body']
        widgets = {
            'body': forms.Textarea(attrs={'rows': 4, 'placeholder': 'Write your comment here...'}),
        }
        labels = {
            'body': 'Your Comment',
        }

class CategoryForm(forms.ModelForm):
    class Meta:
        model = Category
        fields = ['name', 'slug', 'description']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
        }
        help_texts = {
            'slug': 'Leave blank to auto-generate from name.',
        }

class TagForm(forms.ModelForm):
    class Meta:
        model = Tag
        fields = ['name', 'slug']
        help_texts = {
            'slug': 'Leave blank to auto-generate from name.',
        }

class MediaFileForm(forms.ModelForm):
    class Meta:
        model = MediaFile
        fields = ['title', 'file', 'media_type', 'description']
        help_texts = {
            'file': 'Allowed extensions: jpg, jpeg, png, gif, pdf, doc, docx, mp4, mov.',
        }
```