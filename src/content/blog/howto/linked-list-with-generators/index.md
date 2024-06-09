---
author: "Sahil Singh Rana"
image:
  url: "./titleImage.webp"
  alt: "linked-list-with-generators"
pubDate: 2024-06-06
title: Linked List with Javascript Generators and Iterators
description: "Learned how to use Javascript generators in Linked Lists."
slug: linked-list-with-generators
tags:
  [
    "howTo",
    "javascript",
    "strings",
    "linked",
    "list",
    "generators",
    "iterators",
    "js",
    "Sahil",
    "Rana",
  ]
---

# Enhancing Linked Lists with JavaScript Generators

In this post, we'll explore the integration of JavaScript generators with linked lists, enhancing their functionality and utility.

## Understanding Linked Lists

Let's start with the basics. Linked lists are abstract data structures, comprising a sequence of elements where each element points to the next one. They're like a chain, with each link connecting to the next.

**Utility:** Linked lists have numerous applications, ranging from building basic structures like stacks and queues to supporting associative arrays..

**Variants:** Depending on your needs, you can implement different variants of Linked Lists like singly linked lists, doubly linked lists, or circular linked lists.

## Understanding Generators and Iterators

Generators and Iterators are like magic tools in JavaScript, simplifying how you handle iterable data structures.

Generators are special functions in JavaScript that enable pausing and resuming execution, allowing for the creation of iterable sequences with custom iteration behavior. Iterators, on the other hand, define how you traverse through these sequences.

**Creating a Generator:** Generators use the `function*` syntax and the `yield` keyword to emit values one at a time. This helps with lazy evaluation and saves memory when dealing with large datasets.

## Linked List Implementation

> I am implementing only `append` method so that the context of this post does not gets shifted.

```javascript
class Node {
  constructor(data) {
    this.data = data; // Data stored in the node
    this.next = null; // Pointer to the next node, initially null
  }
}

class LinkedList {
  constructor() {
    this.head = null; // Reference to the first node, initially null (empty list)
  }

  // Append a new node with data to the end of the list
  append(data) {
    const newNode = new Node(data); // Create a new node with the provided data
    if (this.head) {
      // If the list is not empty
      let currentNode = this.head; // Start from the head
      while (currentNode.next) {
        // Traverse the list until the last node
        currentNode = currentNode.next;
      }
      currentNode.next = newNode; // Set the next of the last node to the new node
    } else {
      // If the list is empty
      this.head = newNode; // Set the new node as the head
    }
  }

  // Prepend a new node with data to the beginning of the list
  prepend(data) {
    // Prepend Implementation...
  }

  // Remove a node with specified data from the list
  remove(data) {
    // Remove Node implementation...
  }

  // Find and return the first node with specified data from the list
  find(data) {
    // Find implementation...
  }
}
```

## Add generator to linked list

We'll define a generator function called `entries()` within the LinkedList `class`. This generator will iterate over the data in the list and yield tha data within the node for every iteration.

```javascript
class LinkedList {
  // ......
  // LinkedList Implementation
  // ......

  // Generator function to iterate over the data in the list
  *entries() {
    if (!this.head) return; // If the list is empty, return nothing

    let currentNode = this.head; // Start from the head
    while (currentNode) {
      // While there are nodes in the list
      yield currentNode.data; // Yield the data of the current node
      currentNode = currentNode.next; // Move to the next node
    }
  }
}
```

## Usage

Let's see how we can use our `entries()` generator to output the data stored in our linked list:

### Append data to the list

```javascript
const linkedList = new LinkedList();

// Append some data to the list
linkedList.append("L");
linkedList.append("I");
linkedList.append("N");
linkedList.append("K");
```

### Convert linked list to array

```javascript
// Convert linked list to array
const arrayFromLinkedList = Array.from(linkedList.entries());
console.log(arrayFromLinkedList); // [ 'L', 'I', 'N', 'K' ]
```

### Loop over linked list using for..of loop

```javascript
// Loop over linked list using for..of loop
for (const val of linkedList.entries()) {
  console.log(val); // L, I, N, K
}
```

### Get value one by one from the generator

```javascript
// Get value one by one from the generator
const gen = linkedList.entries();

console.log(gen.next().value); // "L"
console.log(gen.next().value); // "I"
console.log(gen.next().value); // "N"
console.log(gen.next().value); // "K"
```
