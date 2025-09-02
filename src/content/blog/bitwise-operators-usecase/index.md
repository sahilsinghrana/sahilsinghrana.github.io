---
author: "Sahil Rana"
image:
  url: "./titleImage.webp"
  alt: "Bitwise Operators: With an usecase (Bitmasking)"
pubDate: 2025-08-16
title: "Bitwise Operators: With an usecase (Bitmasking)"
description: "Where the hell are bitwise operators used?"
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
    "Bitmasking",
    "Bit Mask",
  ]
---

# Where the hell are bitwise operators used ?

When I first began learning programming, I encountered bitwise operators. While I understood the fundamentals of binary operations, I often wondered where these operators were actually applied. Learning a concept without understanding its real world use cases makes it much harder to master. At that time, I couldn't find a practical example, but now that I have one, I am writing this down.

## Fundamentals

Let me show you how bitwise operators work:

### Bitwise AND (&)

> Definition : [The bitwise AND (&) operator returns a number or BigInt whose binary representation has a 1 in each bit position for which the corresponding bits of both operands are 1](<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND#:~:text=The%20bitwise%20AND%20(%26)%20operator%20returns%20a%20number%20or%20BigInt%20whose%20binary%20representation%20has%20a%201%20in%20each%20bit%20position%20for%20which%20the%20corresponding%20bits%20of%20both%20operands%20are%201.>)

> To keep it simple, it works like the && operator. For example: (`true && true → true`) but (`true && false → false`).

```
# Bitwise AND (&) Example


a ------> 0 0 1 0 0 1 1 1
b ------> 0 1 1 0 1 0 0 1
-------------------------
a & b --> 0 0 1 0 0 0 0 1

```

### Bitwise OR (|)

> Definition : [The bitwise OR (|) operator returns a number or BigInt whose binary representation has a 1 in each bit position for which the corresponding bits of either or both operands are 1](<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_OR#:~:text=The%20bitwise%20OR%20(%7C)%20operator%20returns%20a%20number%20or%20BigInt%20whose%20binary%20representation%20has%20a%201%20in%20each%20bit%20position%20for%20which%20the%20corresponding%20bits%20of%20either%20or%20both%20operands%20are%201.>)

> To keep it simple, it works like the || operator. For example: (`true || true → true`) but (`true || false → true`).

```
# Bitwise OR (|) Example


a ------> 0 0 1 0 0 1 1 1
b ------> 0 1 1 0 1 0 0 1
-------------------------
a | b --> 0 1 1 0 1 1 1 1

```

### Bitwise XOR (^)

> Definition : [The bitwise XOR (^) operator returns a number or BigInt whose binary representation has a 1 in each bit position for which the corresponding bits of either but not both operands are 1.](<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR#:~:text=The%20bitwise%20XOR%20(%5E)%20operator%20returns%20a%20number%20or%20BigInt%20whose%20binary%20representation%20has%20a%201%20in%20each%20bit%20position%20for%20which%20the%20corresponding%20bits%20of%20either%20but%20not%20both%20operands%20are%201.>)

> To keep it simple, it returns true only when one operand is `1` and the other is `0`; otherwise, it returns false.

```
# Bitwise XOR (^) Example


a ------> 0 0 1 0 0 1 1 1
b ------> 0 1 1 0 1 0 0 1
-------------------------
a ^ b --> 0 1 0 0 1 1 1 0

```

### Bitwise NOT (~)

> Definition : [The bitwise NOT (~) operator returns a number or BigInt whose binary representation has a 1 in each bit position for which the corresponding bit of the operand is 0, and a 0 otherwise.](<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_NOT#:~:text=The%20bitwise%20NOT%20(~)%20operator%20returns%20a%20number%20or%20BigInt%20whose%20binary%20representation%20has%20a%201%20in%20each%20bit%20position%20for%20which%20the%20corresponding%20bit%20of%20the%20operand%20is%200%2C%20and%20a%200%20otherwise.>)

> To keep it simple, it works like the `!` operator. For example: `!true → false`, `!false → true`. (This is an analogy. Logical not and bitwise not work very differently)

```
# Bitwise XOR (^) Example


a ------> 0 0 1 0 0 1 1 1
~a -----> 1 1 0 1 1 0 0 0
-------------------------

b ------> 0 1 1 0 1 0 0 1
~b -----> 1 0 0 1 0 1 1 0
```


##### Note :- I'll be using assignment shorthands along with the bitwise operators.
```js
let currentPermissions = 0b0100;
const newPermission = 0b0001;

currentPermissions |= newPermission
// is Same as
// currentPermissions = currentPermissions | newPermission
```

## Usecase
Let's say you are building a user access control system. For this, you'll need to store permissions for each user (or user group).

Suppose there are four types of permissions for a resource: Create, Read, Update, and Delete (CRUD).

In a human-readable format, your stored data might look like this:

```json
{
  "CREATE": false,
  "READ": true,
  "UPDATE": true,
  "DELETE": false
}
```

Considering each ASCII character takes around 1 byte, the minified version of this object will take more than `50 bytes`.

```
# minified version
{"CREATE":false,"READ":true,"UPDATE":true,"DELETE":false}
```

But if we represent these permissions using binary flags (a bitmask)…

You only need 1 bit per permission:

- CREATE → `0`
- READ → `1`
- UPDATE → `1`
- DELETE → `0`

So your bitmask becomes `0110` (binary) = `6` (decimal). This takes **1 byte**.

Here, each flag takes one bit, so all the permissions combined (0110) use four bits and still fit within a single byte.

That's more than a 98% reduction.

Even if stored as a string ("0110"), it takes 4 bytes, which is still a reduction of 50(approx.) - 4 = 53 bytes.

You can store the bitmask as an unsigned integer (uint8) in the DB, which can hold up to 8 flags in a single byte.

## The Code

The examples below are written with JavaScript in mind.
When you log the permissions, they will be displayed in base 10 (i.e. Decimal Numbers).
To log the binary representation, you can use the number.toString(2) method.

#### Adding a permission

To add a permission we can use the Bitwise OR (`|`) Operator:

```ts
const READ_PERMISSION = 0b0010;
const DELETE_PERMISSION = 0b1000;
let userPermissions = 0b0000;

userPermissions = userPermissions | DELETE_PERMISSION;

// userPermissions  ------> 0 0 0 0
// DELETE_PERMISSION -----> 1 0 0 0
// ---------------------------------
// userPms | DeletePms ---> 1 0 0 0

// New Permissions if represented in binary is  1 0 0 0 => The value in decimal will be 8

console.log(userPermissions); // 8
console.log(userPermissions.toString(2)); // 1000

// shorthand
userPermissions |= READ_PERMISSION;
console.log(userPermissions); // 10
console.log(userPermissions.toString(2)); // 1010
```

---

#### Checking if a permission exists

To check if a permission is already set, we use the Bitwise AND (`&`)
Operator.
If the result is not zero, it means that permission exists.

```ts
// Now our user permissions are means it has 
let userPermissions = 0b1010;
const READ_PERMISSION = 0b0010;

const hasReadPermission = userPermissions & READ_PERMISSION;


// userPermissions  ------> 1 0 1 0
// READ_PERMISSION  ------> 0 0 1 0
// ---------------------------------
// userPms & readPm ------> 0 0 1 0

// The result if represented in binary is  0 0 1 0 => The value in decimal will be 2. 
// As it returns the read permission. we will consider it as the user do have the rights to READ.

console.log(hasReadPermission) // 2

if (hasReadPermission) {
  console.log("User has READ permission"); // This will get logged in the console
} else {
  console.log("User does NOT have READ permission");
}

// Now Let's check for UPDATE Permission;
const UPDATE_PERMISSION = 0b0100;

const hasUpdatePermission = userPermissions & UPDATE_PERMISSION;
// userPermissions  ------> 1 0 1 0
// UPDATE_PERMISSION -----> 0 1 0 0
// ---------------------------------
// userPms & updatePm ----> 0 0 0 0

// The result if represented in binary is  0 0 0 0 => The value in decimal will be 0. 
// As it doesn't returns 0. we will consider it as the user do not have the rights to UPDATE.

if (hasReadPermission) {
  console.log("User has UPDATE permission"); 
} else {
  console.log("User does NOT have UPDATE permission"); // This will get logged in the console
}

```

---

#### Removing a permission

To remove a permission, we combine AND (`&`) with Bitwise NOT (`~`).
This clears the specific bit, while keeping others unchanged.

```ts
// Initially, user has permissions as binary 1 0 1 0 (decimal 10)
let userPermissions = 0b1010;

const READ_PERMISSION = 0b0010;

// Now we want to REMOVE the READ permission from userPermissions.
// For this, we will use bitwise AND with the NEGATION of READ_PERMISSION.

userPermissions &= ~READ_PERMISSION; 

// userPermissions   ------> 1 0 1 0
// READ_PERMISSION   ------> 0 0 1 0
// ---------------------------------
// ~READ_PERMISSION  ------> 1 1 0 1   (bitwise NOT flips every bit)
// ---------------------------------
// userPms & ~readPm  -----> 1 0 0 0

// The result if represented in binary is 1 0 0 0 => The value in decimal will be 8. 
// This means the READ permission is now REMOVED.

console.log(userPermissions); // 8
console.log(userPermissions.toString(2)); // 1000
```

---

#### Toggling a permission

The Bitwise XOR (`^`) Operator flips a bit: If the bit was set, it
will be cleared. If the bit was clear, it will be set

```ts
// user currently has permissions binary 1 0 0 0 (decimal 8)
let userPermissions = 0b1000;
const READ_PERMISSION = 0b0010;

// Toggle READ permission using XOR (^).
// XOR will flip the READ bit: if it was 0 -> becomes 1 (adds permission).
// if it was 1 -> becomes 0 (removes permission).

// 1st toggle -> should ADD READ (because READ bit is currently 0)
userPermissions ^= READ_PERMISSION;

// Explanation:
// userPermissions   ------> 1 0 0 0
// READ_PERMISSION   ------> 0 0 1 0
// ---------------------------------
// userPms ^ readPm  ------> 1 0 1 0

// Result in binary: 1 0 1 0 => decimal 10 (READ added)
console.log(userPermissions);           // 10
console.log(userPermissions.toString(2)); // "1010"

// 2nd toggle -> will REMOVE READ (flip it back)
userPermissions ^= READ_PERMISSION;

// Explanation:
// userPermissions   ------> 1 0 1 0
// READ_PERMISSION   ------> 0 0 1 0
// ---------------------------------
// userPms ^ readPm   ------> 1 0 0 0

// Result in binary: 1 0 0 0 => decimal 8 (READ removed)
console.log(userPermissions);           // 8
console.log(userPermissions.toString(2)); // "1000"

```

---

#### Listing all permissions from a value

You can decode which permissions are set by checking each flag:

```ts
const PERMISSIONS = {
  CREATE: 0b0001,
  READ:   0b0100,
  UPDATE: 0b0100,
  DELETE: 0b1000,
};

for (const [name, value] of Object.entries(PERMISSIONS)) {
  const hasPermission = (userPermissions & value) !== 0;
  console.log(`${name}: ${hasPermission}`);
}
```

## Conclusion

The goal of writing all this was to make the concept of bitmasking and bitwise operators simpler and easier to understand. When I first learned about them, it was difficult to grasp without a real use case.

> Disclaimer: I am not a deep expert. I'm sharing what I've learned through exploration. If you're new to this, I hope this explanation helps you get a clearer picture.
