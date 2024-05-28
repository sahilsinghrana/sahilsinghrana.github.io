---
# layout: ../../layouts/MarkdownPostLayout.astro
author: "Sahil Singh Rana"
image:
  url: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExemtlejl5bXhrNG1la3Npcmw5czF0b3g4c3BlZnJpMHE4OWlheDh1aSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/FWtVYDHIxgGgE/giphy.webp"
  alt: "covert-string-to-literal placeholder image"
pubDate: 2024-05-28
title: How to convert string to string literal.
description: "A gist to show how to convert a normal string to string literal."
slug: covert-string-to-literal
tags: ["howTo", "javascript", "strings"]
---

Adds prototype method to interpolate normal string as string literals

```js
String.prototype.interpolate = function (params) {
  const names = Object.keys(params);
  const vals = Object.values(params);
  return new Function(...names, `return \`${this}\`;`)(...vals);
};
```

```js
// Usage
const templateInNormalString = "Example text: ${text}";
const result = templateInNormalString.interpolate({
  text: "Foo Boo",
});
console.log(result); // Example text: Foo Boo
```
