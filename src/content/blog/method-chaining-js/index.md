---
author: "Sahil Rana"
image:
  url: "./titleImage.webp"
  alt: "chain-methods"
pubDate: 2024-06-28
title: Method Chaining in Javascript
description: "Chain Methods to add modularity"
slug: chain-javascript-methods
featured: true
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
// example -- here we are chaining methods here
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
    // Keeps a check if a form is submitted
    this.isSubmitted = false;

    // Main Error Object
    this.errors = {};

    // The Object To be Validated
    this.formObject = {};

    if (!isObject(validations))
      throw new Error(
        "Validation Schema must be a FormValidationSchema object!",
      );

    this.validationSchema = validations;
  }

  /**
   * Sets isSubmitted to false & resets the validation objects.
   */
  resetValidation() {
    this.isSubmitted = false;
    this.errors = {};
    this.formObject = {};
  }

  /**
   * Sets isSubmitted to true
   */
  submitted() {
    this.isSubmitted = true;
  }

  /**
   * Called when the form is submitted.
   * @param {object} obj latest form Object while Submitting the form.
   */
  submit(obj) {
    this.submitted();
    this.setFormObj(obj);
    this.validate();
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
   *
   * @param {object} obj Explictly set the new form object to the formObject
   */
  setFormObj(obj) {
    if (isObject(obj)) this.formObject = obj;
  }

  /**
   *
   * @param {object} latestObj observes the latest changes
   * @param {function} callback a callback function to run after new objects are updated and validated
   */
  observer(latestObj, callback) {
    if (
      this.isSubmitted &&
      isObject(latestObj) &&
      !isEqual(latestObj, this.formObject)
    ) {
      this.setFormObj(latestObj);
      this.validate();

      if (callback && typeof callback === "function") {
        callback(this.errors);
      }
    }
  }

  /**
   * Main Validation Function
   */
  validate() {
    /**
     * Main Loop over form object KEYS and VALUES
     */
    Object.entries(this.formObject).forEach(([key, value]) => {
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

   - Initializes instance variables such as isSubmitted, errors, formObject, and validationSchema.
   - Validates that the validations parameter is an object of FormValidationSchema.

3. Methods:
   - `resetValidation()`: Resets validation state by clearing isSubmitted, errors, and formObject.
   - `submitted()`: Sets isSubmitted flag to true.
   - submit(obj): Marks form as submitted, sets formObject, and triggers validation.
   - `hasErrors()`: Checks if any errors exist; returns false if no errors, otherwise returns this.errors.
   - `setFormObj(obj)`: Sets formObject if obj is a valid object.
   - `observer(latestObj, callback)`: Observes changes in formObject after submission, validates, and calls callback with errors if provided.
   - `validate()`: Main validation function that iterates over formObject keys, validates each field according to validationSchema, and populates errors accordingly.

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
  loginValidation.submit(loginFormData);
  if (loginValidation.hasErrors()) {
    // Handle error
    // Prevent submit
    return;
  }
  handleLogin(loginFormData);
}
```
