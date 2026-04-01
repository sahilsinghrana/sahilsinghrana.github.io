---
author: "Sahil Rana"
image:
  url: "./full-moon-wolf.gif"
  alt: "The Strategy Pattern: Replacing if/else with lookup tables"
pubDate: 2026-04-01
title: "No More Ifs"
description: "The strategy Pattern."
slug: no-more-ifs
featured: true
tags:
  [
    "JavaScript",
    "Strategy Pattern",
    "Design Patterns",
    "Clean Code",
    "Refactoring",
    "Web Development",
    "Programming Patterns",
  ]
---

# The Stragtegy Pattern

When stringed more than three `if/else` or relying on giant `switch` statements to handle different variations of a task, the code gets bloated. And we violate the **Open/Closed Principle** (OCP).
Every time a new condition appears, we have to modify existing, working code.

The **Strategy Pattern** fixes this by decoupling the algorithm from its execution.

This is the JavaScript way. Traditional OOP languages use interfaces/abstract classes.

## Definition

[Wikipedia : ref](https://en.wikipedia.org/wiki/Strategy_pattern)

> Definition : In computer programming, the strategy pattern (also known as the policy pattern) is a behavioral software design pattern that enables selecting an algorithm at runtime. Instead of implementing a single algorithm directly, code receives runtime instructions as to which in a family of algorithms to use.

## Let's Eliminate Ifs

Let's say you are building a permission checker and need to check if the particular role has a specific permission.

If you hardcode these rules into a single function using conditionals, adding a new role (like MANAGER) requires you to open the core logic and add another `else if`.
This makes the function infinitely expanding and hardens the readability.

### One of the simple ways

```js
function canAccessFeature(role, feature) {
  if (role === "ADMIN") {
    return true;
  }

  if (role === "CUSTOMER") {
    const customerAllowed = ["DASHBOARD"];
    return customerAllowed.includes(feature);
  }

  if (role === "TECHNICIAN") {
    const technicianAllowed = ["DASHBOARD", "MAINTENANCE_LOGS"];
    return technicianAllowed.includes(feature);
  }

  throw new Error(`Access Denied: Unknown role [${role}]`);
}

// console.log(canAccessFeature("CUSTOMER", "DASHBOARD")); // true
// console.log(canAccessFeature("CUSTOMER", "EXPORT"));    // false
```

> Every new role = another if.

## The Code fix

In JavaScript, we don't need heavy class-based architectures to implement this. We use an object literal to map types directly to their respective functions.

### Defining the Strategies

First, separate the algorithms into an object. Each key is the condition, and each value is the logic.

```js
// PermissionStrategies.js
// The Strategies
const PermissionStrategies = {
  ADMIN: () => true,
  CUSTOMER: (feature) => {
    return ["DASHBOARD", "PROFILE"].includes(feature);
  },
  TECHNICIAN: (feature) => {
    return ["DASHBOARD", "MAINTENANCE_LOGS", "REPAIR_TOOLS"].includes(feature);
  },
};
```

---

### The Context (Execution)

Next, write a single function that acts as the context. It takes the input, looks up the correct strategy, and executes it.

```js
// permissionManager.js
function canAccess(role, feature) {
  const rulebook = PermissionStrategies[role];
  if (!rulebook) return false; // fail safe

  return rulebook(feature);
}
```

---

#### Executing the Code

When you call the context, it seamlessly routes the data to the correct algorithm.

```ts
const user = { role: "CUSTOMER" };

const hasLogsAccess = canAccess(user.role, "LOGS");

if (hasLogsAccess) {
  return getLogs();
}
```

The `switch` statements and nested conditionals are technical debt when dealing with varied business logic.
The Strategy pattern implemented here boiled it down to using an object as a lookup table for functions.

## Making it cleaner (or Advanced or maybe complex)

Using Constant mapping to ensure there are no typos.

```js
const ROLES = Object.freeze({
  ADMIN: "ADMIN",
  CUSTOMER: "CUSTOMER",
  TECHNICIAN: "TECHNICIAN",
});

const FEATURES = Object.freeze({
  DASHBOARD: "DASHBOARD",
  EXPORT: "EXPORT",
  MAINTENANCE_LOGS: "MAINTENANCE_LOGS",
});

const CUSTOMER_FEATURES = [FEATURES.DASHBOARD];

const TECHNICIAN_FEATURES = [FEATURES.DASHBOARD, FEATURES.MAINTENANCE_LOGS];
```

##### Why do this ?

- TYPOS! will not fail silently.
- IntelliSense & Autocomplete
- If you decide to change the role name from "ADMIN" to "SUPER_USER", you only change the value in one place.
- A new developer joining the project can look at your FEATURES map and immediately see the features that the app supports without looking through the whole UI code.

Redefining our strategies using the constant maps

```js
const PermissionStrategies = {
  [ROLES.ADMIN]: () => true,
  [ROLES.CUSTOMER]: (feature) => CUSTOMER_FEATURES.includes(feature),
  [ROLES.TECHNICIAN]: (feature) => TECHNICIAN_FEATURES.includes(feature),
};
```

adding factory for strategy selection

```js
const PermissionFactory = {
  canAccess(role, feature) {
    const strategy = PermissionStrategies[role];

    if (!strategy) {
      console.warn(
        `Security Warning: Unknown role [${role}] attempted access.`,
      );
      return false;
    }

    return strategy(feature);
  },
};
```

Using the factory

```js
const user = { role: ROLES.CUSTOMER };

if (PermissionFactory.canAccess(user.role, FEATURES.DASHBOARD)) {
  console.log("Access Granted");
}
```

Without a Factory, the user object would have to know exactly which strategy to pull out of the PermissionStrategies object.
The calling code would look like this:

```js
const canDo = PermissionStrategies[user.role](FEATURES.DASHBOARD);
```

The Problem: What if the user.role is missing? What if the user.role is "SUPER_ADMIN" but that's not in your strategy map? The code will crash.
The Factory (in our PermissionFactory.canAccess method) provides a Safe Interface.

Also if you decide that all permission checks should also check if the system is in "Maintenance Mode," you only change it in one place.
Without Factory: You have to find every if statement and add the maintenance check.
With Factory: You update the canAccess method once.
