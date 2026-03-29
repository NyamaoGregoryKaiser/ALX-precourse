```typescript
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  isActive: boolean;
}

interface ProductFormProps {
  onSubmit: (data: Partial<ProductFormData>) => void;
  initialData?: ProductFormData;
  onCancel?: () => void;
}

const FormWrapper = styled.form`
  background-color: var(--light-color);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 2rem;
  border: 1px solid var(--border-color);
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-color);
  font-weight: bold;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  font-size: 1rem;
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  font-size: 1rem;
  min-height: 80px;
  resize: vertical;
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  margin-right: 0.5rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 1.5rem;
`;

const SubmitButton = styled.button`
  background-color: var(--success-color);
  &:hover {
    background-color: darken(var(--success-color), 10%);
  }
`;

const CancelButton = styled.button`
  background-color: var(--secondary-color);
  &:hover {
    background-color: darken(var(--secondary-color), 10%);
  }
`;

/**
 * Reusable form component for creating and editing products.
 * Handles form state and submission.
 */
const ProductForm: React.FC<ProductFormProps> = ({ onSubmit, initialData, onCancel }) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    isActive: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      // Reset form if no initial data (e.g., when adding new product)
      setFormData({ name: '', description: '', price: 0, isActive: true });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    // Optionally reset form after submission if not editing
    if (!initialData) {
      setFormData({ name: '', description: '', price: 0, isActive: true });
    }
  };

  return (
    <FormWrapper onSubmit={handleSubmit}>
      <FormGroup>
        <Label htmlFor="name">Product Name:</Label>
        <Input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </FormGroup>
      <FormGroup>
        <Label htmlFor="description">Description:</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup>
        <Label htmlFor="price">Price:</Label>
        <Input
          type="number"
          id="price"
          name="price"
          value={formData.price}
          onChange={handleChange}
          step="0.01"
          required
        />
      </FormGroup>
      <CheckboxGroup>
        <Checkbox
          id="isActive"
          name="isActive"
          checked={formData.isActive}
          onChange={handleChange}
        />
        <Label htmlFor="isActive">Active</Label>
      </CheckboxGroup>
      <ButtonGroup>
        {onCancel && (
          <CancelButton type="button" onClick={onCancel}>
            Cancel
          </CancelButton>
        )}
        <SubmitButton type="submit">
          {initialData ? 'Update Product' : 'Add Product'}
        </SubmitButton>
      </ButtonGroup>
    </FormWrapper>
  );
};

export default ProductForm;
```