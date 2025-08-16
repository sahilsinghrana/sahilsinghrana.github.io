---
author: "Sahil Rana"
image:
  url: "./titleImage.gif"
  alt: "Bitwise Operators: An Usecase (Bitmask)"
pubDate: 2024-06-28
title: "Bitwise Operators: An Usecase (Bitmask)"
description: "Where the hell are bitwise operators used ??"
slug: bitwise-operators-usecase
featured: true
tags:
  [
    "JavaScript",
    "Bitwise operators usecase",
    "bitwise operator example",
    "Coding Best Practices",
    "Sahil Rana",
    "JS Techniques",
    "Web Development",
    "Programming Patterns",
  ]
---

# Where the hell are bitwise operators used ?

When I started learning programming i got to know about bitwise operators. I knew about the binary operations and all but always used to wonder where the can be used ? And learning something without understanding the usecases it's difficult to learn. I couldn't find an usecase then, but I know one now so I am writing this.

## Fundamentals

Let me show you how bitwise operators works;

### Bitwise AND (&)

> Definition : [The bitwise AND (&) operator returns a number or BigInt whose binary representation has a 1 in each bit position for which the corresponding bits of both operands are 1](<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND#:~:text=The%20bitwise%20AND%20(%26)%20operator%20returns%20a%20number%20or%20BigInt%20whose%20binary%20representation%20has%20a%201%20in%20each%20bit%20position%20for%20which%20the%20corresponding%20bits%20of%20both%20operands%20are%201.>)

> To keep it simple it is like && operator. For Example (`true && true -> true`) but (`true && false -> false`)

```
# Bitwise AND (&) Example


a ------> 0 0 1 0 0 1 1 1
b ------> 0 1 1 0 1 0 0 1
-------------------------
a & b --> 0 0 1 0 0 0 0 1

```

### Bitwise OR (|)

> Definition : [The bitwise OR (|) operator returns a number or BigInt whose binary representation has a 1 in each bit position for which the corresponding bits of either or both operands are 1](<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_OR#:~:text=The%20bitwise%20OR%20(%7C)%20operator%20returns%20a%20number%20or%20BigInt%20whose%20binary%20representation%20has%20a%201%20in%20each%20bit%20position%20for%20which%20the%20corresponding%20bits%20of%20either%20or%20both%20operands%20are%201.>)

> To keep it simple it is like || operator. For Example (`true || true -> true`) but (`true || false -> true`)

```
# Bitwise OR (|) Example


a ------> 0 0 1 0 0 1 1 1
b ------> 0 1 1 0 1 0 0 1
-------------------------
a | b --> 0 1 1 0 1 1 1 1

```

### Bitwise XOR (^)

> Definition : [The bitwise XOR (^) operator returns a number or BigInt whose binary representation has a 1 in each bit position for which the corresponding bits of either but not both operands are 1.](<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR#:~:text=The%20bitwise%20XOR%20(%5E)%20operator%20returns%20a%20number%20or%20BigInt%20whose%20binary%20representation%20has%20a%201%20in%20each%20bit%20position%20for%20which%20the%20corresponding%20bits%20of%20either%20but%20not%20both%20operands%20are%201.>)

> To keep it simple it only returns true only when one operand is 1 and other is 0 otherwise it returns false.

```
# Bitwise XOR (^) Example


a ------> 0 0 1 0 0 1 1 1
b ------> 0 1 1 0 1 0 0 1
-------------------------
a ^ b --> 0 1 0 0 1 1 1 0

```

### Bitwise NOT (~)

> Definition : [The bitwise NOT (~) operator returns a number or BigInt whose binary representation has a 1 in each bit position for which the corresponding bit of the operand is 0, and a 0 otherwise.](<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_NOT#:~:text=The%20bitwise%20NOT%20(~)%20operator%20returns%20a%20number%20or%20BigInt%20whose%20binary%20representation%20has%20a%201%20in%20each%20bit%20position%20for%20which%20the%20corresponding%20bit%20of%20the%20operand%20is%200%2C%20and%20a%200%20otherwise.>)

> To keep it simple it works like `!` operator. For Example `!true => false` `~false => true`

```
# Bitwise XOR (^) Example


a ------> 0 0 1 0 0 1 1 1
~a -----> 1 1 0 1 1 0 0 0
-------------------------

b ------> 0 1 1 0 1 0 0 1
~b -----> 1 0 0 1 0 1 1 0
```

## Usecase

Let's say you are creating an User access controlled system. For that you'll store permissions for each user (Or User groups).

And we'll assume there are four types of permissions i.e. Create Read Update Delete (CRUD) for a resource.

Wherever your data is stored the most readable data format may look like

```json
{
  "CREATE": false,
  "READ": true,
  "UPDATE": true,
  "DELETE": false
}
```

considering each ASCII character takes 1 byte minified version of this object will take 57 bytes

```
# minified version
{"CREATE":false,"READ":true,"UPDATE":true,"DELETE":false}
```

But if we represent these permissions using binary flags(Bitmask).

```
| Permission | Position |
| ---------- | -------- |
| CREATE     | 0        |
| READ       | 1        |
| UPDATE     | 2        |
| DELETE     | 3        |


DELETE UPDATE READ CREATE
  0      1     1     0

```
