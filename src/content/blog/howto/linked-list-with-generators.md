---
author: "Sahil Singh Rana"
image:
  url: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExemtlejl5bXhrNG1la3Npcmw5czF0b3g4c3BlZnJpMHE4OWlheDh1aSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/FWtVYDHIxgGgE/giphy.webp"
  alt: "linked-list-with-generators"
pubDate: 2024-05-29
title: Linked List with Javascript Generators and Iterators
description: "Learned how can we use Javascript generators in Linked Lists."
slug: linked-list-with-generators
tags: ["howTo", "javascript", "strings", "linked", "list", "generators", "iterators"]
---

# Combining the power of JS generators with Linked list.

lorem ipsum dor adore some aldd asj

## What are Linked Lists ?

- definition
- Usage
- Types

## What are generators and Iterators ?

- definition
- ES6


## Linked List Implementation structure
```javascript
const templateInNormalString = "Hello, ${name}! Today is ${day}.";
```

## Adding generators to linked list

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
