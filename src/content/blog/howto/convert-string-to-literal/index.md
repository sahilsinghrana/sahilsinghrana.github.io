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


## The Problem
 
Let's say due to any reason you are going to store strings in a DB and during usage these strings needs to be filled with dynamic content.
So, here we are going to convert those plain string to string literals.

```javascript
const templateInNormalString = "Hello, ${name}! Today is ${day}.";
```

## One Solution

We'll define a prototype method on the `String` object called `interpolate`, which will accept an object containing key-value pairs to replace placeholders with actual values.

```javascript
String.prototype.interpolate = function (params) {
  // `this` is the string the method is called on (the template string).
  // Example: "Hello, ${name}" -> `this` === "Hello, ${name}"
  //
  // We accept an object `params` that maps placeholder names to values:
  // { name: "Alice", day: "Monday" }
  //
  // NOTE: default to an empty object to avoid runtime errors when `params` is undefined.
  params = params || {};

  // Extract the property names from the params object.
  // e.g. names = ["name", "day"]
  const names = Object.keys(params);

  // Extract the corresponding values in the same order as keys.
  // e.g. vals = ["Alice", "Monday"]
  const vals = Object.values(params);

  // Create a new function dynamically where each key becomes an argument name,
  // and the function body returns a template literal built from `this`.
  // Example body: return `Hello, ${name}! Today is ${day}.`;
  //
  // The call to the returned function immediately supplies the values via (...vals).
  // So effectively we do:
  //   (new Function("name", "day", "return `Hello, ${name}! Today is ${day}.`;"))("Alice", "Monday")
  //
  // Why this works:
  // - Template literals (backtick strings) evaluate embedded ${...} expressions in the function's scope.
  // - By naming the function arguments after the keys, the expressions inside ${} can reference those argument names.
  return new Function(...names, `return \`${this}\`;`)(...vals);
};
```

This method dynamically creates a function using `new Function` and passes the provided parameters into the function. Inside the function, the template string is evaluated with the provided values.

##### Note:- As this uses ```new Function```, which executes whatever’s inside the template, so if templates or values come from untrusted users someone could run arbitrary JS or sneak in HTML (hello, XSS).

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

## Disclaimer

Works great — but changing built-in prototypes has pros and cons. Use it cautiously. Use this in small apps or controlled codebases.
