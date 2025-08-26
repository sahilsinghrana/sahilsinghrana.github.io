---
author: "Sahil Singh Rana"
image:
  url: "./titleImage.webp"
  alt: "Convert Normal Strings to template literals in JavaScript"
pubDate: 2024-05-29
title: Convert Normal Strings to template literals in JavaScript
description: "Convert plain JavaScript strings into template literals for dynamic content interpolation."
slug: convert-string-to-literal
featured: true
tags:
  [
    "how To",
    "template",
    "JavaScript",
    "Template Literals",
    "String Interpolation",
    "Coding Tips",
    "Web Development",
    "Sahil Rana",
    "Programming",
    "Dynamic Content",
    "Software Development",
    "Learn JavaScript",
  ]
---

# How to Convert Normal Strings to String Literals in JavaScript ?

JavaScript strings are versatile, but wouldn't it be great if you could leverage the power of string literals for dynamic content interpolation? In this tutorial, we'll explore a simple method to achieve just that.

## The Problem

Consider a scenario where you have a string template with placeholders, and you want to dynamically insert values into those placeholders.

```javascript
const templateInNormalString = "Hello, ${name}! Today is ${day}.";
```

## The Solution

We'll define a prototype method on the `String` object called `interpolate`, which will accept an object containing key-value pairs to replace placeholders with actual values.

```javascript
// Define the interpolate method on the String prototype
String.prototype.interpolate = function (params) {
  // Extract keys and values from the params object
  const names = Object.keys(params);
  const vals = Object.values(params);

  // Dynamically create a function using new Function
  return new Function(...names, `return \`${this}\`;`)(...vals);
};
```

This method dynamically creates a function using `new Function` and passes the provided parameters into the function. Inside the function, the template string is evaluated with the provided values.

## Usage

Let's see how we can use our `interpolate` method to convert our template string into a string literal:

```javascript
// Usage example
const templateInNormalString = "Hello, ${name}! Today is ${day}.";

// Call the interpolate method with an object containing replacement values
const result = templateInNormalString.interpolate({
  name: "Alice",
  day: "Monday",
});

// Output the result
console.log(result); // Output: Hello, Alice! Today is Monday.
```

## Conclusion

By adding a simple prototype method, we've empowered JavaScript strings to behave like string literals. This technique can be particularly useful in scenarios where string templating is required, such as generating dynamic HTML or constructing complex messages.
