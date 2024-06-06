---
author: "Sahil Singh Rana"
image:
  url: "https://i.giphy.com/ZoCr1L2HWCBTEJRuDY.webp"
  alt: "linked-list-with-generators"
pubDate: 2024-06-06
title: Linked List with Javascript Generators and Iterators
description: "Learned how to use Javascript generators in Linked Lists."
slug: linked-list-with-generators
tags: ["howTo", "javascript", "strings", "linked", "list", "generators", "iterators"]
---

# Combining the power of JS generators with Linked lists.

In this post, we'll explore the integration of JavaScript generators with linked lists, enhancing their functionality and utility.

## What are Linked Lists?

- **Definition:** Linked lists are a fundamental data structure consisting of a sequence of elements, where each element points to the next one in the sequence.
- **Usage:** They are commonly used in scenarios where dynamic memory allocation is required, such as implementing stacks, queues, and associative arrays.
- **Types:** Linked lists come in various types, including singly linked lists, doubly linked lists, and circular linked lists, each offering unique advantages depending on the use case.

## What are Generators and Iterators?

- **Definition:** Generators are functions in JavaScript that enable pausing and resuming execution, allowing for the creation of iterables with a custom iteration behavior. Iterators are objects that define a sequence and can be iterated upon using loops or other constructs.
- **ES6 Introduction:** ECMAScript 6 (ES6) introduced generators and iterators as part of its enhanced iteration capabilities, providing a cleaner and more expressive way to work with iterable data structures.
- **How to Create a Generator:** Generators are defined using function* syntax, and they use the yield keyword to yield values one at a time, facilitating lazy evaluation and efficient memory usage.

## Linked List Implementation

- I am implementing only append function so that focus of this post does not gets shifted.

```javascript
class Node {
    constructor(data) {
        this.data = data;  // Data stored in the node
        this.next = null;  // Pointer to the next node, initially null
    }
}

class LinkedList {
    constructor() {
        this.head = null;  // Reference to the first node, initially null (empty list)
    }
    
    // Append a new node with data to the end of the list
    append(data) {
        const newNode = new Node(data);  // Create a new node with the provided data
        if(this.head) {  // If the list is not empty
            let currentNode = this.head;  // Start from the head
            while(currentNode.next) {  // Traverse the list until the last node
                currentNode = currentNode.next;
            }
            currentNode.next = newNode;  // Set the next of the last node to the new node
        } else {  // If the list is empty
            this.head = newNode;  // Set the new node as the head
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

We'll define a generator function called entries() within the LinkedList class. This generator will iterate over the data in the list and yield tha data within the node for every iteration.

```javascript
 class LinkedList {
    // ...... 
    // LinkedList Implementation
    // ......

    // Generator function to iterate over the data in the list
    *entries() {
        if(!this.head) return;  // If the list is empty, return nothing
        
        let currentNode = this.head;  // Start from the head
        while(currentNode) {  // While there are nodes in the list
            yield currentNode.data;  // Yield the data of the current node
            currentNode = currentNode.next;  // Move to the next node
        }
    }
 }
```


## Usage

Let's see how we can use our entries() generator to output the data stored in our linked list:

```javascript

const linkedList = new LinkedList();

// Append some data to the list
linkedList.append("L");
linkedList.append("I");
linkedList.append("N");
linkedList.append("K");


// ------------------------------------
// Convert linked list to array
const arrayFromLinkedList = Array.from(linkedList.entries());  
console.log(arrayFromLinkedList) // [ 'L', 'I', 'N', 'K' ]


// ------------------------------------
// Loop over linked list using for..of loop
for (const val of linkedList.entries()) {
  console.log(val) // L, I, N, K
}

// ------------------------------------
// Get value one by one from the generator
const gen = linkedList.entries();

console.log(gen.next().value); // "L"
console.log(gen.next().value); // "I"
console.log(gen.next().value); // "N"
console.log(gen.next().value); // "K"


```
