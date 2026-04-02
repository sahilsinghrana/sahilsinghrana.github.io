---
author: "Sahil Rana"
image:
  url: "./lillies.webp"
  alt: "Dependency Injection"
pubDate: 2026-04-01
title: "Injecting dependencies in js."
description: "Be ready for changes."
slug: injecting-dependents-dynamically
featured: true
sortOrder: 4
tags:
  [
    "JavaScript",
    "Dependency Injection",
    "Design Patterns",
    "Clean Code",
    "Refactoring",
    "Web Development",
    "Programming Patterns",
  ]
---

## Dependency Injection with a small example in JS

> Definition : In software engineering, dependency injection is a programming technique in which an object or function receives other objects or functions that it requires, as opposed to creating them internally. Dependency injection aims to separate the concerns of constructing objects and using them, leading to loosely coupled programs.The pattern ensures that an object or function that wants to use a given service should not have to know how to construct those services. Instead, the receiving "client" (object or function) is provided with its dependencies by external code (an "injector"), which it is not aware of. Dependency injection makes implicit dependencies explicit and helps solve the following problems:
> [Wikipedia : ref](https://en.wikipedia.org/wiki/Dependency_injection)

### Eliminate Hard Coded dependencies

What if while building an API for a To Do application we are using MongoDB database and using mongoose as ORM for fetching data and our API's look like this.

```js
const getTodoById = async (req, res) => {
  try {
    // Using mongoose Model to fetch
    const todo = await TodoModel.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    res.status(200).json(todo);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

router.get("/:id", getTodoById);
```

Now the client or the Manager or the team (Whomsoever it may concern) Asks to migrate to Postgres using prisma or asks to move to another ORM tool.
The only way to do that would be to update the code by going to each controller wherever the model is used.

### The Pattern and the Solution.

**_Dependency Injection_** can solve this by adding an abstraction layer.

We will inject the Dependency at runtime instead of tightly coupling them to the last layer (ORM).

We will create our controller first.

```js
// Controller

class TodoController {
  constructor(todoRepository) {
    this.todoRepository = todoRepository;
  }

  // Using arrow function so that we can use 'this'
  getTodoById = async (req, res) => {
    try {
      const todo = await this.todoRepository.getById(req.params.id);

      if (!todo) {
        return res.status(404).json({ message: "Todo not found" });
      }

      res.status(200).json(todo);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };
}
```

We are going to introduce Repository pattern here. The name is intimidating but the implementation is simple.
It is a layer where we will write all the actual methods which handles the code for fetching data from the DB.

```js
// Repository

class TodoMongoRepository {
  getById = (id) => {
    return TodoModel.findById(id);
  };
}
```

Now we will inject the repository to our controller and use it.

```js
const todoMongoRepository = new TodoMongoRepository();

const todoController = new TodoController(todoMongoRepository);

router.get("/:id", todoController.getTodoById);
```

Now if we need to change the db we will create a new repository.

```js
// Repository

class TodoPostgresRepository {
  async getById = async (id) => {
      return prisma.todo.findUnique({
      where: {
        id: id,
      },
    });
  };
}


// and use it like this

const todoPostgresRepository = new TodoPostgresRepository();

const todoController = new TodoController(todoPostgresRepository);

router.get("/:id", todoController.getTodoById);


```

here our controller remains as it is.
Also if some business logic was there it also stays intact.
