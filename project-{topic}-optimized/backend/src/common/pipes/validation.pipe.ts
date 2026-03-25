import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * A custom validation pipe that leverages `class-validator` and `class-transformer`.
 * This pipe automatically validates incoming request payloads against DTOs.
 * It transforms plain objects from the request body into instances of DTOs,
 * validates them, and throws a BadRequestException if validation fails.
 *
 * Although NestJS provides a global ValidationPipe, this example demonstrates
 * how a custom pipe can be created and used. It's especially useful for
 * specific validation scenarios or when you need more control over the validation process.
 */
@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  /**
   * Transforms and validates the incoming value.
   * @param value The value to be transformed and validated.
   * @param metadata Metadata about the argument being processed.
   * @returns The validated value, or throws an error if validation fails.
   * @throws {BadRequestException} If validation fails.
   */
  async transform(value: any, { metatype }: ArgumentMetadata) {
    // If no metatype is provided or it's a primitive type, just return the value.
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Convert the plain JavaScript object to an instance of the DTO class.
    const object = plainToInstance(metatype, value);

    // Validate the object against the validation rules defined in the DTO.
    const errors = await validate(object, {
      whitelist: true, // Strips properties that are not defined in the DTO.
      forbidNonWhitelisted: true, // Throws an error if non-whitelisted properties are present.
    });

    // If there are validation errors, throw a BadRequestException.
    if (errors.length > 0) {
      // Map validation errors to a more readable format.
      const messages = errors.map((error) => {
        const constraints = Object.values(error.constraints || {});
        return `Property '${error.property}' failed validation: ${constraints.join(', ')}`;
      });
      throw new BadRequestException(messages);
    }

    return object;
  }

  /**
   * Checks if the given metatype should be validated.
   * @param metatype The metatype of the argument.
   * @returns {boolean} True if validation should occur, false otherwise.
   */
  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}