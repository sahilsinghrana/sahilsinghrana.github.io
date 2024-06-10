---
image:
  url: "./titleImage.webp"
  alt: "sunfloweerr"
title: Improve git command performance.
description: "Clear git cache to improve performance"
tags: ["howTo", "git", "performance", "cache", "snippet"]
---

# Improving performance of git commands
The ```git update-index --test-untracked-cache``` command is used to test the untracked cache feature in Git. This feature is designed to improve the performance of Git commands, particularly git status, by caching information about untracked files in the repository.

## Command

```sh
$ git update-index --test-untracked-cache
```
> When you run ```git update-index --test-untracked-cache```, Git checks if your repository can benefit from using the untracked cache feature. If the output ends with "OK," it indicates that your repository is compatible with this feature and enabling it may improve the performance of git status and related commands.

If the output ends with OK, then the following may also improve performance of git status:

```sh
$ git config core.untrackedCache true
```
> This command sets a configuration option in Git (core.untrackedCache) to enable the untracked cache. Once enabled, Git will use this cache to speed up operations that involve checking the status of untracked files in your repository.

Enabling the untracked cache can be particularly beneficial in repositories with a large number of untracked files or directories, as it reduces the overhead of repeatedly scanning the working directory for changes.

#### References 
1. https://chromium.googlesource.com/chromium/src/+/main/docs/windows_build_instructions.md#improving-performance-of-git-commands
