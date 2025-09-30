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
    "javascript string interpolation",
    "string interpolation in javascript",
    "es6 string interpolation",
    "javascript template literals",
    "javascript template strings",
    "string formatting javascript",
    "javascript variable in string",
    "js template literals example",
    "javascript dynamic strings",
    "string concatenation vs interpolation",
    "multiline string javascript",
    "interpolation javascript tutorial",
    "javascript insert variable into string",
    "javascript string replace variables",
    "javascript template string example",
    "JavaScript",
    "String Interpolation",
    "Template Literals",
    "Coding Tips",
    "Learn JavaScript",
    "JavaScript Tutorial",
    "Templating Security XSS",
    "Templating Best Practices",
    "Programming",
    "Software Development",
    "Sahil Rana",
    "web development tutorial",
    "intro to web development",
    "JavaScript tutorial",
    "dynamic JavaScript content",
    "learn JavaScript",
    "coding tips JavaScript",
    "web development tips",
  ]
---

# How to Convert Normal Strings to String Literals in JavaScript ?

## The Problem

Let's assume due to some reason you are going to store strings in a DB and during usage these strings needs to be filled with dynamic content.
So, here we are going to convert those plain string to string literals.

```javascript
const templateInNormalString = "Hello, ${name}! Today is ${day}.";
```

### Disclaimer:

We are going to use `new Function()` for the solution which executes whatever’s inside the template, so if templates or values come from untrusted users someone could run arbitrary JS or sneak in HTML. Be Careful!

## Solution

```javascript
function interpolate(template, params = {}) {
  // We accept an object `params` that maps placeholder names to values:
  // { name: "Alice", day: "Monday" }

  // Extract the property names from the params object.
  // e.g. names = ["name", "day"]
  const names = Object.keys(params);

  // Extract the corresponding values in the same order as keys.
  // e.g. vals = ["Alice", "Monday"]
  const vals = Object.values(params);

  // Create a new function dynamically where each key becomes an argument name,
  // and the function body returns a template literal built from `template` string.
  // Example body: return `Hello, ${name}! Today is ${day}.`;
  //
  // The call to the returned function immediately supplies the values via (...vals).
  // So effectively we do:
  //   (new Function("name", "day", "return `Hello, ${name}! Today is ${day}.`;"))("Alice", "Monday")
  //
  // Why this works:
  // - Template literals (backtick strings) evaluate embedded ${...} expressions in the function's scope.
  // - By naming the function arguments after the keys, the expressions inside ${} can reference those argument names.
  return new Function(...names, `return \`${template}\`;`)(...vals);
}
```

### Usage

Let's see how we can use our `interpolate` method to convert our template string into a string literal:

```javascript
// Usage example
const templateInNormalString = "Hello, ${name}! Today is ${day}.";

const result = interpolate(templateInNormalString, {
  name: "Alice",
  day: "Monday",
});

// Output the result
console.log(result); // Output: Hello, Alice! Today is Monday.
```

This method dynamically creates a function using `new Function` and passes the provided parameters into the function. Inside the function, the template string is evaluated with the provided values.

## How new Function() constructor works for this

#### Basic Syntax

```javascript
new Function([arg1[, arg2[, ...argN]],] functionBody)
```

#### Visualization

```javascript
const greet = new Function(
  "first",
  "last",
  "return `Hi ${first} ${last}, welcome!`;",
);
```

Is equivalent to defining.

```javascript
function greet(first, last) {
  return `Hi ${first} ${last}, welcome!`;
}
```

## Solution with prototype method

We'll define a prototype method on the `String` object called `interpolate`, which will accept an object containing key-value pairs to replace placeholders with actual values.

```javascript
String.prototype.interpolate = function (params) {
  // NOTE: default to an empty object to avoid runtime errors when `params` is undefined.
  params = params || {};

  const names = Object.keys(params);

  const vals = Object.values(params);

  // `this` is the string the method is called on (the template string).
  // Example: "Hello, ${name}" -> `this` === "Hello, ${name}"

  return new Function(...names, `return \`${this}\`;`)(...vals);
};
```

### Usage

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

#### Note : Works great, but changing built-in prototypes has pros and cons. Use it cautiously. Use this in small apps or controlled codebases.
