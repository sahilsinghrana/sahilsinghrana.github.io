---
author: "Sahil Rana"
image:
  url: "./titleImage.webp"
  alt: "chain-methods"
pubDate: 2024-06-28
title: Method Chaining in Javascript
description: "Chain Methods to add modularity"
slug: chain-javascript-methods
tags:
  [
    "method",
    "chaining",
    "javascript",
    "modules",
    "oops",
    "oopj",
    "object",
    "oriented",
    "js",
    "Sahil",
    "Rana",
  ]
---

# Method Chaining in Javascript

Method chaining in JavaScript allows us to link multiple method calls together in a single statement, enhancing code readability and modularity. In this blog post, we'll delve into how method chaining works and why it's beneficial for building modular features.

### Table Of Contents

- [Method Chaining in Javascript](#method-chaining-in-javascript)
  - [Why?](#why)
  - [How?](#how)
  - [Create form schema validator](#our-own-custom-form-schema-validator)
    - [FormValidator.js](#formvalidatorjs)
    - [FormValidationSchema.js](#formvalidationschemajs)
    - [ValidationMethods.js](#validationmethodsjs)
  - [Usage](#usage)

## Why?

Method chaining promotes modularity in code by allowing us to sequentially call methods on an object or a function's return value. This approach streamlines the process of adding or removing functionalities in a structured manner.

## How?

```javascript
// example -- chaining methods
const formSchema = {
  firstName: new FormValidationSchema().string().isRequired(),
};
```

In the example above, ```FormValidationSchema.string().isRequired()``` demonstrates method chaining by sequentially invoking methods (```string()``` and ```isRequired()```) on the FormValidationSchema object. This chaining technique allows us to define validation rules in a concise and readable manner.

## Our own custom form schema validator

To understand how it works we'll create our own schema validator like zod.

#### FormValidator.js

```javascript
// FormValidator.js
export class FormValidator {
  /**
   * constructor
   * @param {object} validations An Object of keys to be validated
   * {
   *   first_name : new FormValidationSchema().isRequired().email(),
   * }
   */
  constructor(validations) {
    // Main Error Object
    this.errors = {};

    if (!isObject(validations))
      throw new Error(
        "Validation Schema must be a FormValidationSchema object!",
      );

    this.validationSchema = validations;
  }

  /**
   *
   * @returns false if there are no errors else an Object of errors.
   */
  hasErrors() {
    if (Object.keys(this.errors).length <= 0) return false;
    return this.errors;
  }

  /**
   * Main Validation Function
   */
  validate(formData) {
    /**
     * Main Loop over form object KEYS and VALUES
     */
    Object.entries(formData).forEach(([key, value]) => {
      if (
        // Checks if a key with the FormObject exists in the schema
        this.validationSchema[key] &&
        //  Checks if validations are supplied in the schemaObject for the particular key
        this.validationSchema[key]?.validations &&
        // checks the length of validations array if it exists.
        this.validationSchema[key]?.validations?.length >= 0
      ) {
        // Destructuring all the available validations for the current Iteration key
        let validations = this.validationSchema[key]?.validations;

        // Looping over the validations for the current key
        for (let i = 0; i < validations.length; i++) {
          let isValid = validations[i]?.method(
            value,
            ...(validations[i]?.props || []),
          );
          if (!isValid) {
            this.errors[key] = {
              message: validations[i]?.message,
              type: validations[i]?.type,
            };
            break;
          } else {
            if (this.errors[key]?.type === validations[i]?.type) {
              delete this.errors[key];
            }
          }
        }
      }
    });
  }
}
```

1. Class Definition:

   - The FormValidator class is exported to provide form validation functionality.

2. Constructor:

   - Initializes instance variables such as errors and validationSchema.
   - Validates that the validations parameter is an object of FormValidationSchema.

3. Methods:
   - `hasErrors()`: Checks if any errors exist; returns false if no errors, otherwise returns this.errors.
   - `validate(formData)`: Main validation function that iterates over formData keys, validates each field according to validationSchema, and populates errors accordingly.

#### FormValidationSchema.js

```javascript
// FormValidationSchema.js
export class FormValidationSchema {
  constructor() {
    this.validations = [];
  }

  /**
   * @returns an Array of all the validation Rules.
   */
  getValidations() {
    return this.validations;
  }

  /**
   * Function to check if check if the a value is entered or not by the user.
   * @param {String} message Custom Message if an error is produced
   * @returns the instance of the schema object
   */
  isRequired(message) {
    this.validations.push({
      method: ValidationMethods.isRequired,
      message: message || "The field cannot be empty!",
      type: "required",
    });
    return this;
  }

  /**
   * Function to check if the entered email is valid
   * @param {String} message Custom MEssage if an error is produced
   * @returns the instance of the schema object
   */
  email(message) {
    this.validations.push({
      method: ValidationMethods.validEmail,
      message: message || "Please Enter a valid Email!",
      type: "email",
    });
    return this;
  }

  /**
   * Function to check if the supplied value is an object.
   * @param {String} message Custom MEssage if an error is produced
   * @returns the instance of the schema object
   */
  object(message) {
    this.validations.push({
      method: ValidationMethods.isObject,
      message: message || "Not a valid Object!",
      type: "object",
    });
    return this;
  }

  /**
   *
   * @param {*} minLength Valid minimum length
   * @param {*} message Custom message
   */
  min(minLength, message) {
    this.validations.push({
      method: ValidationMethods.min,
      message: message || `Atleast ${minLength} characters are required.`,
      type: "min",
      props: [minLength],
    });
    return this;
  }
  /**
   *
   * @param {*} maxLength maximum valid length
   * @param {*} message Custom message
   * @returns validation instance
   */
  max(maxLength, message) {
    this.validations.push({
      method: ValidationMethods.max,
      message: message || `maximum ${maxLength} characters allowed.`,
      type: "max",
      props: [maxLength],
    });
    return this;
  }
}
```

1. Imports and Class Definition:

    - The FormValidationSchema class is defined to manage validation rules for form fields.

2. Constructor:

    - Initializes the FormValidationSchema class with an empty validations array in the constructor.

3. Methods:
    - ```getValidations()``` retrieves the array of validation rules (this.validations).
    isRequired(message) Method:

    - ```isRequired(message)``` defines a validation rule for required fields. It pushes an object into this.validations array with properties method, message, and type specific to "required" validation.

    - Similarly other validations methods like ```object```, ```min``` and ```max``` are defined

#### ValidationMethods.js

```javascript
// ValidationMethods.js
export class ValidationMethods {
  static isRequired(value) {
    if (value === "" || value === undefined || value === null) return false;
    return true;
  }

  static validEmail(value) {
    if (emailRegex.test(value)) return true;
    return false;
  }

  static isObject(value) {
    if (isObject(value)) return true;
    return false;
  }

  /**
   *
   * @param {*} value Value to be validated
   * @param {*} minLength minimum length to be accepted
   */
  static min(value, minLength) {
    if (value?.length >= minLength) return true;
    return false;
  }

  /**
   *
   * @param {*} value Value to be validated
   * @param {*} maxLength Maximum valid Length
   * @returns boolean if is valid or not
   */
  static max(value, maxLength) {
    if (value?.length <= maxLength) return true;
    return false;
  }
}
```

### BD

- Defines a `ValidationMethods` class with static methods for various validation checks.
- **`isRequired(value)`**: Checks if the `value` is not empty, undefined, or null.
- **`validEmail(value)`**: Validates if the `value` is a valid email address.
- **`isObject(value)`**: Checks if the `value` is an object.
- **`min(value, minLength)`**: Validates if a string `value` meets a minimum length requirement.
- **`max(value, maxLength)`**: Validates if a string `value` meets a maximum length requirement.

Each method performs a specific validation based on its parameters and returns a boolean indicating the validation result.

## Usage

```javascript
import { FormValidation, FormValidationSchema } from "./FormValidator";

const loginValidationSchema = {
  email: new FormValidationSchema()
    .isRequired("Email is Required")
    .email("Please Enter Valid Email"),
  password: new FormValidationSchema()
    .isRequired("Password is Required")
    .min(6),
};

const loginValidation = new FormValidation(loginValidationSchema);

function onSubmit(e) {
  loginValidation.validate(loginFormData);
  if (loginValidation.hasErrors()) {
    // Handle error
    // Prevent submit
    return;
  }
  handleLogin(loginFormData);
}
```

### Breakdown

#### Import Statements

```javascript
import { FormValidation, FormValidationSchema } from "./FormValidator";
```
- Imports `FormValidation` and `FormValidationSchema` classes from the `FormValidator.js` module.

#### loginValidationSchema Definition

```javascript
const loginValidationSchema = {
  email: new FormValidationSchema()
    .isRequired("Email is Required")
    .email("Please Enter Valid Email"),
  password: new FormValidationSchema()
    .isRequired("Password is Required")
    .min(6),
};
```
- Defines `loginValidationSchema` object:
  - **email**: Sets up validation rules for the email field using `FormValidationSchema`:
    - `.isRequired("Email is Required")`: Specifies that the email field must not be empty.
    - `.email("Please Enter Valid Email")`: Ensures the input conforms to a valid email format.
  - **password**: Configures validation rules for the password field using `FormValidationSchema`:
    - `.isRequired("Password is Required")`: Ensures the password field must not be empty.
    - `.min(6)`: Specifies a minimum length requirement of 6 characters for the password.

#### FormValidation Instance

```javascript
const loginValidation = new FormValidation(loginValidationSchema);
```
- Creates an instance of `FormValidation` with `loginValidationSchema` to validate form data based on defined rules.
